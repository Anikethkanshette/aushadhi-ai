import os
from typing import Dict, Any
import time

class PaymentAgent:
    def __init__(self):
        self.name = "PaymentAgent"
        
    def process_payment(self, patient_id: str, amount: float, method: str = "UPI") -> Dict[str, Any]:
        """Simulates processing a payment with external payment gateways."""
        # Mock payment processing logic
        if amount <= 0:
            return {"status": "error", "message": "Invalid payment amount.", "transaction_id": None}
            
        if method not in ["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING"]:
            return {"status": "error", "message": f"Unsupported payment method: {method}", "transaction_id": None}
            
        # Simulate slight network delay
        time.sleep(0.5)
        
        # Simulate 5% failure rate
        import random
        if random.random() < 0.05:
            return {
                "status": "failed",
                "message": "Payment gateway timeout or card declined.", 
                "transaction_id": f"TXN_{int(time.time())}",
                "success": False
            }
            
        return {
            "status": "success",
            "message": f"Payment of ₹{amount} via {method} successful.",
            "transaction_id": f"TXN_{int(time.time())}",
            "amount": amount,
            "method": method,
            "success": True
        }
        
    def refund_payment(self, transaction_id: str, amount: float) -> Dict[str, Any]:
        """Processes a refund if an order is rolled back."""
        print(f"[{self.name}] Processing refund for TXN {transaction_id} of ₹{amount}")
        return {
            "status": "success",
            "message": f"Refund of ₹{amount} initiated for {transaction_id}.",
            "refund_id": f"REF_{int(time.time())}"
        }
