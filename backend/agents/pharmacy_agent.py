import os
import json
import re
from typing import Optional
from datetime import datetime
import uuid
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

from database import (
    search_medicines,
    get_medicine_by_id,
    get_patient_orders,
    load_medicines,
    load_orders,
    get_patient_notifications,
    mark_notification_read,
    mark_all_notifications_read,
)
from agents.policy_agent import PolicyAgent
from agents.stock_agent import StockCheckAgent
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.delivery_agent import DeliveryAgent
from agents.welfare_agent import WelfareAgent
from config import get_settings


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


def _get_patient_history(patient_id: Optional[str] = None, abha_id: Optional[str] = None) -> str:
    orders = get_patient_orders(patient_id=patient_id, abha_id=abha_id)
    if not orders:
        if abha_id:
            return "No order history found for your account yet."
        return "No order history found for this patient yet."

    label = abha_id or patient_id or "your account"
    lines = [f"Recent orders for {label}:"]
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


def _list_patient_orders(abha_id: Optional[str] = None, patient_id: Optional[str] = None, status: Optional[str] = None, limit: int = 5) -> str:
    if not abha_id and not patient_id:
        return "Unable to identify your account. Please login again from dashboard."

    orders = get_patient_orders(abha_id=abha_id, patient_id=patient_id)
    if status:
        status_value = str(status).lower()
        orders = [o for o in orders if str(o.get("status", "")).lower() == status_value]

    if not orders:
        return "No matching orders found."

    try:
        max_items = max(1, min(int(limit), 10))
    except Exception:
        max_items = 5

    orders_sorted = sorted(
        orders,
        key=lambda x: f"{x.get('purchase_date', '')}-{x.get('order_id', '')}",
        reverse=True,
    )[:max_items]

    lines = [f"Showing {len(orders_sorted)} recent order(s):"]
    for order in orders_sorted:
        lines.append(
            f"- {order.get('order_id')} | {order.get('medicine_name')} x{order.get('quantity')} | "
            f"Status: {order.get('status')} | Amount: ₹{order.get('total_amount')}"
        )
    return "\n".join(lines)


def _get_order_status(order_id: str, abha_id: Optional[str] = None) -> str:
    if not order_id:
        return "Please share the order ID."

    order = next((o for o in load_orders() if str(o.get("order_id")) == str(order_id)), None)
    if not order:
        return f"Order {order_id} not found."

    if abha_id and str(order.get("abha_id")) != str(abha_id):
        return "This order does not belong to your account."

    return (
        f"Order {order.get('order_id')} status: {order.get('status')}. "
        f"Medicine: {order.get('medicine_name')} x{order.get('quantity')}. "
        f"Purchased on {order.get('purchase_date')}"
    )


def _cancel_patient_order(order_id: str, abha_id: str, reason: str = "Cancelled via AI chat") -> str:
    if not order_id:
        return "Please share the order ID to cancel."
    if not abha_id:
        return "Please login with ABHA account before cancelling orders."

    try:
        from routes.orders import cancel_order

        result = cancel_order(order_id, {"abha_id": abha_id, "reason": reason})
        refund = (result or {}).get("data", {}).get("refund", {})
        return (
            f"Order {order_id} cancelled successfully. "
            f"Refund {refund.get('refund_id', '')} of ₹{refund.get('amount', 0)} is {refund.get('status', 'processed')}."
        )
    except Exception as e:
        return f"Unable to cancel order right now: {str(e)}"


def _list_notifications(abha_id: str, unread_only: bool = False, limit: int = 5) -> str:
    if not abha_id:
        return "Please share your ABHA ID to fetch notifications."

    notifications = get_patient_notifications(abha_id=abha_id)
    if unread_only:
        notifications = [n for n in notifications if not bool(n.get("read", False))]

    if not notifications:
        return "No notifications found."

    try:
        max_items = max(1, min(int(limit), 10))
    except Exception:
        max_items = 5

    picked = notifications[:max_items]
    lines = [f"Showing {len(picked)} notification(s):"]
    for notif in picked:
        title = notif.get("subject") or notif.get("type") or "Notification"
        body = notif.get("message") or notif.get("enhanced") or ""
        status = "read" if notif.get("read") else "unread"
        lines.append(f"- {notif.get('id')} | {title} | {status} | {str(body)[:80]}")
    return "\n".join(lines)


def _mark_notification_state(notification_id: str, abha_id: str, read: bool = True) -> str:
    if not notification_id:
        return "Please provide a notification ID."
    if not abha_id:
        return "Please login with ABHA account first."

    updated = mark_notification_read(notification_id, read=bool(read), abha_id=abha_id)
    if not updated:
        return "Notification not found for your account."
    return f"Notification {notification_id} marked as {'read' if read else 'unread'}."


def _mark_all_notifications(abha_id: str) -> str:
    if not abha_id:
        return "Please login with ABHA account first."
    updated_count = mark_all_notifications_read(abha_id=abha_id)
    return f"Marked {updated_count} notification(s) as read."


def _auto_refill_file_path() -> str:
    settings = get_settings()
    return os.path.join(settings.DATA_DIR, "auto_refill_subscriptions.json")


def _load_auto_refill_subscriptions() -> list:
    path = _auto_refill_file_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_auto_refill_subscriptions(items: list) -> None:
    path = _auto_refill_file_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)


def _subscribe_auto_refill(abha_id: str, medicine_name: str, quantity: int = 1, channels: Optional[list] = None) -> str:
    if not abha_id:
        return "Please login with ABHA account first."
    if not medicine_name:
        return "Please share the medicine name for auto refill."

    allowed_channels = [
        c for c in [str(ch).lower() for ch in (channels or ["whatsapp", "email", "sms"])]
        if c in {"whatsapp", "email", "sms"}
    ]
    if not allowed_channels:
        allowed_channels = ["whatsapp", "email", "sms"]

    subscriptions = _load_auto_refill_subscriptions()
    existing = next(
        (
            s for s in subscriptions
            if str(s.get("abha_id")) == str(abha_id)
            and str(s.get("medicine_name", "")).lower() == medicine_name.lower()
            and bool(s.get("active", True))
        ),
        None,
    )
    if existing:
        return (
            f"Auto refill already active for {existing.get('medicine_name')} "
            f"(subscription {existing.get('subscription_id')})."
        )

    try:
        qty = max(1, int(quantity or 1))
    except Exception:
        qty = 1

    subscription = {
        "subscription_id": f"AR-{uuid.uuid4().hex[:8].upper()}",
        "abha_id": abha_id,
        "medicine_name": medicine_name,
        "quantity": qty,
        "channels": allowed_channels,
        "active": True,
        "created_at": datetime.now().isoformat(),
    }
    subscriptions.append(subscription)
    _save_auto_refill_subscriptions(subscriptions)

    return (
        f"Auto refill enabled for {medicine_name} x{qty}. "
        f"Subscription ID: {subscription['subscription_id']}. "
        f"Confirmations via {', '.join(allowed_channels)}."
    )


def _list_auto_refill_subscriptions(abha_id: str) -> str:
    if not abha_id:
        return "Please login with ABHA account first."
    subscriptions = _load_auto_refill_subscriptions()
    plans = [s for s in subscriptions if str(s.get("abha_id")) == str(abha_id) and bool(s.get("active", True))]
    plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    if not plans:
        return "You have no active auto refill subscriptions."

    lines = [f"You have {len(plans)} active auto refill subscription(s):"]
    for plan in plans[:10]:
        lines.append(
            f"- {plan.get('subscription_id')} | {plan.get('medicine_name')} x{plan.get('quantity')} | "
            f"Channels: {', '.join(plan.get('channels', []))}"
        )
    return "\n".join(lines)


def _cancel_auto_refill_subscription(abha_id: str, subscription_id: str) -> str:
    if not abha_id:
        return "Please login with ABHA account first."
    if not subscription_id:
        return "Please provide a subscription ID."

    subscriptions = _load_auto_refill_subscriptions()
    updated = False
    for item in subscriptions:
        if str(item.get("subscription_id")) == str(subscription_id) and str(item.get("abha_id")) == str(abha_id):
            item["active"] = False
            item["cancelled_at"] = datetime.now().isoformat()
            updated = True
            break

    if not updated:
        return "Auto refill subscription not found."

    _save_auto_refill_subscriptions(subscriptions)
    return f"Auto refill subscription {subscription_id} cancelled successfully."


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
    "list_patient_orders": _list_patient_orders,
    "get_order_status": _get_order_status,
    "cancel_order": _cancel_patient_order,
    "list_notifications": _list_notifications,
    "mark_notification_read": _mark_notification_state,
    "mark_all_notifications_read": _mark_all_notifications,
    "subscribe_auto_refill": _subscribe_auto_refill,
    "list_auto_refill_subscriptions": _list_auto_refill_subscriptions,
    "cancel_auto_refill_subscription": _cancel_auto_refill_subscription,
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
                properties={
                    "patient_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ID e.g. PAT004"),
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                },
                required=[],
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
        genai_types.FunctionDeclaration(
            name="list_patient_orders",
            description="List recent patient orders by ABHA ID. Use this when user asks for order history, recent orders, or past purchases.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "patient_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ID"),
                    "status": genai_types.Schema(type=genai_types.Type.STRING, description="Optional status filter"),
                    "limit": genai_types.Schema(type=genai_types.Type.INTEGER, description="Max items to show"),
                },
                required=[],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="get_order_status",
            description="Get status for a specific order ID.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "order_id": genai_types.Schema(type=genai_types.Type.STRING, description="Order ID"),
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID for ownership check"),
                },
                required=["order_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="cancel_order",
            description="Cancel a patient order and process refund.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "order_id": genai_types.Schema(type=genai_types.Type.STRING, description="Order ID to cancel"),
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "reason": genai_types.Schema(type=genai_types.Type.STRING, description="Cancellation reason"),
                },
                required=["order_id", "abha_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="list_notifications",
            description="List patient notifications and unread messages.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "unread_only": genai_types.Schema(type=genai_types.Type.BOOLEAN, description="Only unread notifications"),
                    "limit": genai_types.Schema(type=genai_types.Type.INTEGER, description="Max items to show"),
                },
                required=["abha_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="mark_notification_read",
            description="Mark one notification as read or unread.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "notification_id": genai_types.Schema(type=genai_types.Type.STRING, description="Notification ID"),
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "read": genai_types.Schema(type=genai_types.Type.BOOLEAN, description="True for read, false for unread"),
                },
                required=["notification_id", "abha_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="mark_all_notifications_read",
            description="Mark all notifications as read for a patient.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                },
                required=["abha_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="subscribe_auto_refill",
            description="Enable auto refill subscription for a medicine with confirmation channels.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "medicine_name": genai_types.Schema(type=genai_types.Type.STRING, description="Medicine name"),
                    "quantity": genai_types.Schema(type=genai_types.Type.INTEGER, description="Quantity per refill"),
                    "channels": genai_types.Schema(
                        type=genai_types.Type.ARRAY,
                        items=genai_types.Schema(type=genai_types.Type.STRING),
                        description="Confirmation channels: whatsapp/email/sms",
                    ),
                },
                required=["abha_id", "medicine_name"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="list_auto_refill_subscriptions",
            description="List all active auto refill subscriptions for a patient.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                },
                required=["abha_id"],
            ),
        ),
        genai_types.FunctionDeclaration(
            name="cancel_auto_refill_subscription",
            description="Cancel an active auto refill subscription.",
            parameters=genai_types.Schema(
                type=genai_types.Type.OBJECT,
                properties={
                    "abha_id": genai_types.Schema(type=genai_types.Type.STRING, description="Patient ABHA ID"),
                    "subscription_id": genai_types.Schema(type=genai_types.Type.STRING, description="Subscription ID"),
                },
                required=["abha_id", "subscription_id"],
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
You can also manage patient dashboard operations via tools: order history/status/cancel, notifications, and auto-refill subscriptions.
When the user asks to perform an action, execute the relevant tool directly.
Ask for confirmation before cancellation actions if the user has not explicitly confirmed.
Always be friendly and professional. If a medicine is prescription-only, ask for Rx before proceeding.
Respond concisely. Use ₹ for Indian Rupee prices."""

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

class PharmacyAgent:
    def __init__(self):
        self._client = None
        self._policy_agent = PolicyAgent()

    def _handle_dashboard_command(self, message: str, abha_id: Optional[str]) -> Optional[str]:
        text = str(message or "")
        lower = text.lower()

        if any(k in lower for k in ["order history", "my orders", "recent orders"]):
            return _list_patient_orders(abha_id=abha_id or "", limit=5)

        if "order status" in lower:
            match = re.search(r"\b(ord[\w-]{3,})\b", text, re.IGNORECASE)
            if not match:
                return "Please share your order ID to check status."
            return _get_order_status(order_id=match.group(1), abha_id=abha_id)

        if "cancel order" in lower:
            match = re.search(r"\b(ord[\w-]{3,})\b", text, re.IGNORECASE)
            if not match:
                return "Please share the order ID to cancel."
            return _cancel_patient_order(order_id=match.group(1), abha_id=abha_id or "")

        if "mark all" in lower and "notification" in lower and "read" in lower:
            return _mark_all_notifications(abha_id=abha_id or "")

        if "unread" in lower and "notification" in lower:
            return _list_notifications(abha_id=abha_id or "", unread_only=True, limit=8)

        if "notification" in lower:
            return _list_notifications(abha_id=abha_id or "", unread_only=False, limit=8)

        if "list auto refill" in lower or "show auto refill" in lower:
            return _list_auto_refill_subscriptions(abha_id=abha_id or "")

        if "cancel auto refill" in lower:
            match = re.search(r"\b(ar-[\w]+)\b", text, re.IGNORECASE)
            if not match:
                return "Please share the auto-refill subscription ID (for example AR-AB12CD34)."
            return _cancel_auto_refill_subscription(abha_id=abha_id or "", subscription_id=match.group(1).upper())

        if ("auto refill" in lower or "autorefill" in lower) and any(k in lower for k in ["enable", "start", "subscribe"]):
            med_match = re.search(r"(?:for|of)\s+([a-z0-9\-\s]{3,})", lower)
            medicine_name = med_match.group(1).strip() if med_match else ""
            if not medicine_name:
                return "Tell me the medicine name to enable auto refill, for example: enable auto refill for metformin."
            qty_match = re.search(r"\b(\d{1,3})\b", lower)
            quantity = int(qty_match.group(1)) if qty_match else 1
            return _subscribe_auto_refill(abha_id=abha_id or "", medicine_name=medicine_name, quantity=quantity)

        return None

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

        dashboard_action = self._handle_dashboard_command(message=message, abha_id=abha_id)
        if dashboard_action:
            trace.append("Executed deterministic dashboard command")
            return {
                "response": dashboard_action,
                "intent": intent,
                "medicines_found": medicines_found[:5],
                "action_taken": "Dashboard command execution",
                "welfare_eligible": bool(abha_id),
                "agent_trace": trace,
            }

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
                        if tool_name == "get_patient_history":
                            tool_args.setdefault("patient_id", patient_id or "")
                            tool_args.setdefault("abha_id", abha_id or "")
                        if tool_name in {
                            "list_patient_orders",
                            "list_notifications",
                            "mark_all_notifications_read",
                            "list_auto_refill_subscriptions",
                        }:
                            tool_args.setdefault("abha_id", abha_id or "")
                            tool_args.setdefault("patient_id", patient_id or "")
                        if tool_name in {
                            "cancel_order",
                            "mark_notification_read",
                            "subscribe_auto_refill",
                            "cancel_auto_refill_subscription",
                            "get_order_status",
                        }:
                            tool_args.setdefault("abha_id", abha_id or "")
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

        if "order history" in msg_lower or "recent order" in msg_lower:
            return "I can fetch your recent orders. Please share your ABHA ID if not already linked."
        if "cancel order" in msg_lower:
            return "Please share the order ID and confirm cancellation, and I will cancel it for you."
        if "notification" in msg_lower:
            return "I can list your notifications and mark them as read. Say: show unread notifications."
        if "auto refill" in msg_lower and any(k in msg_lower for k in ["cancel", "stop", "disable"]):
            return "Please share your auto-refill subscription ID and I will cancel it immediately."
        if "auto refill" in msg_lower:
            return "I can enable auto-refill for any medicine. Tell me medicine name and quantity."

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
