from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, List
from fastapi import HTTPException

# MongoDB connection string
MONGO_URI = "mongodb://localhost:27017"

# Create a motor client
client = AsyncIOMotorClient(MONGO_URI)
db = client.wardrobe

async def get_wardrobe() -> List[Dict[str, Any]]:
    try:
        collection = db.wardrobe
        items = await collection.find().to_list(length=None)
        # Convert ObjectId to string for JSON serialization
        for item in items:
            item['_id'] = str(item['_id'])
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def add_to_wardrobe(item: Dict[str, Any]) -> str:
    required_fields = ['item_name', 'type', 'color', 'style', 'fit']
    if not all(key in item for key in required_fields):
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required fields. Required: {', '.join(required_fields)}"
        )
    
    try:
        collection = db.wardrobe
        # Add default values
        item.update({
            'last_worn': None,
            'times_worn': 0,
            'created_at': datetime.now()
        })
        result = await collection.insert_one(item)
        return str(result.inserted_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def remove_from_wardrobe(item_id: str) -> bool:
    try:
        collection = db.wardrobe
        result = await collection.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def update_item_worn(item_id: str) -> bool:
    try:
        collection = db.wardrobe
        result = await collection.update_one(
            {"_id": ObjectId(item_id)},
            {
                "$set": {"last_worn": datetime.now()},
                "$inc": {"times_worn": 1}
            }
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
