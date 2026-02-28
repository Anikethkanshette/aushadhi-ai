from fastapi import APIRouter, HTTPException
from database import get_patient_orders, get_patient_notifications
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import os

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
}


class PatientLoginRequest(BaseModel):
    abha_id: str
    password: str


def _strip_sensitive(patient: dict) -> dict:
    """Return patient without password field."""
    return {k: v for k, v in patient.items() if k != "password"}


@router.get("/")
async def list_patients():
    return {"patients": [_strip_sensitive(p) for p in SIMULATED_PATIENTS.values()], "total": len(SIMULATED_PATIENTS)}


@router.post("/login")
async def patient_login(body: PatientLoginRequest):
    patient = SIMULATED_PATIENTS.get(body.abha_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found. Please check your ABHA ID.")
    if patient["password"] != body.password:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    return {"patient": _strip_sensitive(patient), "authenticated": True}


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
async def get_notifications(abha_id: str):
    notifs = get_patient_notifications(abha_id=abha_id)
    unread_count = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "total": len(notifs), "unread": unread_count}
