import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Setup Gemini Direct API (same pattern as pharmacy_agent.py)
try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from models import AgentNotificationResponse
from database import save_notification

SYSTEM_PROMPT = """You are AushadhiAI Notification Agent.
Your job is to generate concise, friendly, and contextual notifications for a patient based on the events in their pharmacy order.
You must return a JSON response containing specific fields for different channels.
Output ONLY valid JSON matching this schema:
{
    "whatsapp": "string (friendly, uses emojis like 💊🚚)",
    "sms": "string (short, max 160 chars)",
    "email_subject": "string",
    "email_body": "string",
    "in_app": "string (short, direct)"
}
"""

class NotificationAgent:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None and GEMINI_AVAILABLE:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if api_key:
                self._client = genai.Client(api_key=api_key)
        return self._client

    def generate_and_dispatch(self, patient_id: str, abha_id: str, patient_name: str, event_type: str, details: dict) -> dict:
        """
        Generates contextual copy utilizing Gemini and saves the in-app notification to the DB.
        Returns the dict for printing to the terminal/UI to simulate SMS/WA/Email.
        """
        client = self._get_client()
        content = f"Event: {event_type}\nPatient: {patient_name}\nDetails: {details}"

        # Default fallback text
        fallback = {
            "whatsapp": f"Namaste {patient_name}! Your AushadhiAI update: {event_type}. Details: {details.get('medicine_name', 'Order')} 🚚",
            "sms": f"AushadhiAI: Update for {patient_name} - {event_type} processed.",
            "email_subject": f"AushadhiAI Update: {event_type}",
            "email_body": f"Dear {patient_name},\n\nThis is regarding your {event_type}.\nDetails: {details}\n\nRegards,\nAushadhiAI",
            "in_app": f"Update: {event_type} - {details.get('medicine_name', '')}"
        }

        generated = fallback

        if client and GEMINI_AVAILABLE:
            try:
                resp = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=content)])],
                    config=genai_types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3,
                        response_mime_type="application/json",
                    ),
                )
                import json
                parsed = json.loads(resp.text)
                if all(k in parsed for k in ["whatsapp", "sms", "email_subject", "email_body", "in_app"]):
                    generated = parsed
            except Exception as e:
                print(f"NotificationAgent error: {e}")

        # Save to simulated Database (In-App only)
        notif_record = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "patient_id": patient_id,
            "abha_id": abha_id,
            "title": "Order Update" if "order" in event_type.lower() else "Pharmacy Update",
            "message": generated["in_app"],
            "timestamp": datetime.now().isoformat(),
            "read": False,
            "type": "success" if "fulfill" in event_type.lower() else "info"
        }
        save_notification(notif_record)

        return generated
