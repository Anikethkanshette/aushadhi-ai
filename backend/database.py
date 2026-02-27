import csv
import os
import json
from typing import List, Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

_medicines_cache: Optional[List[Dict]] = None
_orders_cache: Optional[List[Dict]] = None
_notifications_cache: Optional[List[Dict]] = None


def load_medicines() -> List[Dict]:
    global _medicines_cache
    if _medicines_cache is not None:
        return _medicines_cache

    filepath = os.path.join(DATA_DIR, "medicines.csv")
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        medicines = []
        for row in reader:
            row["stock_quantity"] = int(row["stock_quantity"])
            row["price"] = float(row["price"])
            row["min_stock_level"] = int(row["min_stock_level"])
            row["prescription_required"] = row["prescription_required"].lower() == "true"
            medicines.append(row)
    _medicines_cache = medicines
    return medicines


def load_orders() -> List[Dict]:
    global _orders_cache
    if _orders_cache is not None:
        return _orders_cache

    filepath = os.path.join(DATA_DIR, "order_history.csv")
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        orders = list(reader)
    _orders_cache = orders
    return orders


def save_order(order: Dict) -> None:
    global _orders_cache
    orders = load_orders()
    orders.append(order)
    _orders_cache = orders

    filepath = os.path.join(DATA_DIR, "order_history.csv")
    if orders:
        # Accumulate all possible keys deterministically
        fields_set = set()
        fieldnames = []
        for o in orders:
            for k in o.keys():
                if k not in fields_set:
                    fields_set.add(k)
                    fieldnames.append(k)
        
        # In case the new order has keys order doesn't have yet, add them explicitly
        for k in order.keys():
            if k not in fields_set:
                fields_set.add(k)
                fieldnames.append(k)

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(orders)


def update_medicine_stock(medicine_id: str, quantity_sold: int) -> bool:
    global _medicines_cache
    medicines = load_medicines()
    for med in medicines:
        if med["id"] == medicine_id:
            new_qty = med["stock_quantity"] - quantity_sold
            if new_qty < 0:
                return False
            med["stock_quantity"] = new_qty
            _medicines_cache = medicines
            return True
    return False


def search_medicines(query: str) -> List[Dict]:
    medicines = load_medicines()
    query_lower = query.lower()
    results = []
    for med in medicines:
        if (
            query_lower in med["name"].lower()
            or query_lower in med["generic_name"].lower()
            or query_lower in med["category"].lower()
        ):
            results.append(med)
    return results


def get_medicine_by_id(medicine_id: str) -> Optional[Dict]:
    medicines = load_medicines()
    for med in medicines:
        if med["id"] == medicine_id:
            return med
    return None


def get_patient_orders(patient_id: str = None, abha_id: str = None) -> List[Dict]:
    orders = load_orders()
    result = []
    for order in orders:
        if patient_id and order.get("patient_id") == patient_id:
            result.append(order)
        elif abha_id and order.get("abha_id") == abha_id:
            result.append(order)
    return result


def get_all_orders() -> List[Dict]:
    return load_orders()


def update_order_status(order_id: str, status: str) -> bool:
    global _orders_cache
    orders = load_orders()
    updated = False
    for order in orders:
        if order["order_id"] == order_id:
            order["status"] = status
            updated = True
            break
            
    if updated:
        _orders_cache = orders
        filepath = os.path.join(DATA_DIR, "order_history.csv")
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            if orders:
                writer = csv.DictWriter(f, fieldnames=orders[0].keys())
                writer.writeheader()
                writer.writerows(orders)
        return True
    return False


def load_notifications() -> List[Dict]:
    global _notifications_cache
    if _notifications_cache is not None:
        return _notifications_cache

    filepath = os.path.join(DATA_DIR, "notifications.json")
    if not os.path.exists(filepath):
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump([], f)
        _notifications_cache = []
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        try:
            notifs = json.load(f)
        except json.JSONDecodeError:
            notifs = []
    _notifications_cache = notifs
    return notifs


def save_notification(notification: Dict) -> None:
    global _notifications_cache
    notifs = load_notifications()
    notifs.append(notification)
    _notifications_cache = notifs

    filepath = os.path.join(DATA_DIR, "notifications.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(notifs, f, indent=2)


def get_patient_notifications(patient_id: str = None, abha_id: str = None) -> List[Dict]:
    notifs = load_notifications()
    result = []
    for n in notifs:
        if patient_id and n.get("patient_id") == patient_id:
            result.append(n)
        elif abha_id and n.get("abha_id") == abha_id:
            result.append(n)
    return sorted(result, key=lambda x: x["timestamp"], reverse=True)


def invalidate_cache():
    global _medicines_cache, _orders_cache, _notifications_cache
    _medicines_cache = None
    _orders_cache = None  
    _notifications_cache = None
    
