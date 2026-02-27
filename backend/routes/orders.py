from fastapi import APIRouter, HTTPException
from typing import List, Optional
from database import load_orders, save_order, get_patient_orders, get_medicine_by_id, update_medicine_stock
from models import OrderCreate
import uuid
from datetime import date, timedelta

router = APIRouter()


@router.post("/")
async def create_order(order: OrderCreate):
    medicine = get_medicine_by_id(order.medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    if medicine["prescription_required"] and not order.has_prescription:
        raise HTTPException(
            status_code=400,
            detail=f"{medicine['name']} requires a valid prescription. Please upload your prescription."
        )

    if medicine["stock_quantity"] < order.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {medicine['stock_quantity']} units"
        )

    success = update_medicine_stock(order.medicine_id, order.quantity)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update stock")

    today = date.today()
    next_refill = today + timedelta(days=30)

    new_order = {
        "order_id": f"ORD{str(uuid.uuid4())[:6].upper()}",
        "patient_id": order.patient_id,
        "patient_name": order.patient_name,
        "abha_id": order.abha_id,
        "medicine_id": order.medicine_id,
        "medicine_name": order.medicine_name,
        "quantity": str(order.quantity),
        "dosage_frequency": order.dosage_frequency,
        "purchase_date": str(today),
        "next_refill_date": str(next_refill),
        "total_amount": str(float(medicine["price"]) * order.quantity),
        "status": "completed",
    }

    save_order(new_order)

    return {
        "message": "Order placed successfully",
        "order": new_order,
        "payment": simulate_payment(new_order),
        "notifications": simulate_notifications(order.patient_name),
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
