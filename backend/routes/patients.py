from fastapi import APIRouter, HTTPException
from database import get_patient_orders, get_patient_notifications
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import os
import uuid
import json
from database import mark_notification_read, mark_all_notifications_read
from database import search_medicines
from models import OrderCreate
from routes.orders import create_order
from agents.notification_agent import NotificationAgent
from config import get_settings

try:
    from google import genai
except ImportError:
    genai = None

router = APIRouter()

# ── Patient Database with password + full health history ─────────────────────
SIMULATED_PATIENTS = {
    "1234-5678-9012": {
        "patient_id": "P001", "abha_id": "1234-5678-9012", "password": "rajesh123",
        "name": "Rajesh Kumar", "age": 58, "gender": "Male",
        "phone": "+91-9876543210", "email": "rajesh@example.com",
        "blood_group": "B+", "height_cm": 172, "weight_kg": 82,
        "chronic_conditions": ["Type 2 Diabetes", "Hypertension"],
        "allergies": ["Penicillin", "Sulfa drugs"],
        "current_medications": ["Metformin 500mg", "Amlodipine 5mg", "Aspirin 75mg"],
        "family_history": ["Diabetes (Father)", "Hypertension (Mother)"],
        "last_visit": "2026-02-15",
        "vaccination_status": { "COVID-19": "Fully Vaccinated", "Flu": "2025 dose taken" },
        "health_metrics": {"bp": "138/88 mmHg", "sugar_fasting": "142 mg/dL", "cholesterol": "210 mg/dL"}
    },
    "2345-6789-0123": {
        "patient_id": "P002", "abha_id": "2345-6789-0123", "password": "priya234",
        "name": "Priya Sharma", "age": 34, "gender": "Female",
        "phone": "+91-9876543211", "email": "priya@example.com",
        "blood_group": "O+", "height_cm": 158, "weight_kg": 55,
        "chronic_conditions": ["Allergic Rhinitis", "Vitamin D Deficiency"],
        "allergies": ["Aspirin", "Latex"],
        "current_medications": ["Cetirizine 10mg", "Vitamin D3 60K weekly"],
        "family_history": ["Asthma (Mother)"],
        "last_visit": "2026-01-28",
        "vaccination_status": { "COVID-19": "Fully Vaccinated", "Flu": "Not taken 2025" },
        "health_metrics": {"vitamin_d": "18 ng/mL (Low)", "ige_total": "340 IU/mL (High)", "bmi": "22.0"}
    },
    "3456-7890-1234": {
        "patient_id": "P003", "abha_id": "3456-7890-1234", "password": "amit345",
        "name": "Amit Patel", "age": 62, "gender": "Male",
        "phone": "+91-9876543212", "email": "amit@example.com",
        "blood_group": "A+", "height_cm": 168, "weight_kg": 78,
        "chronic_conditions": ["Coronary Artery Disease", "Hyperlipidemia"],
        "allergies": ["Iodine"],
        "current_medications": ["Atorvastatin 40mg", "Ramipril 5mg", "Clopidogrel 75mg"],
        "family_history": ["Heart Disease (Father)", "Stroke (Uncle)"],
        "last_visit": "2026-02-10",
        "vaccination_status": { "COVID-19": "Fully Vaccinated", "Flu": "2025 dose taken", "Pneumococcal": "Done" },
        "health_metrics": {"bp": "125/80 mmHg", "cholesterol": "280 mg/dL", "hdl": "38 mg/dL"}
    },
    "4567-8901-2345": {
        "patient_id": "P004", "abha_id": "4567-8901-2345", "password": "sunita456",
        "name": "Sunita Devi", "age": 45, "gender": "Female",
        "phone": "+91-9876543213", "email": "sunita@example.com",
        "blood_group": "AB+", "height_cm": 155, "weight_kg": 68,
        "chronic_conditions": ["Hypothyroidism", "GERD"],
        "allergies": ["NSAIDs"],
        "current_medications": ["Levothyroxine 50mcg", "Pantoprazole 40mg"],
        "family_history": ["Thyroid disorder (Mother)", "Diabetes (Sister)"],
        "last_visit": "2026-02-20",
        "vaccination_status": { "COVID-19": "Fully Vaccinated" },
        "health_metrics": {"tsh": "6.2 mIU/L (High)", "bmi": "28.3", "bp": "118/75 mmHg"}
    },
    "5678-9012-3456": {
        "patient_id": "P005", "abha_id": "5678-9012-3456", "password": "khalil567",
        "name": "Mohammed Khalil", "age": 38, "gender": "Male",
        "phone": "+91-9876543214", "email": "khalil@example.com",
        "blood_group": "B-", "height_cm": 178, "weight_kg": 75,
        "chronic_conditions": [],
        "allergies": [],
        "current_medications": [],
        "family_history": ["No known hereditary conditions"],
        "last_visit": "2025-12-05",
        "vaccination_status": { "COVID-19": "Fully Vaccinated", "Flu": "2025 dose taken" },
        "health_metrics": {"bmi": "23.7", "bp": "118/76 mmHg", "sugar_fasting": "88 mg/dL"}
    },
    "PAT001": {
        "patient_id": "PAT001", "abha_id": "PAT001", "password": "patient123",
        "name": "Test Patient", "age": 35, "gender": "Male",
        "phone": "+91-9999999999", "email": "patient@example.com",
        "blood_group": "O+", "height_cm": 170, "weight_kg": 70,
        "chronic_conditions": ["Mild Hypertension"],
        "allergies": ["None"],
        "current_medications": ["Amlodipine 5mg"],
        "family_history": ["Hypertension (Father)"],
        "last_visit": "2026-02-20",
        "vaccination_status": { "COVID-19": "Fully Vaccinated", "Flu": "2025 dose taken" },
        "health_metrics": {"bp": "130/85 mmHg", "bmi": "24.2", "cholesterol": "180 mg/dL"},
    }
}


class PatientLoginRequest(BaseModel):
    abha_id: str
    password: str


class AutoRefillRequest(BaseModel):
    abha_id: str
    medicine_name: str
    quantity: int = 1
    confirm: bool = False
    channels: Optional[List[str]] = None


class AutoRefillSubscriptionRequest(BaseModel):
    abha_id: str
    medicine_name: str
    quantity: int = 1
    channels: Optional[List[str]] = None


def _auto_refill_file_path() -> str:
    settings = get_settings()
    return os.path.join(settings.DATA_DIR, "auto_refill_subscriptions.json")


def _load_auto_refill_subscriptions() -> List[dict]:
    path = _auto_refill_file_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_auto_refill_subscriptions(items: List[dict]) -> None:
    path = _auto_refill_file_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)


def _strip_sensitive(patient: dict) -> dict:
    """Return patient without password field."""
    return {k: v for k, v in patient.items() if k != "password"}


@router.get("/")
async def list_patients():
    return {
        "status": "success",
        "data": {
            "patients": [_strip_sensitive(p) for p in SIMULATED_PATIENTS.values()],
            "total": len(SIMULATED_PATIENTS)
        },
        "message": "Patients retrieved successfully",
        "error_code": None
    }


@router.post("/login")
async def patient_login(body: PatientLoginRequest):
    patient = SIMULATED_PATIENTS.get(body.abha_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found. Please check your ABHA ID.")
    if patient["password"] != body.password:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    return {"status": "success", "data": {"patient": _strip_sensitive(patient), "authenticated": True}, "message": "Login successful", "error_code": None}


@router.get("/{patient_id}/history")
async def get_order_history(patient_id: str):
    orders = get_patient_orders(patient_id=patient_id)
    return {"patient_id": patient_id, "orders": orders, "total": len(orders)}


@router.get("/abha/{abha_id}/history")
async def get_order_history_by_abha(abha_id: str):
    orders = get_patient_orders(abha_id=abha_id)
    return {"abha_id": abha_id, "orders": orders, "total": len(orders)}


@router.get("/abha/{abha_id}/profile")
async def get_patient_profile(abha_id: str):
    patient = SIMULATED_PATIENTS.get(abha_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"patient": _strip_sensitive(patient)}


@router.get("/{abha_id}/insights")
async def get_patient_insights(abha_id: str):
    orders = get_patient_orders(abha_id=abha_id)
    if not orders:
        return {"insight": None, "medicines": []}

    today = date.today()
    critical_orders = []
    seen = set()
    for o in orders:
        key = o["medicine_id"]
        if key in seen:
            continue
        seen.add(key)
        try:
            next_refill = datetime.strptime(o["next_refill_date"], "%Y-%m-%d").date()
            days_until = (next_refill - today).days
            if 0 <= days_until <= 5:
                critical_orders.append({"medicine": o["medicine_name"], "days": days_until})
        except Exception:
            pass

    if not critical_orders:
        return {"insight": None, "medicines": []}

    meds = [c["medicine"] for c in critical_orders]

    if genai:
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            prompt = f"You are a friendly AI Pharmacist. The patient's following medicines need to be refilled soon: {critical_orders}. Write a personalized 1-sentence alert (max 15 words) urging them to re-order now. Be warm and specific about the medicine name and days remaining."
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            return {"insight": response.text.replace('"', '').strip(), "medicines": meds}
        except Exception as e:
            print("Gemini Insight Error:", e)

    med_names = ", ".join(meds)
    return {"insight": f"⚠️ Friendly reminder: Your {med_names} supply is running low. Please refill soon!", "medicines": meds}


@router.get("/refill-alerts")
async def get_refill_alerts():
    from database import load_orders
    orders = load_orders()
    alerts = []
    today = date.today()
    seen = set()
    for order in orders:
        key = f"{order['patient_id']}-{order['medicine_id']}"
        if key in seen:
            continue
        seen.add(key)
        try:
            next_refill = datetime.strptime(order["next_refill_date"], "%Y-%m-%d").date()
            days_until = (next_refill - today).days
            if days_until <= 7:
                urgency = "CRITICAL" if days_until <= 2 else "HIGH" if days_until <= 5 else "MEDIUM"
                alerts.append({
                    "patient_id": order["patient_id"], "patient_name": order["patient_name"],
                    "medicine_name": order["medicine_name"], "last_purchase_date": order["purchase_date"],
                    "next_refill_date": order["next_refill_date"], "days_until_refill": days_until, "urgency": urgency,
                })
        except Exception:
            pass
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/{abha_id}/notifications")
async def get_notifications(abha_id: str, read: Optional[bool] = None, notif_type: Optional[str] = None):
    notifs = get_patient_notifications(abha_id=abha_id)
    if read is not None:
        notifs = [n for n in notifs if bool(n.get("read", False)) == read]
    if notif_type:
        notifs = [n for n in notifs if str(n.get("type", "")).lower() == notif_type.lower()]
    unread_count = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "total": len(notifs), "unread": unread_count}


@router.patch("/{abha_id}/notifications/{notification_id}/read")
async def mark_one_notification_read(abha_id: str, notification_id: str, body: Optional[dict] = None):
    body = body or {}
    read_value = bool(body.get("read", True))
    updated = mark_notification_read(notification_id, read=read_value, abha_id=abha_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification updated", "data": {"notification_id": notification_id, "read": read_value}}


@router.patch("/{abha_id}/notifications/read-all")
async def mark_all_notifications(abha_id: str):
    updated_count = mark_all_notifications_read(abha_id=abha_id)
    return {"status": "success", "message": "Notifications updated", "data": {"updated_count": updated_count}}


@router.post("/auto-refill")
async def auto_refill_with_confirmation(body: AutoRefillRequest):
    if not body.confirm:
        raise HTTPException(status_code=400, detail="User confirmation is required for auto refill")

    patient = SIMULATED_PATIENTS.get(body.abha_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    quantity = max(1, int(body.quantity or 1))

    patient_orders = get_patient_orders(abha_id=body.abha_id)
    refill_match = next(
        (o for o in reversed(patient_orders) if body.medicine_name.lower() in str(o.get("medicine_name", "")).lower()),
        None,
    )

    medicine_id = None
    medicine_name = body.medicine_name

    if refill_match:
        medicine_id = str(refill_match.get("medicine_id"))
        medicine_name = refill_match.get("medicine_name", body.medicine_name)
    else:
        matches = search_medicines(body.medicine_name)
        if not matches:
            raise HTTPException(status_code=404, detail="No matching medicine found for auto refill")
        medicine_id = str(matches[0].get("id"))
        medicine_name = matches[0].get("name", body.medicine_name)

    order_payload = OrderCreate(
        patient_id=patient["patient_id"],
        patient_name=patient["name"],
        abha_id=patient["abha_id"],
        medicine_id=medicine_id,
        medicine_name=medicine_name,
        quantity=quantity,
        dosage_frequency="As directed",
        has_prescription=False,
    )

    order_result = create_order(order_payload)
    order_data = (order_result or {}).get("data", {})
    created_order = order_data.get("order", {})

    requested_channels = [str(c).lower() for c in (body.channels or ["whatsapp", "email", "sms"])]
    allowed_channels = [c for c in requested_channels if c in {"whatsapp", "email", "sms"}]
    if not allowed_channels:
        allowed_channels = ["whatsapp", "email", "sms"]

    notif_agent = NotificationAgent()
    notif_result = notif_agent.generate_and_dispatch(
        patient_id=patient["patient_id"],
        abha_id=patient["abha_id"],
        patient_name=patient["name"],
        event_type="refill_order_confirmed",
        details={
            "order_id": created_order.get("order_id"),
            "medicine_name": created_order.get("medicine_name"),
            "quantity": created_order.get("quantity"),
            "total_amount": created_order.get("total_amount"),
        },
    )
    generated_msgs = (notif_result or {}).get("data", {})

    channel_map = {
        "whatsapp": generated_msgs.get("whatsapp") or f"Order confirmed for {medicine_name}.",
        "email": generated_msgs.get("email_subject") or f"Order Confirmation: {created_order.get('order_id', '')}",
        "sms": generated_msgs.get("sms") or f"Order {created_order.get('order_id', '')} confirmed.",
    }
    destination_map = {
        "whatsapp": patient.get("phone", "registered phone"),
        "email": patient.get("email", "registered email"),
        "sms": patient.get("phone", "registered phone"),
    }

    channel_confirmations = {
        channel: f"Mock sent via {channel} to {destination_map[channel]}: {channel_map[channel]}"
        for channel in allowed_channels
    }

    return {
        "status": "success",
        "message": "Auto refill confirmed and order placed",
        "data": {
            "order": created_order,
            "channels_requested": allowed_channels,
            "channel_confirmations": channel_confirmations,
        },
    }


@router.post("/auto-refill/subscribe")
async def create_auto_refill_subscription(body: AutoRefillSubscriptionRequest):
    patient = SIMULATED_PATIENTS.get(body.abha_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    allowed_channels = [
        c for c in [str(ch).lower() for ch in (body.channels or ["whatsapp", "email", "sms"])]
        if c in {"whatsapp", "email", "sms"}
    ]
    if not allowed_channels:
        allowed_channels = ["whatsapp", "email", "sms"]

    subscriptions = _load_auto_refill_subscriptions()
    existing = next(
        (
            s for s in subscriptions
            if s.get("abha_id") == body.abha_id
            and str(s.get("medicine_name", "")).lower() == body.medicine_name.lower()
            and bool(s.get("active", True))
        ),
        None,
    )
    if existing:
        return {
            "status": "success",
            "message": "Auto refill subscription already active",
            "data": {"subscription": existing},
        }

    subscription = {
        "subscription_id": f"AR-{uuid.uuid4().hex[:8].upper()}",
        "abha_id": body.abha_id,
        "patient_id": patient.get("patient_id"),
        "patient_name": patient.get("name"),
        "medicine_name": body.medicine_name,
        "quantity": max(1, int(body.quantity or 1)),
        "channels": allowed_channels,
        "active": True,
        "created_at": datetime.now().isoformat(),
    }
    subscriptions.append(subscription)
    _save_auto_refill_subscriptions(subscriptions)

    return {
        "status": "success",
        "message": "Auto refill subscription enabled",
        "data": {"subscription": subscription},
    }


@router.get("/{abha_id}/auto-refill/subscriptions")
async def list_auto_refill_subscriptions(abha_id: str):
    subscriptions = _load_auto_refill_subscriptions()
    plans = [s for s in subscriptions if s.get("abha_id") == abha_id and bool(s.get("active", True))]
    plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"status": "success", "data": {"subscriptions": plans, "total": len(plans)}}


@router.delete("/{abha_id}/auto-refill/subscriptions/{subscription_id}")
async def cancel_auto_refill_subscription(abha_id: str, subscription_id: str):
    subscriptions = _load_auto_refill_subscriptions()
    updated = False
    for item in subscriptions:
        if item.get("subscription_id") == subscription_id and item.get("abha_id") == abha_id:
            item["active"] = False
            item["cancelled_at"] = datetime.now().isoformat()
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Auto refill subscription not found")

    _save_auto_refill_subscriptions(subscriptions)
    return {
        "status": "success",
        "message": "Auto refill subscription cancelled",
        "data": {"subscription_id": subscription_id, "active": False},
    }
