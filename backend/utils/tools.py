import os
import json
from autogen_core.tools import FunctionTool
from datetime import datetime
from typing import List, Dict, Any

async def get_wardrobe_data_path():
    path= os.path.join(os.path.dirname(__file__), '..', 'data', 'mock_data.json')
    with open(path, 'r') as file:
        data = json.load(file)
    return data
def update_wardrobe_last_worn(item_ids: List[str], data_path: str = None) -> bool:
    """
    Update the last_worn date and increment times_worn for the given items.

    Args:
        item_ids (List[str]): List of item_id strings that the user wore.
        data_path (str): Path to the JSON file containing wardrobe data.

    Returns:
        bool: True if update successful.
    """
    if not data_path:
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'mock_data.json')

    with open(data_path, 'r', encoding='utf-8') as f:
        wardrobe_data = json.load(f)

    today = datetime.today().strftime('%Y-%m-%d')

    # Update last_worn and times_worn
    for item in wardrobe_data['wardrobe']:
        if item['item_id'] in item_ids:
            item['last_worn'] = today
            item['times_worn'] += 1

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(wardrobe_data, f, indent=2)

    return True


async def mark_items_worn(item_ids: List[str]) -> Dict[str, Any]:
    """
    Async wrapper that marks items as worn.
    """
    update_wardrobe_last_worn(item_ids)
    return {"status": "success", "updated_items": item_ids}

MarkAsWornTool = FunctionTool(
    name="MarkAsWorn",
    description="Mark selected wardrobe items as worn today and increment their wear count.",
    func=mark_items_worn
)
WardrobeLook = FunctionTool(
    name="WardrobeLook",
    description="Use this tool to check the user's wardrobe data and suggest outfit combinations based on their clothes, colors, types, and styles.",
    func=get_wardrobe_data_path,
)