import os
from typing import Dict, Any
from database import get_medicine_by_id

class PrescriptionAgent:
    def __init__(self):
        self.name = "PrescriptionAgent"
        
    def validate_prescription(self, medicine_id: str,
                              has_prescription: bool,
                              patient_abha: str) -> Dict[str, Any]:
        """Validates if a specific medicine requires a prescription and if the user provided one."""
        med = get_medicine_by_id(medicine_id)
        if not med:
            return {"status": "error", "message": f"Medicine ID '{medicine_id}' not found.", "can_dispense": False}
            
        is_rx_required = med["prescription_required"]
        if is_rx_required and not has_prescription:
            return {
                "status": "rejected",
                "message": f"Prescription required for {med['name']}. Please upload a valid Rx.",
                "can_dispense": False,
                "medicine_name": med["name"],
                "requires_rx": True
            }
            
        return {
            "status": "approved",
            "message": f"Prescription validation passed for {med['name']}.",
            "can_dispense": True,
            "medicine_name": med["name"],
            "requires_rx": is_rx_required
        }
