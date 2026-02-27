import csv
import os
from typing import List, Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

_medicines_cache: Optional[List[Dict]] = None
_orders_cache: Optional[List[Dict]] = None


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
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=orders[0].keys())
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


def invalidate_cache():
    global _medicines_cache, _orders_cache
    _medicines_cache = None
    _orders_cache = None  
    
