import os
from typing import Dict, Any, List
from database import search_medicines, get_medicine_by_id

class StockCheckAgent:
    def __init__(self):
        self.name = "StockCheckAgent"
        
    def check_inventory(self, query: str) -> Dict[str, Any]:
        """Searches inventory for a medicine query"""
        results = search_medicines(query)
        if not results:
            return {"status": "error", "message": f"No medicines found for '{query}'."}
        
        matches = []
        for med in results[:5]:
            qty = int(med["stock_quantity"])
            matches.append({
                "id": med["id"],
                "name": med["name"],
                "price": med["price"],
                "prescription_required": med["prescription_required"],
                "in_stock": qty > 0,
                "quantity_available": qty
            })
            
        return {"status": "success", "matches": matches}
        
    def check_specific_item(self, medicine_id: str) -> Dict[str, Any]:
        """Checks exact stock for a specific medicine ID"""
        med = get_medicine_by_id(medicine_id)
        if not med:
            return {"status": "error", "message": f"Medicine ID '{medicine_id}' not found."}
            
        qty = int(med["stock_quantity"])
        return {
            "status": "success",
            "medicine": med["name"],
            "price": med["price"],
            "in_stock": qty > 0,
            "quantity_available": qty,
            "min_stock": int(med["min_stock_level"])
        }
