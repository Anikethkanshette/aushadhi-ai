from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import load_medicines, search_medicines, get_medicine_by_id, update_medicine_stock

router = APIRouter()


@router.get("/")
async def list_medicines(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    prescription_required: Optional[bool] = Query(None),
):
    medicines = load_medicines()

    if search:
        medicines = search_medicines(search)

    if category:
        medicines = [m for m in medicines if m["category"].lower() == category.lower()]

    if prescription_required is not None:
        medicines = [m for m in medicines if m["prescription_required"] == prescription_required]

    return {"medicines": medicines, "total": len(medicines)}


@router.get("/{medicine_id}")
async def get_medicine(medicine_id: str):
    medicine = get_medicine_by_id(medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@router.patch("/inventory/{medicine_id}")
async def update_inventory(medicine_id: str, quantity: int):
    success = update_medicine_stock(medicine_id, quantity)
    if not success:
        raise HTTPException(status_code=400, detail="Insufficient stock or medicine not found")
    return {"message": "Stock updated successfully"}


@router.get("/search/alternatives/{medicine_name}")
async def get_alternatives(medicine_name: str):
    medicines = load_medicines()
    query_lower = medicine_name.lower()
    found = None
    for med in medicines:
        if query_lower in med["name"].lower() or query_lower in med["generic_name"].lower():
            found = med
            break

    if not found:
        return {"alternatives": []}

    alternatives = [
        m for m in medicines
        if m["category"] == found["category"] and m["id"] != found["id"]
    ][:3]
    return {"alternatives": alternatives}
