from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from models import ChatMessage, ChatResponse, ScanPrescriptionResponse, ScannedMedicine
from agents.pharmacy_agent import PharmacyAgent
from agents.stock_agent import StockCheckAgent
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.delivery_agent import DeliveryAgent
from agents.notification_agent import NotificationAgent
from agents.policy_agent import PolicyAgent
from agents.predictive_agent import PredictiveAgent
from agents.welfare_agent import WelfareAgent
from database import load_medicines, save_prescription_record, get_active_prescription, get_active_prescriptions_for_patient, get_prescription_history_for_patient
import os
import json
import time
import re
import uuid
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta
from routes.patients import SIMULATED_PATIENTS

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None

router = APIRouter()

agent_instance = None
agent_registry = {}


def get_agent():
    global agent_instance
    if agent_instance is None:
        agent_instance = PharmacyAgent()
    return agent_instance


def get_agent_instance(agent_name: str):
    key = str(agent_name or "").lower().strip()
    if key == "pharmacy":
        return get_agent()

    if key in agent_registry:
        return agent_registry[key]

    constructors = {
        "stock": StockCheckAgent,
        "prescription": PrescriptionAgent,
        "payment": PaymentAgent,
        "delivery": DeliveryAgent,
        "notification": NotificationAgent,
        "policy": PolicyAgent,
        "predictive": PredictiveAgent,
        "welfare": WelfareAgent,
    }

    constructor = constructors.get(key)
    if not constructor:
        return None
    instance = constructor()
    agent_registry[key] = instance
    return instance


class AgentExecuteRequest(BaseModel):
    agent: str = Field(..., min_length=2, description="Agent key, e.g. stock/prescription/payment")
    action: str = Field(..., min_length=2, description="Agent action to execute")
    payload: Dict[str, Any] = Field(default_factory=dict)
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    abha_id: Optional[str] = None


@router.post("/execute")
async def execute_agent(request: AgentExecuteRequest):
    agent_key = request.agent.lower().strip()
    action_key = request.action.lower().strip()
    payload = dict(request.payload or {})

    if request.patient_id and "patient_id" not in payload:
        payload["patient_id"] = request.patient_id
    if request.patient_name and "patient_name" not in payload:
        payload["patient_name"] = request.patient_name
    if request.abha_id and "abha_id" not in payload:
        payload["abha_id"] = request.abha_id

    agent = get_agent_instance(agent_key)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{request.agent}'")

    try:
        if agent_key == "pharmacy":
            if action_key != "chat":
                raise HTTPException(status_code=400, detail="Pharmacy agent supports action 'chat'")
            result = await agent.process_message(
                message=str(payload.get("message") or ""),
                patient_id=payload.get("patient_id"),
                patient_name=payload.get("patient_name"),
                abha_id=payload.get("abha_id"),
                language=payload.get("language", "en-IN"),
                has_prescription=bool(payload.get("has_prescription", False)),
            )

        elif agent_key == "stock":
            if action_key == "search":
                result = agent.check_inventory(query=str(payload.get("query") or ""))
            elif action_key == "item":
                result = agent.check_specific_item(medicine_id=str(payload.get("medicine_id") or ""))
            elif action_key == "low_stock":
                result = agent.check_low_stock_items(threshold=int(payload.get("threshold", 10)))
            else:
                raise HTTPException(status_code=400, detail="Unknown stock action")

        elif agent_key == "prescription":
            if action_key == "validate":
                result = agent.validate_prescription(
                    medicine_id=str(payload.get("medicine_id") or ""),
                    has_prescription=bool(payload.get("has_prescription", False)),
                    patient_abha=str(payload.get("abha_id") or payload.get("patient_abha") or "anonymous"),
                )
            elif action_key == "interaction":
                result = agent.check_interaction(
                    medicine_id_1=str(payload.get("medicine_id_1") or ""),
                    medicine_id_2=str(payload.get("medicine_id_2") or ""),
                )
            else:
                raise HTTPException(status_code=400, detail="Unknown prescription action")

        elif agent_key == "payment":
            if action_key == "process":
                result = agent.process_payment(
                    patient_id=str(payload.get("patient_id") or ""),
                    amount=float(payload.get("amount", 0)),
                    method=str(payload.get("method") or "UPI"),
                )
            elif action_key == "refund":
                result = agent.refund_payment(
                    transaction_id=str(payload.get("transaction_id") or ""),
                    amount=float(payload.get("amount", 0)),
                    reason=str(payload.get("reason") or "Customer request"),
                )
            elif action_key == "validate_method":
                result = agent.validate_payment_method(
                    method=str(payload.get("method") or "UPI"),
                    details=dict(payload.get("details") or {}),
                )
            else:
                raise HTTPException(status_code=400, detail="Unknown payment action")

        elif agent_key == "delivery":
            if action_key == "schedule":
                result = agent.schedule_delivery(
                    order_id=str(payload.get("order_id") or ""),
                    zip_code=str(payload.get("zip_code") or ""),
                )
            elif action_key == "track":
                result = agent.track_shipment(tracking_id=str(payload.get("tracking_id") or ""))
            elif action_key == "estimate_cost":
                result = agent.estimate_delivery_cost(
                    zip_code=str(payload.get("zip_code") or ""),
                    weight_kg=float(payload.get("weight_kg", 1.0)),
                )
            else:
                raise HTTPException(status_code=400, detail="Unknown delivery action")

        elif agent_key == "notification":
            if action_key != "generate":
                raise HTTPException(status_code=400, detail="Notification agent supports action 'generate'")
            result = agent.generate_and_dispatch(
                patient_id=str(payload.get("patient_id") or ""),
                abha_id=str(payload.get("abha_id") or ""),
                patient_name=str(payload.get("patient_name") or "Patient"),
                event_type=str(payload.get("event_type") or "general_update"),
                details=dict(payload.get("details") or {}),
            )

        elif agent_key == "policy":
            if action_key == "ask":
                result = await agent.process_message(message=str(payload.get("message") or ""))
            elif action_key == "return_policy":
                result = agent.get_return_policy()
            elif action_key == "schedule_info":
                result = agent.get_schedule_info(schedule=str(payload.get("schedule") or "OTC"))
            else:
                raise HTTPException(status_code=400, detail="Unknown policy action")

        elif agent_key == "predictive":
            if action_key == "refill_alerts":
                result = agent.compute_refill_alerts(days_threshold=int(payload.get("days_threshold", 7)))
            elif action_key == "predict_refill":
                result = agent.predict_next_refill(
                    patient_id=str(payload.get("patient_id") or ""),
                    medicine_id=str(payload.get("medicine_id") or ""),
                )
            elif action_key == "timeline":
                result = agent.get_patient_medication_timeline(patient_id=str(payload.get("patient_id") or ""))
            else:
                raise HTTPException(status_code=400, detail="Unknown predictive action")

        elif agent_key == "welfare":
            if action_key == "check":
                result = agent.check_eligibility(
                    abha_id=str(payload.get("abha_id") or ""),
                    order_amount=float(payload.get("order_amount", 0)),
                )
            else:
                raise HTTPException(status_code=400, detail="Unknown welfare action")

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported agent '{request.agent}'")

        return {
            "status": "success",
            "message": "Agent executed",
            "agent": agent_key,
            "action": action_key,
            "result": result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to execute {agent_key}.{action_key}: {str(exc)}")


@router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    agent = get_agent()
    result = await agent.process_message(
        message=message.message,
        patient_id=message.patient_id,
        patient_name=message.patient_name,
        abha_id=message.abha_id,
        language=message.language,
        has_prescription=message.has_prescription,
    )
    return result


@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    patient_id: str = None,
    abha_id: str = None,
):
    # Voice processing: In production, use Google Speech-to-Text API
    # For demo, return a placeholder response
    return {
        "transcript": "Voice processing demo - please use text chat",
        "response": "I received your voice message. For the best experience, please type your medicine request.",
        "agent_trace": ["Voice input received", "Transcript extracted", "Routed to chat agent"],
    }


@router.get("/welfare/{abha_id}")
async def check_welfare(abha_id: str):
    # Simulate welfare eligibility check
    eligible_ids = ["1234-5678-9012", "2345-6789-0123", "3456-7890-1234"]
    eligible = abha_id in eligible_ids
    return {
        "abha_id": abha_id,
        "eligible": eligible,
        "scheme": "PMJAY (Ayushman Bharat)" if eligible else None,
        "discount_percent": 20 if eligible else 0,
        "reason": "Patient enrolled in PMJAY scheme" if eligible else "Not enrolled in welfare scheme",
    }


@router.post("/scan-prescription", response_model=ScanPrescriptionResponse)
async def scan_prescription(
    image: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    abha_id: Optional[str] = Form(None),
):
    started_at = time.perf_counter()

    if not genai:
        raise HTTPException(status_code=500, detail="Gemini library not installed.")

    def derive_valid_until_from_medicines(items: list[dict]) -> str:
        default_days = 30
        max_days = default_days
        for item in items:
            dosage_text = str((item or {}).get("dosage", "") or "")
            days_match = re.search(r"for\s*(\d{1,3})\s*days?", dosage_text, flags=re.IGNORECASE)
            if not days_match:
                continue
            try:
                parsed = int(days_match.group(1))
                if parsed > max_days:
                    max_days = parsed
            except Exception:
                continue
        return str(date.today() + timedelta(days=max_days))
    
    # Read image contents
    contents = await image.read()
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        def extract_prescribed_quantity(raw_quantity, dosage_text: str) -> int:
            if raw_quantity is not None:
                try:
                    parsed = int(str(raw_quantity).strip())
                    if parsed > 0:
                        return parsed
                except Exception:
                    pass

            dosage_value = str(dosage_text or "").lower().strip()
            if not dosage_value:
                return 1

            explicit_qty_patterns = [
                r"(?:qty|quantity|q\.?ty|tablets?|tabs?|capsules?|caps?)\s*[:=\-]?\s*(\d{1,4})",
                r"(\d{1,4})\s*(?:tablets?|tabs?|capsules?|caps?)",
            ]
            for pattern in explicit_qty_patterns:
                match = re.search(pattern, dosage_value, flags=re.IGNORECASE)
                if match:
                    try:
                        value = int(match.group(1))
                        if value > 0:
                            return value
                    except Exception:
                        continue

            freq_match = re.search(r"(\d+)\s*[-x]\s*(\d+)\s*[-x]\s*(\d+)", dosage_value)
            days_match = re.search(r"for\s*(\d{1,3})\s*days?", dosage_value)
            if freq_match and days_match:
                try:
                    per_day = int(freq_match.group(1)) + int(freq_match.group(2)) + int(freq_match.group(3))
                    days = int(days_match.group(1))
                    est = per_day * days
                    if est > 0:
                        return est
                except Exception:
                    pass

            return 1

        prompt = """
        You are an expert pharmacist AI. Read this uploaded prescription image and return ONLY valid JSON with this exact shape:
        {
            "patient_name": "string",
            "medicines": [
                {
                    "extracted_name": "string",
                    "dosage": "string",
                    "quantity": 1
                }
            ]
        }

        Rules:
        - If patient name is not readable, set patient_name to empty string.
        - If no medicines are readable, return medicines as []
        - quantity must be a positive integer for total prescribed units (e.g., 10).
        - If quantity is not explicitly readable, set quantity to 1.
        - Do not return any extra keys.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=genai_types.Content(
                role="user",
                parts=[
                    genai_types.Part.from_text(text=prompt),
                    genai_types.Part.from_bytes(
                        data=contents,
                        mime_type=image.content_type or "image/jpeg",
                    ),
                ],
            ),
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        parsed = json.loads(response.text)
        if isinstance(parsed, dict):
            extracted_patient_name = str(parsed.get("patient_name") or "").strip()
            data = parsed.get("medicines") or []
            if not isinstance(data, list):
                data = []
        elif isinstance(parsed, list):
            extracted_patient_name = ""
            data = parsed
        else:
            extracted_patient_name = ""
            data = []

    except Exception as e:
        print("OCR Error:", e)
        # Fallback dummy logic if API fails
        extracted_patient_name = ""
        data = [{"extracted_name": "Paracetamol", "dosage": "500mg", "quantity": 1}]
        
    medicines_db = load_medicines()
    scanned = []

    def normalize_name(value: str) -> str:
        value = str(value or "").strip().lower()
        value = re.sub(r"[^a-z\s]", "", value)
        return re.sub(r"\s+", " ", value).strip()

    def normalize_text(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

    def find_best_inventory_match(extracted_name: str):
        query = str(extracted_name or "").strip().lower()
        if not query:
            return None

        normalized_query = normalize_text(query)
        query_tokens = [t for t in re.split(r"\s+", query) if len(t) > 2]

        exact = next(
            (
                m for m in medicines_db
                if normalized_query and (
                    normalize_text(m.get("name", "")) == normalized_query
                    or normalize_text(m.get("generic_name", "")) == normalized_query
                )
            ),
            None,
        )
        if exact:
            return exact

        token_match = next(
            (
                m for m in medicines_db
                if any(token in str(m.get("name", "")).lower() or token in str(m.get("generic_name", "")).lower() for token in query_tokens)
            ),
            None,
        )
        if token_match:
            return token_match

        partial = next(
            (
                m for m in medicines_db
                if query in str(m.get("name", "")).lower() or query in str(m.get("generic_name", "")).lower()
            ),
            None,
        )
        return partial
    
    for item in data:
        extracted_name = item.get("extracted_name", "")
        dosage = item.get("dosage", "")
        prescribed_quantity = extract_prescribed_quantity(item.get("quantity"), dosage)
        if not extracted_name:
            continue
            
        found = find_best_inventory_match(extracted_name)
        
        scanned.append(ScannedMedicine(
            extracted_name=extracted_name,
            dosage=dosage,
            quantity=prescribed_quantity,
            matched_medicine=found,
            available=found is not None and int(found.get("stock_quantity", 0)) > 0
        ))
        
    unavailable_items = [
        item.extracted_name for item in scanned
        if not item.available
    ]

    patient_name_match = None
    patient_name_warning = None
    normalized_expected_name = normalize_name(patient_name or "")
    normalized_scanned_name = normalize_name(extracted_patient_name or "")
    if normalized_expected_name and normalized_scanned_name:
        patient_name_match = normalized_expected_name == normalized_scanned_name
        if not patient_name_match:
            patient_name_warning = (
                f"Prescription patient name appears as '{extracted_patient_name}', which does not match your profile name '{patient_name}'. "
                "Please verify this is your prescription."
            )

    if abha_id and scanned:
        patient_record = SIMULATED_PATIENTS.get(str(abha_id))
        if patient_record is not None:
            existing = set(str(m).strip() for m in patient_record.get("current_medications", []) if str(m).strip())
            for item in scanned:
                med_label = f"{item.extracted_name}{f' {item.dosage}' if item.dosage else ''}".strip()
                if med_label and med_label not in existing:
                    patient_record.setdefault("current_medications", []).append(med_label)
                    existing.add(med_label)

    scan_duration_ms = int((time.perf_counter() - started_at) * 1000)

    prescription_record_id = None
    prescription_valid_until = None
    can_persist = bool(abha_id and scanned and patient_name_match is not False)
    if can_persist:
        try:
            ext = os.path.splitext(image.filename or "")[1].lower().strip()
            if not ext:
                ext = ".jpg"
            if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
                ext = ".jpg"

            prescription_record_id = f"PRX-{str(uuid.uuid4())[:8].upper()}"
            prescriptions_dir = os.path.join(os.path.dirname(__file__), "..", "data", "prescriptions")
            prescriptions_dir = os.path.abspath(prescriptions_dir)
            os.makedirs(prescriptions_dir, exist_ok=True)

            stored_filename = f"{prescription_record_id}{ext}"
            stored_path = os.path.join(prescriptions_dir, stored_filename)
            with open(stored_path, "wb") as f:
                f.write(contents)

            medicine_entries = []
            for med in scanned:
                matched_med_id = None
                if med.matched_medicine:
                    if isinstance(med.matched_medicine, dict):
                        matched_med_id = med.matched_medicine.get("id")
                    else:
                        matched_med_id = getattr(med.matched_medicine, "id", None)
                medicine_entries.append({
                    "extracted_name": med.extracted_name,
                    "dosage": med.dosage,
                    "quantity": med.quantity,
                    "matched_medicine_id": matched_med_id,
                })

            prescription_valid_until = derive_valid_until_from_medicines(medicine_entries)
            save_prescription_record({
                "record_id": prescription_record_id,
                "abha_id": str(abha_id),
                "patient_name": patient_name or extracted_patient_name or "",
                "uploaded_at": datetime.utcnow().isoformat(),
                "valid_until": prescription_valid_until,
                "source_file_name": image.filename or "",
                "stored_file_name": stored_filename,
                "stored_file_path": stored_path,
                "medicines": medicine_entries,
            })
        except Exception as persist_error:
            print("Prescription persistence error:", persist_error)
            prescription_record_id = None
            prescription_valid_until = None

    return ScanPrescriptionResponse(
        message=f"Successfully scanned {len(scanned)} medicines from prescription.",
        medicines=scanned,
        scan_duration_ms=scan_duration_ms,
        unavailable_items=unavailable_items,
        short_availability_eta="30-60 minutes" if unavailable_items else None,
        extracted_patient_name=extracted_patient_name or None,
        patient_name_match=patient_name_match,
        patient_name_warning=patient_name_warning,
        prescription_record_id=prescription_record_id,
        prescription_valid_until=prescription_valid_until,
    )


@router.get("/prescription/active")
async def get_active_prescription_record(abha_id: str, medicine_id: str):
    record = get_active_prescription(abha_id=abha_id, medicine_id=medicine_id)
    if not record:
        return {
            "status": "success",
            "data": {
                "active": False,
                "prescription": None,
            },
            "message": "No active prescription found",
            "error_code": None,
        }

    return {
        "status": "success",
        "data": {
            "active": True,
            "prescription": record,
        },
        "message": "Active prescription found",
        "error_code": None,
    }


@router.get("/prescriptions/active/{abha_id}")
async def get_active_prescriptions_for_abha(abha_id: str):
    records = get_active_prescriptions_for_patient(abha_id=abha_id)
    return {
        "status": "success",
        "data": {
            "active_prescriptions": records,
            "total": len(records),
        },
        "message": "Active prescriptions retrieved successfully",
        "error_code": None,
    }


@router.get("/prescriptions/history/{abha_id}")
async def get_prescription_history_for_abha(abha_id: str):
    history = get_prescription_history_for_patient(abha_id=abha_id)
    active_records = history.get("active", [])
    expired_records = history.get("expired", [])

    return {
        "status": "success",
        "data": {
            "active_prescriptions": active_records,
            "expired_prescriptions": expired_records,
            "active_total": len(active_records),
            "expired_total": len(expired_records),
            "total": len(active_records) + len(expired_records),
        },
        "message": "Prescription history retrieved successfully",
        "error_code": None,
    }
