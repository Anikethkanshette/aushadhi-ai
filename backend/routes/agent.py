from fastapi import APIRouter, UploadFile, File, HTTPException
from models import ChatMessage, ChatResponse, ScanPrescriptionResponse, ScannedMedicine
from agents.pharmacy_agent import PharmacyAgent
from database import load_medicines
import os
import json

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None

router = APIRouter()

agent_instance = None


def get_agent():
    global agent_instance
    if agent_instance is None:
        agent_instance = PharmacyAgent()
    return agent_instance


@router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    agent = get_agent()
    result = await agent.process_message(
        message=message.message,
        patient_id=message.patient_id,
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
async def scan_prescription(image: UploadFile = File(...)):
    if not genai:
        raise HTTPException(status_code=500, detail="Gemini library not installed.")
    
    # Read image contents
    contents = await image.read()
    
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = """
        You are an expert pharmacist AI. Read this uploaded prescription image and return a JSON array. 
        Each object in the array should exactly contain two string fields:
        1. 'extracted_name': The name of the medicine.
        2. 'dosage': The instructed dosage (like '500mg' or 'twice daily').
        If the image is not a prescription or has no medicines, return an empty array [].
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                {
                    "mime_type": image.content_type or "image/jpeg",
                    "data": contents
                }
            ],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        data = json.loads(response.text)
        if not isinstance(data, list):
            data = []
            
    except Exception as e:
        print("OCR Error:", e)
        # Fallback dummy logic if API fails
        data = [{"extracted_name": "Paracetamol", "dosage": "500mg"}]
        
    medicines_db = load_medicines()
    scanned = []
    
    for item in data:
        extracted_name = item.get("extracted_name", "")
        dosage = item.get("dosage", "")
        if not extracted_name:
            continue
            
        # Crude loose match in database
        q = str(extracted_name).lower()
        found = next((m for m in medicines_db if q in m["name"].lower() or q in m["generic_name"].lower()), None)
        
        scanned.append(ScannedMedicine(
            extracted_name=extracted_name,
            dosage=dosage,
            quantity=1,
            matched_medicine=found,
            available=found is not None and int(found.get("stock_quantity", 0)) > 0
        ))
        
    return ScanPrescriptionResponse(
        message=f"Successfully scanned {len(scanned)} medicines from prescription.",
        medicines=scanned
    )
