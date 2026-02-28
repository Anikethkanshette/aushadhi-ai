from fastapi import APIRouter, HTTPException
from typing import List, Optional
from database import load_orders, save_order, get_patient_orders, get_medicine_by_id, update_medicine_stock
from models import OrderCreate
import uuid
from datetime import date, timedelta

from ledger import ledger_db
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.welfare_agent import WelfareAgent
from agents.delivery_agent import DeliveryAgent

rx_agent = PrescriptionAgent()
payment_agent = PaymentAgent()
welfare_agent = WelfareAgent()
delivery_agent = DeliveryAgent()

router = APIRouter()


@router.post("/")
def create_order(order: OrderCreate):
    medicine = get_medicine_by_id(order.medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # 1. Validation via Prescription Agent
    rx_res = rx_agent.validate_prescription(order.medicine_id, order.has_prescription, order.abha_id)
    if rx_res["status"] == "rejected":
        raise HTTPException(status_code=400, detail=rx_res["message"])

    if int(medicine["stock_quantity"]) < order.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {medicine['stock_quantity']} units"
        )
        
    # 2. Calculate Pricing & Welfare
    base_amount = float(medicine["price"]) * order.quantity
    welfare_res = welfare_agent.check_eligibility(order.abha_id, base_amount)
    final_amount = welfare_res.get("data", {}).get("final_amount", base_amount)

    # 3. Create Transaction in Ledger
    tx_id = f"TXN-{str(uuid.uuid4())[:8].upper()}"
    order_id = f"ORD{str(uuid.uuid4())[:6].upper()}"
    
    ledger_db.begin_transaction(tx_id, "CREATE_ORDER", {
        "order_id": order_id, 
        "medicine_id": order.medicine_id,
        "quantity": order.quantity,
        "amount": final_amount
    })

    # Step A: Deduct Stock
    success = update_medicine_stock(order.medicine_id, order.quantity)
    if not success:
        ledger_db.rollback(tx_id)
        raise HTTPException(status_code=500, detail="Failed to update stock (internal error)")
        
    # Register compensating action for stock in case payment fails later
    ledger_db.add_compensating_action(tx_id, update_medicine_stock, order.medicine_id, -order.quantity)

    # Step B: Process Payment
    payment_res = payment_agent.process_payment(order.patient_id, final_amount, "UPI")
    if payment_res.get("status") != "success":
        # Payment failed! ATOMIC ROLLBACK triggers compensating actions (restoring stock)
        ledger_db.rollback(tx_id)
        raise HTTPException(status_code=402, detail=f"Payment failed: {payment_res['message']}. Stock reserved for this order has been rolled back.")

    # All steps succeeded, commit the transaction
    ledger_db.commit(tx_id)

    # Finish saving order details
    today = date.today()
    next_refill = today + timedelta(days=30)
    
    delivery_res = delivery_agent.schedule_delivery(order_id, "100001") # Mock ZIP

    new_order = {
        "order_id": order_id,
        "patient_id": order.patient_id,
        "patient_name": order.patient_name,
        "abha_id": order.abha_id,
        "medicine_id": order.medicine_id,
        "medicine_name": order.medicine_name,
        "quantity": str(order.quantity),
        "dosage_frequency": order.dosage_frequency,
        "purchase_date": str(today),
        "next_refill_date": str(next_refill),
        "total_amount": str(final_amount),
        "status": "completed",
        "tx_id": tx_id
    }

    save_order(new_order)

    return {
        "status": "success",
        "data": {
            "message": "Order placed successfully using Atomic Ledger transaction.",
            "order": new_order,
            "payment": payment_res,
            "welfare": welfare_res,
            "delivery": delivery_res,
            "notifications": simulate_notifications(order.patient_name),
        },
        "message": "Order placed successfully",
        "error_code": None
    }


def simulate_payment(order: dict) -> dict:
    return {
        "status": "success",
        "payment_id": f"PAY-DEMO-{order['order_id']}",
        "amount": order["total_amount"],
        "method": "UPI",
    }


def simulate_notifications(patient_name: str) -> dict:
    return {
        "whatsapp": f"Sent WhatsApp order confirmation to {patient_name}",
        "sms": f"Sent SMS order confirmation to {patient_name}",
        "email": f"Sent Email order confirmation to {patient_name}",
    }


@router.get("/")
async def list_orders(patient_id: Optional[str] = None, abha_id: Optional[str] = None):
    if patient_id or abha_id:
        orders = get_patient_orders(patient_id=patient_id, abha_id=abha_id)
    else:
        orders = load_orders()
    return {"orders": orders, "total": len(orders)}
