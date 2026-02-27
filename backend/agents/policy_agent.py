import os
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


SYSTEM_PROMPT = """You are the AushadhiAI Policy & Regulatory Agent.
Your sole responsibility is to answer queries regarding:
1. Pharmacy laws in India (Drugs and Cosmetics Act, Schedule H, H1, X).
2. AushadhiAI Return & Refund Policies (No returns on cold-chain items like Insulin, 7-day return on sealed OTC items).
3. Drug-Drug Interactions and Contraindications.
4. Maximum dispensing limits and prescription validity (e.g. valid for 6 months).

Rules for your responses:
- Be highly professional, authoritative, but easy for a patient or pharmacist to understand.
- Use bullet points where appropriate.
- ALWAYS cite that you are providing general guidance and they should consult a registered medical practitioner for medical emergencies.
- Do NOT help them search for stock or place orders. If they ask to buy, tell them to ask the main Pharmacy Agent instead.
"""

class PolicyAgent:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None and GEMINI_AVAILABLE:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if api_key:
                self._client = genai.Client(api_key=api_key)
        return self._client

    async def process_message(self, message: str) -> dict:
        client = self._get_client()
        content = f"User Query: {message}"

        fallback_response = "As the Policy Agent, I can confirm that prescription drugs (Schedule H/H1) require a valid Rx. Certain items (like cold-chain drugs) cannot be returned. Please consult your doctor for specific medical advice."

        response_text = fallback_response

        if client and GEMINI_AVAILABLE:
            try:
                resp = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=content)])],
                    config=genai_types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.2,
                    ),
                )
                if resp.text:
                    response_text = resp.text
            except Exception as e:
                print(f"PolicyAgent error: {e}")

        return {
            "response": response_text,
            "intent": "policy_query",
            "medicines_found": [],
            "action_taken": "Routed to Policy & Regulatory Agent",
            "welfare_eligible": False,
            "agent_trace": ["Policy Agent triggered"]
        }
