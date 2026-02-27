from database import load_orders, load_medicines
from datetime import date, datetime, timedelta
from typing import List, Dict


def compute_refill_alerts(days_threshold: int = 7) -> List[Dict]:
    """
    Analyze order history and compute proactive refill alerts.
    Returns alerts for patients whose medicines are due within days_threshold.
    """
    orders = load_orders()
    today = date.today()
    alerts = []
    seen = set()

    for order in orders:
        key = f"{order['patient_id']}-{order['medicine_id']}"
        if key in seen:
            continue
        seen.add(key)

        try:
            next_refill = datetime.strptime(order["next_refill_date"], "%Y-%m-%d").date()
            days_until = (next_refill - today).days

            if days_until <= days_threshold:
                if days_until <= 2:
                    urgency = "CRITICAL"
                elif days_until <= 5:
                    urgency = "HIGH"
                else:
                    urgency = "MEDIUM"

                alerts.append({
                    "patient_id": order["patient_id"],
                    "patient_name": order["patient_name"],
                    "abha_id": order.get("abha_id", ""),
                    "medicine_id": order["medicine_id"],
                    "medicine_name": order["medicine_name"],
                    "last_purchase_date": order["purchase_date"],
                    "next_refill_date": order["next_refill_date"],
                    "days_until_refill": days_until,
                    "urgency": urgency,
                    "recommendation": _get_recommendation(days_until, order["medicine_name"]),
                })
        except ValueError:
            continue

    alerts.sort(key=lambda x: x["days_until_refill"])
    return alerts


def _get_recommendation(days_until: int, medicine_name: str) -> str:
    if days_until <= 0:
        return f"⚠️ OVERDUE: {medicine_name} refill is overdue! Order immediately to avoid missing doses."
    elif days_until <= 2:
        return f"🚨 URGENT: Only {days_until} day(s) left. Order {medicine_name} today!"
    elif days_until <= 5:
        return f"⚡ SOON: {medicine_name} refill needed in {days_until} days. Order this week."
    return f"📅 REMINDER: {medicine_name} refill due in {days_until} days."


def predict_next_refill(patient_id: str, medicine_id: str) -> Dict:
    """
    Predict the next refill date based on historical order patterns.
    """
    orders = load_orders()
    patient_orders = [
        o for o in orders
        if o["patient_id"] == patient_id and o["medicine_id"] == medicine_id
    ]

    if not patient_orders:
        return {"predicted_refill_date": None, "confidence": 0, "pattern": "No history"}

    if len(patient_orders) >= 2:
        dates = []
        for o in patient_orders:
            try:
                dates.append(datetime.strptime(o["purchase_date"], "%Y-%m-%d").date())
            except ValueError:
                pass

        if len(dates) >= 2:
            dates.sort()
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = sum(intervals) / len(intervals)
            last_purchase = dates[-1]
            predicted = last_purchase + timedelta(days=int(avg_interval))
            return {
                "predicted_refill_date": str(predicted),
                "confidence": min(90, 60 + len(dates) * 10),
                "pattern": f"Refills every ~{int(avg_interval)} days",
            }

    last = patient_orders[-1]
    return {
        "predicted_refill_date": last.get("next_refill_date"),
        "confidence": 50,
        "pattern": "Single order - using stated refill date",
    }
