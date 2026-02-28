from fastapi import APIRouter, Request
import json
from database import get_all_orders, update_order_status
from agents.notification_agent import NotificationAgent

router = APIRouter()
notification_agent = NotificationAgent()


@router.post("/fulfillment")
async def fulfillment_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    event = str(body.get("event") or "order_fulfilled").lower()
    order_id = body.get("order_id")

    order = None
    if order_id:
        all_orders = get_all_orders()
        order = next((o for o in all_orders if o.get("order_id") == order_id), None)

    if order and event in ["order_fulfilled", "fulfillment_completed", "delivered"]:
        update_order_status(order_id, "fulfilled")
        generated = notification_agent.generate_and_dispatch(
            patient_id=order.get("patient_id", ""),
            abha_id=order.get("abha_id", ""),
            patient_name=order.get("patient_name", "Patient"),
            event_type="order_delivered",
            details={
                "order_id": order_id,
                "medicine_name": order.get("medicine_name", ""),
                "quantity": order.get("quantity", ""),
            },
        )
    else:
        generated = {
            "status": "skipped",
            "message": "No matching order/event for fulfillment action"
        }

    print(f"[WEBHOOK] Received fulfillment webhook: {json.dumps(body, indent=2)}")

    return {
        "status": "received",
        "message": "Webhook processed successfully",
        "data": body,
        "order_processed": bool(order),
        "notification_result": generated,
    }


@router.post("/notification")
async def notification_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    patient_name = body.get("patient_name", "Patient")
    message = body.get("message", "")
    channels = body.get("channels", ["whatsapp", "sms", "email"])

    results = {}
    for channel in channels:
        results[channel] = f"Demo: Sent {channel} notification to {patient_name}: {message}"

    print(f"[WEBHOOK] Notification sent: {results}")
    return {"status": "sent", "results": results}

