import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from agents.agent_utils import (
    setup_agent_logger, validate_string, AgentResponse, ValidationError
)

SYSTEM_PROMPT = """You are the AushadhiAI Policy & Regulatory Agent.
Your sole responsibility is to answer queries regarding:
1. Pharmacy laws in India (Drugs and Cosmetics Act, Schedule H, H1, X).
2. AushadhiAI Return & Refund Policies (No returns on cold-chain items like Insulin, 7-day return on sealed OTC items).
3. Drug-Drug Interactions and Contraindications.
4. Maximum dispensing limits and prescription validity (e.g. valid for 6 months).
5. Privacy and data protection laws (HIPAA equivalent in India).

Rules for your responses:
- Be highly professional, authoritative, but easy for a patient or pharmacist to understand.
- Use bullet points where appropriate.
- ALWAYS cite that you are providing general guidance and they should consult a registered medical practitioner for medical emergencies.
- Do NOT help them search for stock or place orders. If they ask to buy, tell them to ask the main Pharmacy Agent instead.
"""

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

class PolicyAgent:
    def __init__(self):
        self.name = "PolicyAgent"
        self.logger = setup_agent_logger(self.name)
        self._client = None
        self.logger.info("[OK] PolicyAgent initialized")

    def _get_client(self):
        if self._client is None and GEMINI_AVAILABLE:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if api_key:
                self._client = genai.Client(api_key=api_key)
        return self._client

    async def process_message(self, message: str) -> Dict[str, Any]:
        """
        Processes regulatory and policy-related queries.
        
        Args:
            message: User query about policies or regulations
            
        Returns:
            Response with policy information
        """
        try:
            # Validate input
            message = validate_string(message, "Message", min_length=3, max_length=1000)
            
            self.logger.debug(f"Processing policy query: {message[:50]}...")
            
            client = self._get_client()
            content = f"User Query: {message}"

            # Fallback response
            fallback_response = (
                "As the Policy Agent, I can help with pharmacy regulations:\n\n"
                "📋 **Key Points:**\n"
                "- Prescription drugs (Schedule H/H1) require valid Rx\n"
                "- Cold-chain items cannot be returned\n"
                "- OTC items: 7-day return policy on sealed packages\n"
                "- For medical advice, consult a registered doctor\n"
                "- Your health data is protected under privacy laws"
            )

            response_text = fallback_response

            if client and GEMINI_AVAILABLE:
                try:
                    self.logger.debug("Calling Gemini for policy response")
                    resp = client.models.generate_content(
                        model=GEMINI_MODEL_NAME,
                        contents=[genai_types.Content(
                            role="user",
                            parts=[genai_types.Part(text=content)]
                        )],
                        config=genai_types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            temperature=0.2,
                        ),
                    )
                    if resp.text and len(resp.text) > 10:
                        response_text = resp.text
                        self.logger.debug("Gemini response received")
                except Exception as e:
                    self.logger.warning(f"Gemini call failed: {e}")
            
            self.logger.info("Policy query processed successfully")
            return AgentResponse(
                status="success",
                message=response_text,
                data={
                    "response": response_text,
                    "intent": "policy_query",
                    "medicines_found": [],
                    "action_taken": "Routed to Policy & Regulatory Agent",
                    "welfare_eligible": False,
                    "agent_trace": ["Policy Agent triggered"]
                }
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error in process_message: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to process policy query.",
                error_code="POLICY_ERROR"
            ).to_dict()
    
    def get_return_policy(self) -> Dict[str, Any]:
        """
        Returns the AushadhiAI return and refund policy.
        
        Returns:
            Policy details with conditions
        """
        try:
            self.logger.debug("Fetching return policy")
            
            policy = {
                "name": "AushadhiAI Return & Refund Policy",
                "effective_from": "2025-01-01",
                "policies": [
                    {
                        "category": "Cold-Chain Items (Insulin, Vaccines, etc.)",
                        "return_period": "No Returns",
                        "reason": "Medical safety and efficacy requirements",
                        "refund": "Not Applicable"
                    },
                    {
                        "category": "OTC (Over-The-Counter) Items",
                        "return_period": "7 days",
                        "conditions": ["Sealed original packaging", "Receipt required", "No expiry in 6 months"],
                        "refund": "Full refund minus applicable taxes"
                    },
                    {
                        "category": "Prescription Medicines",
                        "return_period": "No Returns",
                        "reason": "Regulatory compliance",
                        "refund": "Not Applicable"
                    },
                    {
                        "category": "Damaged/Defective Items",
                        "return_period": "Immediate",
                        "conditions": ["Photo evidence required", "Report within 24 hours"],
                        "refund": "Full refund + ₹100 credit"
                    }
                ]
            }
            
            return AgentResponse(
                status="success",
                message="Return policy retrieved",
                data=policy
            ).to_dict()
            
        except Exception as e:
            self.logger.error(f"Error fetching return policy: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to retrieve return policy.",
                error_code="POLICY_ERROR"
            ).to_dict()
    
    def get_schedule_info(self, schedule: str) -> Dict[str, Any]:
        """
        Returns information about drug schedules in India.
        
        Args:
            schedule: Drug schedule (OTC, H, H1, X)
            
        Returns:
            Schedule information and requirements
        """
        try:
            schedule = validate_string(schedule, "Schedule", min_length=1, max_length=5)
            
            schedule_data = {
                "OTC": {
                    "name": "Over-The-Counter",
                    "description": "Available without prescription",
                    "examples": "Cold medicines, Pain relief, Antacids",
                    "requirements": "No prescription needed"
                },
                "H": {
                    "name": "Schedule H (Prescription Only)",
                    "description": "Requires prescription for purchase",
                    "examples": "Antibiotics, Anticonvulsants, Anticoagulants",
                    "requirements": "Valid prescription from registered doctor"
                },
                "H1": {
                    "name": "Schedule H1 (High Risk)",
                    "description": "Highly controlled, restricted distribution",
                    "examples": "Immunosuppressants, Antineoplastics",
                    "requirements": "Prescription + Hospital/Specialist verification"
                },
                "X": {
                    "name": "Schedule X (Narcotics)",
                    "description": "Strict narcotic controls",
                    "examples": "Morphine, Codeine, Amphetamines",
                    "requirements": "Controlled by DEA equivalent, special permits"
                }
            }
            
            if schedule not in schedule_data:
                return AgentResponse(
                    status="error",
                    message=f"Unknown schedule: {schedule}",
                    error_code="INVALID_SCHEDULE"
                ).to_dict()
            
            self.logger.info(f"Schedule info retrieved: {schedule}")
            return AgentResponse(
                status="success",
                message=f"Information for {schedule}",
                data=schedule_data[schedule]
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error getting schedule info: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to retrieve schedule information.",
                error_code="SCHEDULE_INFO_ERROR"
            ).to_dict()
