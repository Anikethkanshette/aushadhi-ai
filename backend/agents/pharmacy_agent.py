import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler as LangfuseCallbackHandler
    LANGFUSE_AVAILABLE = True
    langfuse = Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY", "demo-public-key"),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY", "demo-secret-key"),
        host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
    )
except Exception:
    LANGFUSE_AVAILABLE = False
    langfuse = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain.tools import tool
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.messages import HumanMessage, AIMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

from database import search_medicines, get_medicine_by_id, get_patient_orders, load_medicines


def build_langchain_agent():
    if not LANGCHAIN_AVAILABLE:
        return None

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    @tool
    def search_medicine_tool(query: str) -> str:
        """Search for a medicine by name, generic name, or category. Returns available medicines with stock and price info."""
        results = search_medicines(query)
        if not results:
            return f"No medicines found for '{query}'. Please check the spelling or try a generic name."
        out = []
        for med in results[:5]:
            status = "In Stock" if med["stock_quantity"] > 0 else "Out of Stock"
            rx = "Prescription Required" if med["prescription_required"] else "OTC (No Prescription)"
        out.append(
            f"- {med['name']} | ₹{med['price']} | {status} ({med['stock_quantity']} units) | {rx}"
        )
        return "\n".join(out)

    @tool
    def check_stock_tool(medicine_id: str) -> str:
        """Check stock availability for a specific medicine by its ID (e.g., M001)."""
        med = get_medicine_by_id(medicine_id)
        if not med:
            return f"Medicine with ID '{medicine_id}' not found."
        if med["stock_quantity"] == 0:
            return f"{med['name']} is currently OUT OF STOCK."
        elif med["stock_quantity"] < med["min_stock_level"]:
            return f"{med['name']} is LOW STOCK: only {med['stock_quantity']} units available. Price: ₹{med['price']}"
        return f"{med['name']} is available: {med['stock_quantity']} units at ₹{med['price']} per {med['unit']}."

    @tool
    def check_prescription_tool(medicine_id: str) -> str:
        """Check if a medicine requires a prescription before dispensing."""
        med = get_medicine_by_id(medicine_id)
        if not med:
            return f"Medicine '{medicine_id}' not found."
        if med["prescription_required"]:
            return f"PRESCRIPTION REQUIRED: {med['name']} is a Schedule H drug. Please provide a valid prescription."
        return f"NO PRESCRIPTION NEEDED: {med['name']} is an OTC medicine."

    @tool
    def get_patient_history_tool(patient_id: str) -> str:
        """Retrieve order and medication history for a patient by patient ID (e.g., P001)."""
        orders = get_patient_orders(patient_id=patient_id)
        if not orders:
            return f"No order history found for patient {patient_id}."
        recent = orders[-5:]
        lines = [f"Recent orders for {patient_id}:"]
        for o in recent:
            lines.append(f"- {o['medicine_name']} x{o['quantity']} on {o['purchase_date']}")
        return "\n".join(lines)

    @tool
    def suggest_alternatives_tool(medicine_name: str) -> str:
        """Suggest generic or alternative medicines when a specific medicine is unavailable or too expensive."""
        medicines = load_medicines()
        query_lower = medicine_name.lower()
        found = None
        for med in medicines:
            if query_lower in med["name"].lower() or query_lower in med["generic_name"].lower():
                found = med
                break
        if not found:
            return f"Could not find alternatives for '{medicine_name}'."
        alternatives = [
            m for m in medicines
            if m["category"] == found["category"] and m["id"] != found["id"] and m["stock_quantity"] > 0
        ][:3]
        if not alternatives:
            return f"No alternatives available for {found['name']} in category {found['category']}."
        out = [f"Alternatives for {found['name']}:"]
        for alt in alternatives:
            out.append(f"- {alt['name']} ({alt['generic_name']}) | ₹{alt['price']}")
        return "\n".join(out)

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.3,
    )

    tools = [
        search_medicine_tool,
        check_stock_tool,
        check_prescription_tool,
        get_patient_history_tool,
        suggest_alternatives_tool,
    ]

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are AushadhiAI, an expert AI pharmacist assistant for Indian patients. You help patients:
- Find medicines and check availability
- Understand dosage and usage instructions
- Identify if a prescription is required
- Suggest affordable generic alternatives
- Check their medication history
- Navigate the pharmacy ordering process

Always respond in a friendly, professional manner. If a medicine requires a prescription, always ask for it.
For chronic condition patients, proactively remind about refills. Respond in the patient's preferred language (English or Hindi).
Always prioritize patient safety."""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)
    return executor


class PharmacyAgent:
    def __init__(self):
        self.executor = build_langchain_agent()
        self.chat_history = []

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
        intent = None

        # Langfuse trace
        langfuse_trace = None
        if LANGFUSE_AVAILABLE and langfuse:
            try:
                langfuse_trace = langfuse.trace(
                    name="pharmacy-agent-chat",
                    user_id=patient_id or abha_id or "anonymous",
                    input={"message": message, "language": language},
                )
                trace.append("Langfuse trace started")
            except Exception as e:
                trace.append(f"Langfuse trace failed: {e}")

        # Intent detection
        msg_lower = message.lower()
        if any(k in msg_lower for k in ["buy", "order", "need", "want", "get", "purchase"]):
            intent = "purchase"
        elif any(k in msg_lower for k in ["available", "stock", "have"]):
            intent = "availability_check"
        elif any(k in msg_lower for k in ["alternative", "substitute", "generic", "cheap"]):
            intent = "alternatives"
        elif any(k in msg_lower for k in ["history", "previous", "past order"]):
            intent = "history"
        elif any(k in msg_lower for k in ["prescription", "rx"]):
            intent = "prescription_info"
        else:
            intent = "general_inquiry"

        trace.append(f"Intent detected: {intent}")

        # Run LangChain agent if available
        if self.executor:
            try:
                callbacks = []
                if LANGFUSE_AVAILABLE:
                    try:
                        lf_handler = LangfuseCallbackHandler()
                        callbacks.append(lf_handler)
                    except Exception:
                        pass

                result = self.executor.invoke(
                    {
                        "input": message,
                        "chat_history": self.chat_history[-6:],
                    },
                    config={"callbacks": callbacks},
                )
                response = result.get("output", "I'm here to help with your pharmacy needs.")
                self.chat_history.append(HumanMessage(content=message))
                self.chat_history.append(AIMessage(content=response))
                trace.append("LangChain agent executed successfully")

                # Quick medicine scan from response
                all_meds = load_medicines()
                for med in all_meds:
                    if med["name"].lower() in response.lower():
                        medicines_found.append({
                            "id": med["id"],
                            "name": med["name"],
                            "price": med["price"],
                            "available": med["stock_quantity"] > 0,
                            "prescription_required": med["prescription_required"],
                        })

                action_taken = "Agent query processed"
                if langfuse_trace:
                    try:
                        langfuse_trace.update(output={"response": response})
                    except Exception:
                        pass

            except Exception as e:
                trace.append(f"LangChain error: {str(e)}")
                response = self._fallback_response(message, intent, has_prescription)
        else:
            trace.append("Using rule-based fallback (API key not configured)")
            response = self._fallback_response(message, intent, has_prescription)

        # Welfare eligibility simulation
        eligible_abha = ["1234-5678-9012", "2345-6789-0123", "3456-7890-1234"]
        welfare_eligible = abha_id in eligible_abha if abha_id else False
        if welfare_eligible:
            response += "\n\n💊 You are eligible for PMJAY (Ayushman Bharat) discount. 20% discount will be applied!"

        return {
            "response": response,
            "intent": intent,
            "medicines_found": medicines_found[:5],
            "action_taken": action_taken,
            "welfare_eligible": welfare_eligible,
            "agent_trace": trace,
        }

    def _fallback_response(self, message: str, intent: str, has_prescription: bool) -> str:
        msg_lower = message.lower()

        # Search for mentioned medicines
        all_meds = load_medicines()
        found_meds = []
        for med in all_meds:
            if med["name"].lower() in msg_lower or med["generic_name"].lower() in msg_lower:
                found_meds.append(med)

        if found_meds:
            med = found_meds[0]
            if med["prescription_required"] and not has_prescription:
                return (
                    f"⚕️ **{med['name']}** requires a valid prescription (Schedule H drug). "
                    f"Please upload your prescription to proceed. "
                    f"Price: ₹{med['price']} | Stock: {med['stock_quantity']} units available."
                )
            status = "✅ Available" if med["stock_quantity"] > 0 else "❌ Out of Stock"
            return (
                f"💊 **{med['name']}** ({med['generic_name']})\n"
                f"Category: {med['category']} | Price: ₹{med['price']}\n"
                f"Status: {status} | {med['stock_quantity']} units\n"
                f"{'OTC - No prescription needed' if not med['prescription_required'] else 'Prescription required'}"
            )

        if intent == "purchase":
            results = search_medicines(message.split()[-1] if message.split() else message)
            if results:
                med = results[0]
                return f"I found **{med['name']}** at ₹{med['price']}. Would you like to order it?"

        return (
            "👋 Hello! I'm AushadhiAI, your AI pharmacist. I can help you:\n"
            "• Search for medicines and check availability\n"
            "• Verify prescription requirements\n"
            "• Find affordable generic alternatives\n"
            "• Place medicine orders\n\n"
            "Please tell me which medicine you're looking for!"
        )
