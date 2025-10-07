from autogen_core.tools import FunctionTool
from datetime import datetime
from typing import List, Dict, Any
from routes.mongocl import get_wardrobe, update_item_worn

async def get_wardrobe_items() -> List[Dict[str, Any]]:
    """
    Get all items from the wardrobe database.

    Returns:
        List[Dict[str, Any]]: List of wardrobe items.
    """
    return await get_wardrobe()

async def update_worn_items(item_ids: List[str]) -> bool:
    """
    Update the last_worn date and increment times_worn for the given items.

    Args:
        item_ids (List[str]): List of MongoDB ObjectId strings that the user wore.

    Returns:
        bool: True if all updates were successful.
    """
    try:
        for item_id in item_ids:
            await update_item_worn(item_id)
        return True
    except Exception as e:
        print(f"Error updating worn items: {str(e)}")
        return False


async def mark_items_worn(item_ids: List[str]) -> Dict[str, Any]:
    """
    Async wrapper that marks items as worn.
    
    Args:
        item_ids (List[str]): List of MongoDB ObjectId strings that the user wore.
        
    Returns:
        Dict[str, Any]: Status of the update operation
    """
    success = await update_worn_items(item_ids)
    return {
        "status": "success" if success else "error",
        "updated_items": item_ids if success else []
    }

async def suggest_outfits() -> Dict[str, Any]:
    """
    Get wardrobe data and prepare for outfit suggestions.
    
    Returns:
        Dict[str, Any]: All wardrobe items for outfit suggestions
    """
    items = await get_wardrobe_items()
    return {"wardrobe": items}

MarkAsWornTool = FunctionTool(
    name="MarkAsWorn",
    description="Mark selected wardrobe items as worn today and increment their wear count.",
    func=mark_items_worn
)

WardrobeLook = FunctionTool(
    name="WardrobeLook",
    description="Use this tool to check the user's wardrobe data and suggest outfit combinations based on their clothes, colors, types, and styles.",
    func=suggest_outfits
)