from fastapi import APIRouter, Request
import json

router = APIRouter()


@router.post("/fulfillment")
async def fulfillment_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    print(f"[WEBHOOK] Received fulfillment webhook: {json.dumps(body, indent=2)}")

    return {
        "status": "received",
        "message": "Webhook processed successfully",
        "data": body,
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

