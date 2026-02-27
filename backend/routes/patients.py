from fastapi import APIRouter, HTTPException
from database import get_patient_orders, get_patient_notifications
from typing import Optional
from datetime import date, datetime
import os

try:
    from google import genai
except ImportError:
    genai = None

router = APIRouter()

SIMULATED_PATIENTS = {
    "1234-5678-9012": {
        "patient_id": "P001", "abha_id": "1234-5678-9012", "name": "Rajesh Kumar",
        "age": 58, "gender": "M", "phone": "+91-9876543210", "email": "rajesh@example.com",
        "blood_group": "B+", "chronic_conditions": ["Type 2 Diabetes", "Hypertension"]
    },
    "2345-6789-0123": {
        "patient_id": "P002", "abha_id": "2345-6789-0123", "name": "Priya Sharma",
        "age": 34, "gender": "F", "phone": "+91-9876543211", "email": "priya@example.com",
        "blood_group": "O+", "chronic_conditions": ["Allergic Rhinitis", "Vitamin D Deficiency"]
    },
    "3456-7890-1234": {
        "patient_id": "P003", "abha_id": "3456-7890-1234", "name": "Amit Patel",
        "age": 62, "gender": "M", "phone": "+91-9876543212", "email": "amit@example.com",
        "blood_group": "A+", "chronic_conditions": ["Coronary Artery Disease", "Hyperlipidemia"]
    },
    "4567-8901-2345": {
        "patient_id": "P004", "abha_id": "4567-8901-2345", "name": "Sunita Devi",
        "age": 45, "gender": "F", "phone": "+91-9876543213", "email": "sunita@example.com",
        "blood_group": "AB+", "chronic_conditions": ["Hypothyroidism", "GERD"]
    },
    "5678-9012-3456": {
        "patient_id": "P005", "abha_id": "5678-9012-3456", "name": "Mohammed Khalil",
        "age": 38, "gender": "M", "phone": "+91-9876543214", "email": "khalil@example.com",
        "blood_group": "B-", "chronic_conditions": []
    },
}


@router.get("/")
async def list_patients():
    return {"patients": list(SIMULATED_PATIENTS.values()), "total": len(SIMULATED_PATIENTS)}


@router.post("/login")
async def patient_login(abha_id: str):
    patient = SIMULATED_PATIENTS.get(abha_id)
    if not patient:
        patient = {
            "patient_id": f"P-{abha_id[:4]}",
            "abha_id": abha_id,
            "name": "Guest Patient",
            "age": 30,
            "gender": "Unknown",
            "phone": None,
            "email": None,
            "blood_group": "Unknown",
            "chronic_conditions": []
        }
    return {"patient": patient, "authenticated": True}


@router.get("/{patient_id}/history")
async def get_order_history(patient_id: str):
    orders = get_patient_orders(patient_id=patient_id)
    return {"patient_id": patient_id, "orders": orders, "total": len(orders)}


@router.get("/abha/{abha_id}/history")
async def get_order_history_by_abha(abha_id: str):
    orders = get_patient_orders(abha_id=abha_id)
    return {"abha_id": abha_id, "orders": orders, "total": len(orders)}


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
        # Only take the most recent order for each medicine
        if key in seen:
            continue
        seen.add(key)
        
        try:
            next_refill = datetime.strptime(o["next_refill_date"], "%Y-%m-%d").date()
            days_until = (next_refill - today).days
            if 0 <= days_until <= 5:
                critical_orders.append({
                    "medicine": o["medicine_name"],
                    "days": days_until
                })
        except Exception:
            pass

    if not critical_orders:
        return {"insight": None, "medicines": []}

    meds = [c["medicine"] for c in critical_orders]

    if genai:
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            prompt = f"You are a friendly AI Pharmacist. The patient's following medicines need to be refilled soon: {critical_orders}. Write a personalized 1-sentence alert (max 15 words) urging them to re-order now to avoid missing a dose. Example: 'Your Metformin is running out in 3 days. Order now to stay healthy!'"
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            insight = response.text.replace('"', '').strip()
            return {"insight": insight, "medicines": meds}
        except Exception as e:
            print("Gemini Insight Error:", e)

    # Fallback insight
    med_names = ", ".join(meds)
    return {
        "insight": f"⚠️ Friendly reminder: Your {med_names} supply is running low. Please refill soon!",
        "medicines": meds
    }


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
                    "patient_id": order["patient_id"],
                    "patient_name": order["patient_name"],
                    "medicine_name": order["medicine_name"],
                    "last_purchase_date": order["purchase_date"],
                    "next_refill_date": order["next_refill_date"],
                    "days_until_refill": days_until,
                    "urgency": urgency,
                })
        except Exception:
            pass

    return {"alerts": alerts, "total": len(alerts)}


@router.get("/{abha_id}/notifications")
async def get_notifications(abha_id: str):
    notifs = get_patient_notifications(abha_id=abha_id)
    unread_count = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "total": len(notifs), "unread": unread_count}
