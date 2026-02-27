import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Langfuse (Observability) ──────────────────────────────────────────────────
try:
    from langfuse import Langfuse
    langfuse = Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
        host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
    )
    LANGFUSE_AVAILABLE = bool(os.getenv("LANGFUSE_PUBLIC_KEY"))
except Exception:
    langfuse = None
    LANGFUSE_AVAILABLE = False

# ── Google Gemini (Direct API) ────────────────────────────────────────────────
try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from database import search_medicines, get_medicine_by_id, get_patient_orders, load_medicines
from agents.policy_agent import PolicyAgent


# ── Tool implementations ──────────────────────────────────────────────────────

def _search_medicine(query: str) -> str:
    results = search_medicines(query)
    if not results:
        return f"No medicines found for '{query}'."
    lines = []
    for med in results[:5]:
        status = "In Stock" if int(med["stock_quantity"]) > 0 else "Out of Stock"
        rx = "Prescription Required" if med["prescription_required"] else "OTC"
        lines.append(f"- {med['name']} | ₹{med['price']} | {status} ({med['stock_quantity']} units) | {rx}")
    return "\n".join(lines)


def _check_stock(medicine_id: str) -> str:
    med = get_medicine_by_id(medicine_id)
    if not med:
        return f"Medicine ID '{medicine_id}' not found."
    qty = int(med["stock_quantity"])
    if qty == 0:
        return f"{med['name']} is OUT OF STOCK."
    if qty < int(med["min_stock_level"]):
        return f"{med['name']} is LOW STOCK: {qty} units at ₹{med['price']}."
    return f"{med['name']}: {qty} units available at ₹{med['price']} per {med['unit']}."


def _check_prescription(medicine_id: str) -> str:
    med = get_medicine_by_id(medicine_id)
    if not med:
        return f"Medicine '{medicine_id}' not found."
    if med["prescription_required"]:
        return f"PRESCRIPTION REQUIRED: {med['name']} is a regulated drug. Please upload a valid prescription."
    return f"NO PRESCRIPTION NEEDED: {med['name']} is available OTC."


def _get_patient_history(patient_id: str) -> str:
    orders = get_patient_orders(patient_id=patient_id)
    if not orders:
        return f"No order history for patient {patient_id}."
    lines = [f"Recent orders for {patient_id}:"]
    for o in orders[-5:]:
        lines.append(f"- {o['medicine_name']} x{o['quantity']} on {o['purchase_date']}")
    return "\n".join(lines)


def _suggest_alternatives(medicine_name: str) -> str:
    medicines = load_medicines()
    q = medicine_name.lower()
    found = next((m for m in medicines if q in m["name"].lower() or q in m["generic_name"].lower()), None)
    if not found:
        return f"Could not find alternatives for '{medicine_name}'."
    alts = [m for m in medicines if m["category"] == found["category"] and m["id"] != found["id"] and int(m["stock_quantity"]) > 0][:3]
    if not alts:
        return f"No alternatives in stock for {found['name']}."
    lines = [f"Alternatives for {found['name']}:"]
    for a in alts:
        lines.append(f"- {a['name']} ({a['generic_name']}) | ₹{a['price']}")
    return "\n".join(lines)


# Dispatch table
TOOL_FN = {
    "search_medicine": _search_medicine,
    "check_stock": _check_stock,
    "check_prescription": _check_prescription,
    "get_patient_history": _get_patient_history,
    "suggest_alternatives": _suggest_alternatives,
}

# Gemini tool declarations
GEMINI_TOOLS = [
    genai_types.Tool(function_declarations=[
        genai_types.FunctionDeclaration(
            name="search_medicine",
            description="Search medicines by name, generic name, or category.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"query": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine name or category")},
                required=["query"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="check_stock",
            description="Check stock availability for a medicine by its ID.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"medicine_id": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine ID e.g. 202006")},
                required=["medicine_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="check_prescription",
            description="Check if a medicine requires a prescription.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"medicine_id": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine ID")},
                required=["medicine_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="get_patient_history",
            description="Get recent order history for a patient.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"patient_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ID e.g. PAT004")},
                required=["patient_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="suggest_alternatives",
            description="Suggest alternative or generic medicines.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"medicine_name": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine name")},
                required=["medicine_name"],
            ),
        ),
    ]) if GEMINI_AVAILABLE else None
]

SYSTEM_PROMPT = """You are AushadhiAI, an expert AI pharmacist for patients. Help with:
- Finding medicines and checking availability
- Prescription requirement checks
- Suggesting affordable generic alternatives
- Medication history review
Always be friendly and professional. If a medicine is prescription-only, ask for Rx before proceeding.
Respond concisely. Use ₹ for Indian Rupee prices."""


class PharmacyAgent:
    def __init__(self):
        self._client = None
        self._policy_agent = PolicyAgent()

    def _get_client(self):
        if self._client is None and GEMINI_AVAILABLE:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if api_key:
                self._client = genai.Client(api_key=api_key)
        return self._client

    async def process_message(
        self,
        message: str,
        patient_id: Optional[str] = None,
        abha_id: Optional[str] = None,
        language: str = "en-IN",
        has_prescription: bool = False,
    ) -> dict:
        trace = []
        medicines_found = []
        action_taken = None

        # Detect intent
        msg_lower = message.lower()
        if any(k in msg_lower for k in ["policy", "return", "refund", "legal", "limit", "interaction", "rule", "law"]):
            intent = "regulatory_policy"
        elif any(k in msg_lower for k in ["buy", "order", "need", "want", "get", "purchase"]):
            intent = "purchase"
        elif any(k in msg_lower for k in ["available", "stock", "have"]):
            intent = "availability_check"
        elif any(k in msg_lower for k in ["alternative", "substitute", "generic", "cheap"]):
            intent = "alternatives"
        elif any(k in msg_lower for k in ["history", "previous", "past order"]):
            intent = "history"
        else:
            intent = "general_inquiry"
        trace.append(f"Intent: {intent}")

        # Agent Router
        if intent == "regulatory_policy":
            trace.append("Routing to PolicyAgent")
            return await self._policy_agent.process_message(message)

        # Langfuse trace
        lf_trace = None
        lf_span = None
        if LANGFUSE_AVAILABLE and langfuse:
            try:
                lf_trace = langfuse.trace(
                    name="aushadhi-agent",
                    user_id=patient_id or abha_id or "anonymous",
                    input={"message": message, "intent": intent, "language": language},
                    metadata={"abha_id": abha_id, "has_prescription": has_prescription},
                )
                trace.append("Langfuse trace started")
            except Exception as e:
                trace.append(f"Langfuse trace error: {e}")

        # ── Gemini agent with function calling ──────────────────────────────
        client = self._get_client()
        response_text = None

        if client and GEMINI_AVAILABLE:
            try:
                if lf_trace:
                    lf_span = lf_trace.span(name="gemini-call", input={"message": message})

                contents = [genai_types.Content(role="user", parts=[genai_types.Part(text=message)])]
                tool_calls_made = []

                for _ in range(5):  # max 5 agentic turns
                    resp = client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=contents,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            tools=GEMINI_TOOLS,
                            temperature=0.3,
                        ),
                    )

                    candidate = resp.candidates[0]
                    # Check for function calls
                    fn_calls = [p for p in candidate.content.parts if hasattr(p, "function_call") and p.function_call]

                    if not fn_calls:
                        # Final text response
                        response_text = candidate.content.parts[0].text
                        break

                    # Execute each tool call
                    contents.append(genai_types.Content(role="model", parts=candidate.content.parts))
                    tool_results = []
                    for part in fn_calls:
                        fn = part.function_call
                        tool_name = fn.name
                        tool_args = dict(fn.args) if fn.args else {}
                        result = TOOL_FN.get(tool_name, lambda **k: "Tool not found")(**tool_args)
                        tool_calls_made.append(f"{tool_name}({tool_args}) → {result[:80]}")
                        trace.append(f"Tool: {tool_name}")
                        tool_results.append(genai_types.Part(
                            function_response=genai_types.FunctionResponse(name=tool_name, response={"result": result})
                        ))
                    contents.append(genai_types.Content(role="user", parts=tool_results))

                if lf_span:
                    lf_span.end(output={"response": response_text, "tools_used": tool_calls_made})

                action_taken = f"Gemini agent: {len(tool_calls_made)} tool(s) called"
                trace.append(f"Gemini responded after {len(tool_calls_made)} tool call(s)")

            except Exception as e:
                trace.append(f"Gemini error: {e}")
                response_text = None

        # ── Rule-based fallback ──────────────────────────────────────────────
        if not response_text:
            response_text = self._fallback_response(message, intent, has_prescription)
            action_taken = "Rule-based fallback"
            trace.append("Using rule-based fallback")

        # Scan response for medicine mentions
        for med in load_medicines():
            if med["name"].lower() in response_text.lower():
                medicines_found.append({
                    "id": med["id"], "name": med["name"], "price": med["price"],
                    "available": int(med["stock_quantity"]) > 0,
                    "prescription_required": med["prescription_required"],
                })

        # Welfare eligibility
        eligible_abha = {"1234-5678-9012", "2345-6789-0123", "3456-7890-1234",
                         "2002-0002-0002", "2004-0004-0004", "2006-0006-0006"}
        welfare_eligible = abha_id in eligible_abha if abha_id else False
        if welfare_eligible:
            response_text += "\n\n💊 **PMJAY Benefit:** You qualify for 20% discount on this order!"

        if lf_trace:
            try:
                lf_trace.update(output={"response": response_text, "welfare": welfare_eligible})
            except Exception:
                pass

        return {
            "response": response_text,
            "intent": intent,
            "medicines_found": medicines_found[:5],
            "action_taken": action_taken,
            "welfare_eligible": welfare_eligible,
            "agent_trace": trace,
        }

    def _fallback_response(self, message: str, intent: str, has_prescription: bool) -> str:
        msg_lower = message.lower()
        all_meds = load_medicines()
        for med in all_meds:
            if med["name"].lower() in msg_lower or med["generic_name"].lower() in msg_lower:
                if med["prescription_required"] and not has_prescription:
                    return (f"⚕️ **{med['name']}** requires a valid prescription.\n"
                            f"Price: ₹{med['price']} | Stock: {med['stock_quantity']} units\n"
                            f"Please upload your prescription to proceed.")
                status = "✅ In Stock" if int(med["stock_quantity"]) > 0 else "❌ Out of Stock"
                return (f"💊 **{med['name']}** ({med['generic_name']})\n"
                        f"Category: {med['category']} | Price: ₹{med['price']}\n"
                        f"Status: {status} | {med['stock_quantity']} units available\n"
                        f"{'OTC – No prescription needed' if not med['prescription_required'] else 'Prescription required'}")

        return ("👋 I'm AushadhiAI, your AI Pharmacist!\n\n"
                "I can help you:\n• Search medicines & check availability\n"
                "• Verify prescription requirements\n• Find generic alternatives\n"
                "• Place orders\n\nWhat medicine are you looking for?")
