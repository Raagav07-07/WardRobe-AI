import asyncio
from dotenv import load_dotenv

from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.ui import Console
from utils.tools import WardrobeLook, MarkAsWornTool
from prompts_lib.prompts import color_expert_prompt, wardrobe_expert_prompt, coordinator_agent_prompt   
load_dotenv()

model_client = OpenAIChatCompletionClient(model="gemini-2.5-flash")

color_agent = AssistantAgent(
    name="color_expert",
    model_client=model_client,
    system_message=color_expert_prompt)
wardrobe_agent = AssistantAgent(
    name="wardrobe_expert",
    model_client=model_client,
    system_message=wardrobe_expert_prompt,
    tools=[WardrobeLook])
coordinator_agent= AssistantAgent(name="CoordinatorAgent",
    model_client=model_client,
    system_message=coordinator_agent_prompt,tools=[MarkAsWornTool])
user = UserProxyAgent(name="User")
team = SelectorGroupChat(
    [user, color_agent, wardrobe_agent, coordinator_agent],
    model_client=model_client,
    selector_prompt="""Select the next agent to perform the task.

Roles:
{roles}

Current conversation context:
{history}

Instructions:
1. Analyze the conversation context and user request.
2. Choose ONE agent from {participants} to act next.
3. Always have **color_expert** and **wardrobe_expert** perform their tasks first, based on the user’s request.
4. After collecting their responses, send them to **CoordinatorAgent** for the final summary and outfit recommendation.
5. Only select one agent at a time.

""",
    allow_repeated_speaker=True,  
)
async def main():
    await Console(team.run_stream())

if __name__ == "__main__":
    asyncio.run(main())
