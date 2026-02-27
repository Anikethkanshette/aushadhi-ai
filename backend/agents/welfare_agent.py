import os
from typing import Dict, Any

class WelfareAgent:
    def __init__(self):
        self.name = "WelfareAgent"
        # Dummy set of eligible ABHA IDs for PMJAY
        self.eligible_abha = {
            "1234-5678-9012", 
            "2345-6789-0123", 
            "3456-7890-1234",
            "2002-0002-0002", 
            "2004-0004-0004", 
            "2006-0006-0006"
        }
        
    def check_eligibility(self, abha_id: str, order_amount: float) -> Dict[str, Any]:
        """Checks if a patient is eligible for PMJAY welfare discounts on their order."""
        if not abha_id:
            return {
                "status": "success",
                "is_eligible": False,
                "discount_percent": 0.0,
                "discount_amount": 0.0,
                "final_amount": order_amount,
                "message": "No ABHA ID provided."
            }
            
        is_eligible = abha_id in self.eligible_abha
        discount_percent = 0.20 if is_eligible else 0.0
        discount_amount = round(order_amount * discount_percent, 2)
        final_amount = round(order_amount - discount_amount, 2)
        
        if is_eligible:
            msg = f"Patient is eligible for PMJAY. Applied 20% discount (₹{discount_amount} saved)."
        else:
            msg = "Patient is not eligible for PMJAY welfare schemes."
            
        return {
            "status": "success",
            "is_eligible": is_eligible,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "message": msg
        }
