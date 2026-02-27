from fastapi import APIRouter, UploadFile, File
from models import ChatMessage, ChatResponse
from agents.pharmacy_agent import PharmacyAgent
import os

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
