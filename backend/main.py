import asyncio
from typing import Annotated
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.messages import TextMessage
from autogen_core import CancellationToken
import json
from utils.tools import WardrobeLook, MarkAsWornTool
from prompts_lib.prompts import color_expert_prompt, wardrobe_expert_prompt, coordinator_agent_prompt
from fastapi import HTTPException
from typing import Dict, Any
from routes.mongocl import get_wardrobe, add_to_wardrobe, remove_from_wardrobe, update_item_worn

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}
model_client = OpenAIChatCompletionClient(model="gemini-2.5-flash")

color_agent = AssistantAgent(
    name="color_expert",
    model_client=model_client,
    system_message=color_expert_prompt
)

wardrobe_agent = AssistantAgent(
    name="wardrobe_expert",
    model_client=model_client,
    system_message=wardrobe_expert_prompt,
    tools=[WardrobeLook]
)


async def consult_color_expert(
    color_query: Annotated[str, "The color question or combination to analyze (e.g., 'does blue match brown?')"]
) -> str:
    print(f"  🎨 Calling color_expert with: {color_query}")
    
    try:
        result = await color_agent.on_messages(
            [TextMessage(content=color_query, source="coordinator")],
            cancellation_token=None
        )
        if isinstance(result, list):
            for msg in reversed(result):
                if hasattr(msg, 'content') and msg.content:
                    return str(msg.content)
        elif hasattr(result, 'content'):
            return str(result.content)
        elif hasattr(result, 'result'):
            return str(result.result)
        
        print(f"  🎨 Color expert responded successfully")
        return str(result)
    except Exception as e:
        print(f"  ❌ Color expert error: {str(e)}")
        return f"I apologize, but I'm having trouble analyzing the colors right now. {str(e)}"


async def consult_wardrobe_expert(
    request: Annotated[str, "The wardrobe request (e.g., 'suggest outfit for wedding', 'check wardrobe items')"]
) -> str:
    """Consult the wardrobe expert to check wardrobe items and get outfit suggestions."""
    print(f"  👔 Calling wardrobe_expert with: {request}")
    
    try:
        result = await wardrobe_agent.on_messages(
            [TextMessage(content=request, source="coordinator")],
            cancellation_token=None
        )

        if isinstance(result, list):
            for msg in reversed(result):
                if hasattr(msg, 'content') and msg.content:
                    return str(msg.content)
        elif hasattr(result, 'content'):
            return str(result.content)
        elif hasattr(result, 'result'):
            return str(result.result)
        
        print(f"  👔 Wardrobe expert responded successfully")
        return str(result)
    except Exception as e:
        print(f"  ❌ Wardrobe expert error: {str(e)}")
        return f"I apologize, but I'm having trouble accessing the wardrobe information right now. {str(e)}"


coordinator_prompt_enhanced = coordinator_agent_prompt + """

**Available Tools:**
- consult_color_expert: Use this when user asks about color combinations or color theory
- consult_wardrobe_expert: Use this when user needs outfit suggestions or wants to see wardrobe items
- MarkAsWornTool: Use this to mark items as worn

**Important:** After providing your final response, add "TERMINATE" on a new line.

**Example workflows:**

User: "Does blue match brown?"
1. Call consult_color_expert("does blue match brown?")
2. Synthesize the response in your own words
3. Add TERMINATE

User: "I need an outfit for a wedding"
1. Call consult_wardrobe_expert("suggest outfit for wedding")
2. Optionally call consult_color_expert if color advice needed
3. Synthesize and provide recommendation
4. Add TERMINATE

User: "Hi"
1. Respond directly (no tools needed)
2. Add TERMINATE
"""

coordinator_agent = AssistantAgent(
    name="CoordinatorAgent",
    model_client=model_client,
    system_message=coordinator_prompt_enhanced,
    tools=[consult_color_expert, consult_wardrobe_expert, MarkAsWornTool]
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = id(websocket)
    
    print(f"\n🔌 New connection: {session_id}")
    
    user_input_queue = asyncio.Queue()
    should_wait_for_input = asyncio.Event()
    
    async def _user_input(prompt: str, cancellation_token: CancellationToken | None = None) -> str:       
        if not should_wait_for_input.is_set():
            print(f"⏭️  UserProxy called but not waiting for input")
            return "SKIP_USER_INPUT"
        
        print(f"⏳ Waiting for user input: {prompt[:100]}...")

        await websocket.send_json({
            "type": "agent_question",
            "content": prompt
        })
        
        user_message = await user_input_queue.get()
        print(f"✅ Got user input: {user_message}")
        
        should_wait_for_input.clear()
        return user_message
    
    user_proxy = UserProxyAgent(
        name="User",
        input_func=_user_input
    )

    termination = TextMentionTermination("TERMINATE")
    
    from autogen_agentchat.teams import RoundRobinGroupChat
    
    team = RoundRobinGroupChat(
        [user_proxy, coordinator_agent],
        termination_condition=termination,
    )
    
    sessions[session_id] = {
        "websocket": websocket,
        "team": team,
        "user_input_queue": user_input_queue,
        "should_wait_for_input": should_wait_for_input,
        "conversation_task": None
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f"\n{'='*60}")
            print(f"📨 Received: {data}")
            
            try:
                parsed_data = json.loads(data)
                user_message = parsed_data.get('text', data)
            except json.JSONDecodeError:
                user_message = data
            
            print(f"💬 User: {user_message}")
            
            if sessions[session_id]["conversation_task"] is not None and not sessions[session_id]["conversation_task"].done():
                print("➡️  Feeding to ongoing conversation")
                should_wait_for_input.set()
                user_input_queue.put_nowait(user_message)
            else:
                print("🚀 Starting new conversation")
                
                async def run_conversation():
                    await websocket.send_json({"type": "status", "message": "Processing..."})
                    
                    messages = []
                    last_content = ""
                    
                    try:
                        async for message in team.run_stream(task=user_message):
                            if hasattr(message, 'content') and isinstance(message.content, list):
                                print(f"  🔧 {message.source}: [TOOL_CALL]")
                                await websocket.send_json({
                                    "type": "status",
                                    "message": "Consulting experts..."
                                })
                                continue
                            
                            # Get message content safely
                            if isinstance(message, dict):
                                content = str(message.get('result', ""))
                            elif hasattr(message, 'result'):
                                content = str(message.result)
                            elif hasattr(message, 'content'):
                                content = str(message.content)
                            else:
                                content = ""
                            
                            # Skip sentinel, empty, and user messages
                            if content == "SKIP_USER_INPUT" or not content.strip() or message.source == 'User':
                                continue
                                
                            # Avoid duplicate messages from tool calls
                            if content == last_content:
                                continue
                                
                            last_content = content
                            
                            # Remove TERMINATE
                            content = content.replace("TERMINATE", "").strip()
                            
                            if content and message.source == "CoordinatorAgent":
                                print(f"  💬 {message.source}: {content[:100]}...")
                                messages.append({
                                    "agent": message.source,
                                    "content": content
                                })
                        
                        print(f"✅ Collected {len(messages)} messages")
                        
                        if messages:
                            # Filter out tool responses and send only the final meaningful response
                            final_messages = [m for m in messages if not m["content"].startswith("Unable to")]
                            if final_messages:
                                await websocket.send_json({
                                    "type": "final_response",
                                    "agent": "Tara",
                                    "content": final_messages[-1]["content"]
                                })
                                print(f"📤 Sent to frontend: {final_messages[-1]['content'][:100]}...")
                            else:
                                await websocket.send_json({
                                    "type": "error",
                                    "content": "I'm having trouble processing that request. Could you please try again?"
                                })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "content": "No response generated"
                            })
                        
                    except Exception as e:
                        print(f"❌ Error: {e}")
                        import traceback
                        traceback.print_exc()
                        await websocket.send_json({
                            "type": "error",
                            "content": "Something went wrong"
                        })
                    finally:
                        sessions[session_id]["conversation_task"] = None
                        should_wait_for_input.clear()
                        print(f"{'='*60}\n")
                
                sessions[session_id]["conversation_task"] = asyncio.create_task(run_conversation())
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
    finally:
        if session_id in sessions:
            if sessions[session_id]["conversation_task"]:
                sessions[session_id]["conversation_task"].cancel()
            del sessions[session_id]
        
        try:
            await websocket.close()
        except:
            pass


@app.get("/")
async def root():
    return {"message": "Wardrobe Assistant API is running"}

@app.get('/wardrobe')
async def get_wardrobe_data():
    try:
        data = await get_wardrobe()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/wardrobe/add')
async def add_item(item: Dict[str, Any]):
    try:
        item_id = await add_to_wardrobe(item)
        return {"status": "success", "item_id": item_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/wardrobe/{item_id}')
async def delete_item(item_id: str):
    try:
        result = await remove_from_wardrobe(item_id)
        return {"status": "success", "message": "Item deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put('/wardrobe/{item_id}/worn')
async def mark_item_worn(item_id: str):
    try:
        result = await update_item_worn(item_id)
        return {"status": "success", "message": "Item marked as worn"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)