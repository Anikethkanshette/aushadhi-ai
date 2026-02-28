import os
import logging
import uuid
import json
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Setup Gemini Direct API
try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from agents.agent_utils import (
    setup_agent_logger, validate_string, AgentResponse, ValidationError
)
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
        self.name = "NotificationAgent"
        self.logger = setup_agent_logger(self.name)
        self._client = None
        self.logger.info("✓ NotificationAgent initialized")

    def _get_client(self):
        if self._client is None and GEMINI_AVAILABLE:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if api_key:
                self._client = genai.Client(api_key=api_key)
        return self._client

    def generate_and_dispatch(self, patient_id: str, abha_id: str, patient_name: str, 
                             event_type: str, details: dict) -> Dict[str, Any]:
        """
        Generates contextual notifications using Gemini and saves them to database.
        Supports multiple channels: WhatsApp, SMS, Email, In-App.
        
        Args:
            patient_id: Patient ID
            abha_id: Patient ABHA ID
            patient_name: Patient full name
            event_type: Type of event (order_placed, payment_completed, etc.)
            details: Event details dictionary
            
        Returns:
            Dictionary with notifications for all channels
        """
        try:
            # Validate inputs
            patient_id = validate_string(patient_id, "Patient ID", min_length=1, max_length=50)
            patient_name = validate_string(patient_name, "Patient Name", min_length=2, max_length=100)
            event_type = validate_string(event_type, "Event Type", min_length=3, max_length=50)
            
            self.logger.debug(
                f"Generating notification: patient={patient_id}, event={event_type}"
            )
            
            content = f"Event: {event_type}\nPatient: {patient_name}\nDetails: {json.dumps(details)}"
            
            # Default/fallback notifications
            fallback_data = {
                "whatsapp": f"Namaste {patient_name}! 👋 Your AushadhiAI update: {event_type}. 💊 {details.get('medicine_name', '')} 🚚",
                "sms": f"AushadhiAI: {event_type} processed successfully.",
                "email_subject": f"AushadhiAI: {event_type.replace('_', ' ').title()}",
                "email_body": f"Dear {patient_name},\n\nThis is regarding your {event_type}.\nDetails: {json.dumps(details, indent=2)}\n\nRegards,\nAushadhiAI Team",
                "in_app": f"{event_type.replace('_', ' ').title()} - {details.get('medicine_name', '')}",
                "generated_by": "fallback"
            }
            
            generated = fallback_data
            
            # Try Gemini generation
            client = self._get_client()
            if client and GEMINI_AVAILABLE:
                try:
                    resp = client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[genai_types.Content(
                            role="user",
                            parts=[genai_types.Part(text=content)]
                        )],
                        config=genai_types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            temperature=0.3,
                            response_mime_type="application/json",
                        ),
                    )
                    parsed = json.loads(resp.text)
                    
                    # Validate parsed response
                    required_fields = ["whatsapp", "sms", "email_subject", "email_body", "in_app"]
                    if all(k in parsed for k in required_fields):
                        generated = parsed
                        generated["generated_by"] = "gemini"
                        self.logger.debug("Notifications generated using Gemini")
                    else:
                        self.logger.warning("Gemini response missing required fields, using fallback")
                        
                except json.JSONDecodeError as e:
                    self.logger.warning(f"Failed to parse Gemini JSON response: {e}")
                except Exception as e:
                    self.logger.warning(f"Gemini generation failed: {e}")
            
            # Save in-app notification to database
            notif_record = {
                "id": f"notif_{uuid.uuid4().hex[:8]}",
                "patient_id": patient_id,
                "abha_id": abha_id,
                "title": self._get_notification_title(event_type),
                "message": generated["in_app"],
                "timestamp": datetime.now().isoformat(),
                "read": False,
                "type": self._get_notification_type(event_type),
                "event_type": event_type,
                "metadata": details
            }
            
            try:
                save_notification(notif_record)
                self.logger.info(f"Notification saved: {notif_record['id']}")
            except Exception as e:
                self.logger.error(f"Failed to save notification: {e}")
            
            return AgentResponse(
                status="success",
                message=f"Notification generated and dispatched.",
                data=generated
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error in generate_and_dispatch: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to generate notification.",
                error_code="NOTIFICATION_ERROR"
            ).to_dict()
    
    def _get_notification_title(self, event_type: str) -> str:
        """Gets a friendly title for the event type."""
        titles = {
            "order_placed": "Order Confirmed",
            "payment_completed": "Payment Successful",
            "order_dispatched": "Order Dispatched",
            "order_delivered": "Delivery Complete",
            "refill_reminder": "Time for Refill",
            "prescription_validated": "Prescription Approved"
        }
        return titles.get(event_type, "Pharmacy Update")
    
    def _get_notification_type(self, event_type: str) -> str:
        """Gets the notification type for UI styling."""
        if "error" in event_type.lower() or "failed" in event_type.lower():
            return "error"
        elif "delivered" in event_type.lower() or "completed" in event_type.lower():
            return "success"
        elif "reminder" in event_type.lower():
            return "warning"
        return "info"
