import os
import json
import re
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Langfuse (Observability) ──────────────────────────────────────────────────
try:
    from langfuse import Langfuse
    langfuse = Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
        host=os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
    )
    LANGFUSE_AVAILABLE = bool(os.getenv("LANGFUSE_PUBLIC_KEY")) and bool(os.getenv("LANGFUSE_SECRET_KEY"))
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
from agents.stock_agent import StockCheckAgent
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.delivery_agent import DeliveryAgent
from agents.welfare_agent import WelfareAgent


# ── Sub-Agents Instances ──────────────────────────────────────────────────────
stock_agent = StockCheckAgent()
rx_agent = PrescriptionAgent()
payment_agent = PaymentAgent()
delivery_agent = DeliveryAgent()
welfare_agent = WelfareAgent()

# ── Tool implementations (Delegates to Sub-Agents) ────────────────────────────

def _search_medicine(query: str) -> str:
    res = stock_agent.check_inventory(query)
    if res["status"] == "error":
        return res["message"]
    if res["status"] == "no_results":
        return res["message"]
    matches = res.get("data", {}).get("matches", [])
    if not matches:
        return "No matching medicines found."
    
    lines = []
    for med in matches:
        status = "In Stock" if med["in_stock"] else "Out of Stock"
        rx = "Prescription Required" if med["prescription_required"] else "OTC"
        lines.append(f"- {med['name']} | ₹{med['price']} | {status} ({med['quantity_available']} units) | {rx}")
    return "\n".join(lines)


def _check_stock(medicine_id: str) -> str:
    res = stock_agent.check_specific_item(medicine_id)
    if res["status"] == "error":
        return res["message"]
    data = res.get("data", {})
    
    if not data.get("in_stock", False):
        return f"{data.get('name', medicine_id)} is OUT OF STOCK."
    
    qty = data.get("quantity_available", 0)
    min_stock = data.get("min_stock_level", 0)
    price = data.get("price", 0)
    name = data.get("name", medicine_id)
    if qty < min_stock:
        return f"{name} is LOW STOCK: {qty} units at ₹{price}."
    return f"{name}: {qty} units available at ₹{price}."


def _check_prescription(medicine_id: str, abha_id: str = "anonymous", has_rx: bool = False) -> str:
    res = rx_agent.validate_prescription(medicine_id, has_rx, abha_id)
    if res["status"] == "error":
        return res["message"]
    if res["status"] == "rejected":
        return res["message"]
    
    data = res.get("data", {})
    medicine_name = data.get("medicine_name", medicine_id)
    if data.get("prescription_required", False):
        return f"PRESCRIPTION VALIDATED: {medicine_name} approved for dispensing."
    return f"NO PRESCRIPTION NEEDED: {medicine_name} is available OTC."


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


def _estimate_delivery(zip_code: str) -> str:
    res = delivery_agent.schedule_delivery("ESTIMATE", zip_code)
    if res["status"] == "error":
        return res["message"]
    return f"{res['message']} (Courier: {res['courier']})"

def _check_welfare(abha_id: str, amount: float) -> str:
    res = welfare_agent.check_eligibility(abha_id, amount)
    data = res.get("data", {})
    if data.get("is_eligible", False):
        return f"Eligible for 20% discount (saves ₹{data.get('discount_amount', 0)}). Final cart: ₹{data.get('final_amount', amount)}."
    return "Not eligible for automatic welfare discounts."


def _resolve_medicine(query: str):
    q = str(query or "").strip().lower()
    if not q:
        return None
    meds = load_medicines()
    exact = next(
        (
            m
            for m in meds
            if q == str(m.get("id", "")).lower()
            or q == str(m.get("name", "")).lower()
            or q == str(m.get("generic_name", "")).lower()
        ),
        None,
    )
    if exact:
        return exact
    return next(
        (
            m
            for m in meds
            if q in str(m.get("name", "")).lower() or q in str(m.get("generic_name", "")).lower()
        ),
        None,
    )

# Dispatch table
TOOL_FN = {
    "search_medicine": _search_medicine,
    "check_stock": _check_stock,
    "check_prescription": _check_prescription,
    "get_patient_history": _get_patient_history,
    "suggest_alternatives": _suggest_alternatives,
    "estimate_delivery": _estimate_delivery,
    "check_welfare": _check_welfare,
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
        genai_types.FunctionDeclaration(
            name="estimate_delivery",
            description="Estimate delivery dates using DeliveryAgent. Use this when the user asks when their order will arrive.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={"zip_code": genai_types.Schema(type=genai_types.Type.STRING, description="Delivery Zip Code")},
                required=["zip_code"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="check_welfare",
            description="Check PMJAY welfare eligibility using WelfareAgent.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "amount": genai_types.Schema(type=genai_types.Type.NUMBER, description="Order amount")
                },
                required=["abha_id", "amount"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="place_order",
            description="Place a medicine order for the logged-in patient after stock and prescription checks.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "medicine_query": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine name, generic name, or medicine ID"),
                    "quantity": genai_types.Schema(type=genai_types.Type.INTEGER, description="Requested quantity"),
                    "dosage_frequency": genai_types.Schema(type=genai_types.Type.STRING, description="Dosage instructions, e.g. twice daily"),
                },
                required=["medicine_query"],
            ),
        ),
    ]) if GEMINI_AVAILABLE else None
]

SYSTEM_PROMPT = """You are AushadhiAI's central ConversationAgent (Orchestrator). 
You delegate tasks to specialized sub-agents: 
- Use StockCheckAgent tools for inventory.
- Use PrescriptionAgent tools for Rx checks.
- Use DeliveryAgent for shipping estimates.
- Use WelfareAgent for PMJAY checks.
 - Use WelfareAgent for PMJAY checks.
 - Use place_order tool when the user asks to buy/order/purchase medicine and has provided enough details.
Always be friendly and professional. If a medicine is prescription-only, ask for Rx before proceeding.
Respond concisely. Use ₹ for Indian Rupee prices."""

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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

    def _place_order_from_chat(
        self,
        medicine_query: str,
        quantity: int,
        dosage_frequency: str,
        patient_id: Optional[str],
        patient_name: Optional[str],
        abha_id: Optional[str],
        has_prescription: bool,
    ) -> str:
        if not patient_id or not abha_id:
            return "Please login with your ABHA account before placing an order through AI Pharmacist."

        med = _resolve_medicine(medicine_query)
        if not med:
            return f"I couldn't find '{medicine_query}' in inventory. Please share the exact medicine name."

        try:
            qty = int(quantity) if quantity is not None else 1
        except Exception:
            qty = 1
        if qty < 1:
            qty = 1

        try:
            from models import OrderCreate
            from routes.orders import create_order

            payload = OrderCreate(
                patient_id=patient_id,
                patient_name=patient_name or patient_id,
                abha_id=abha_id,
                medicine_id=str(med.get("id")),
                medicine_name=str(med.get("name")),
                quantity=qty,
                dosage_frequency=dosage_frequency or "As directed",
                has_prescription=bool(has_prescription),
            )
            result = create_order(payload)
            order = result.get("data", {}).get("order", {})
            order_id = order.get("order_id", "")
            amount = order.get("total_amount", "")
            delivery = result.get("data", {}).get("delivery", {})
            eta = delivery.get("estimated_delivery", "")
            return (
                f"Order placed successfully. Order ID: {order_id}. "
                f"Medicine: {order.get('medicine_name', med.get('name'))} x{order.get('quantity', qty)}. "
                f"Total: ₹{amount}. "
                f"Estimated delivery: {eta}."
            )
        except Exception as e:
            return f"Unable to place order right now: {str(e)}"

    def _infer_order_request(self, message: str):
        text = str(message or "")
        lower = text.lower()

        qty_match = re.search(r"\b(\d{1,3})\s*(x|units?|tablets?|capsules?)?\b", lower)
        quantity = int(qty_match.group(1)) if qty_match else 1

        matched = None
        for med in load_medicines():
            name = str(med.get("name", "")).lower()
            generic = str(med.get("generic_name", "")).lower()
            if name and name in lower:
                matched = med
                break
            if generic and generic in lower:
                matched = med
                break

        if matched:
            return {
                "medicine_query": matched.get("name"),
                "quantity": quantity,
                "dosage_frequency": "As directed",
            }
        return None

    async def process_message(
        self,
        message: str,
        patient_id: Optional[str] = None,
        patient_name: Optional[str] = None,
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

        if intent == "purchase":
            inferred_order = self._infer_order_request(message)
            if inferred_order:
                trace.append("Direct order inference for purchase intent")
                order_result = self._place_order_from_chat(
                    medicine_query=inferred_order["medicine_query"],
                    quantity=inferred_order["quantity"],
                    dosage_frequency=inferred_order["dosage_frequency"],
                    patient_id=patient_id,
                    patient_name=patient_name,
                    abha_id=abha_id,
                    has_prescription=has_prescription,
                )
                if order_result.startswith("Order placed successfully"):
                    med = _resolve_medicine(inferred_order["medicine_query"])
                    if med:
                        medicines_found.append({
                            "id": med["id"],
                            "name": med["name"],
                            "price": med["price"],
                            "available": int(med["stock_quantity"]) > 0,
                            "prescription_required": med["prescription_required"],
                        })
                    return {
                        "response": order_result,
                        "intent": intent,
                        "medicines_found": medicines_found[:5],
                        "action_taken": "AI pharmacist order placement",
                        "welfare_eligible": bool(abha_id),
                        "agent_trace": trace,
                    }
                trace.append("Direct order inference failed, falling back to agent response")

        # Langfuse trace
        lf_root_span = None
        if LANGFUSE_AVAILABLE and langfuse:
            try:
                lf_root_span = langfuse.start_span(
                    name="aushadhi-agent",
                    input={"message": message, "intent": intent, "language": language},
                    metadata={
                        "abha_id": abha_id,
                        "patient_id": patient_id,
                        "user_id": patient_id or abha_id or "anonymous",
                        "has_prescription": has_prescription,
                    },
                )
                trace.append("Langfuse span started")
            except Exception as e:
                trace.append(f"Langfuse span error: {e}")

        # ── Gemini agent with function calling ──────────────────────────────
        client = self._get_client()
        response_text = None

        if client and GEMINI_AVAILABLE:
            try:
                if lf_root_span:
                    lf_root_span.update(metadata={"gemini_model": GEMINI_MODEL_NAME, "phase": "gemini_call_started"})

                contents = [genai_types.Content(role="user", parts=[genai_types.Part(text=message)])]
                tool_calls_made = []

                for _ in range(5):  # max 5 agentic turns
                    resp = client.models.generate_content(
                        model=GEMINI_MODEL_NAME,
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
                        if tool_name == "check_prescription":
                            tool_args.setdefault("abha_id", abha_id or "anonymous")
                            tool_args.setdefault("has_rx", bool(has_prescription))
                        if tool_name == "place_order":
                            result = self._place_order_from_chat(
                                medicine_query=tool_args.get("medicine_query", ""),
                                quantity=tool_args.get("quantity", 1),
                                dosage_frequency=tool_args.get("dosage_frequency", "As directed"),
                                patient_id=patient_id,
                                patient_name=patient_name,
                                abha_id=abha_id,
                                has_prescription=has_prescription,
                            )
                        else:
                            result = TOOL_FN.get(tool_name, lambda **k: "Tool not found")(**tool_args)
                        tool_calls_made.append(f"{tool_name}({tool_args}) → {result[:80]}")
                        trace.append(f"Tool: {tool_name}")
                        tool_results.append(genai_types.Part(
                            function_response=genai_types.FunctionResponse(name=tool_name, response={"result": result})
                        ))
                    contents.append(genai_types.Content(role="user", parts=tool_results))

                if lf_root_span:
                    lf_root_span.update(output={"response": response_text, "tools_used": tool_calls_made})

                action_taken = f"Gemini agent: {len(tool_calls_made)} tool(s) called"
                trace.append(f"Gemini responded after {len(tool_calls_made)} tool call(s)")

            except Exception as e:
                trace.append(f"Gemini error: {e}")
                response_text = None
        else:
            if not GEMINI_AVAILABLE:
                trace.append("Gemini unavailable: google-genai import failed")
            elif not client:
                trace.append("Gemini unavailable: missing GEMINI_API_KEY/GOOGLE_API_KEY")

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

        if lf_root_span:
            try:
                lf_root_span.update(output={"response": response_text, "welfare": welfare_eligible})
                lf_root_span.end()
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
