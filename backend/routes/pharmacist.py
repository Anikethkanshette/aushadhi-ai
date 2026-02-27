from fastapi import APIRouter, HTTPException, Depends
from models import PharmacistLogin
from database import get_all_orders, load_medicines, update_order_status
from agents.notification_agent import NotificationAgent
from datetime import date
import os

try:
    from google import genai
except ImportError:
    genai = None

router = APIRouter(prefix="/pharmacist", tags=["Pharmacist"])
notification_agent = NotificationAgent()

@router.post("/login")
def pharmacist_login(credentials: PharmacistLogin):
    if credentials.username == "admin" and credentials.password == "admin":
        return {"access_token": "fake-pharmacist-jwt-token", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid pharmacist credentials")

@router.get("/stats")
def get_dashboard_stats():
    orders = get_all_orders()
    medicines = load_medicines()
    
    pending_orders = [o for o in orders if o["status"].lower() == "pending"]
    low_stock = [m for m in medicines if int(m["stock_quantity"]) < int(m["min_stock_level"])]
    
    total_revenue = sum(float(o["total_amount"]) for o in orders if o["status"].lower() == "completed")
    
    return {
        "total_orders": len(orders),
        "pending_orders": len(pending_orders),
        "total_medicines": len(medicines),
        "low_stock_items": len(low_stock),
        "total_revenue": total_revenue
    }

@router.get("/orders")
def get_pharmacist_orders():
    orders = get_all_orders()
    # Return newest first
    return {"orders": sorted(orders, key=lambda x: x["purchase_date"], reverse=True)}

@router.put("/orders/{order_id}/status")
def update_status(order_id: str, status: str):
    valid_statuses = ["pending", "approved", "fulfilled", "rejected", "completed"]
    if status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    success = update_order_status(order_id, status.lower())
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Trigger Notification Agent if order is fulfilled or approved
    if status.lower() in ["fulfilled", "completed", "approved"]:
        orders = get_all_orders()
        order = next((o for o in orders if o["order_id"] == order_id), None)
        if order:
            event_type = f"Order {status.capitalize()}"
            notif_copy = notification_agent.generate_and_dispatch(
                patient_id=order["patient_id"],
                abha_id=order["abha_id"],
                patient_name=order["patient_name"],
                event_type=event_type,
                details={"medicine_name": order["medicine_name"], "order_id": order_id}
            )
            return {"message": "Status updated successfully", "generated_notifications": notif_copy}

    return {"message": "Status updated successfully"}

@router.get("/inventory")
def get_inventory():
    medicines = load_medicines()
    return {"medicines": medicines}


@router.post("/generate-po")
def generate_purchase_order():
    medicines = load_medicines()
    low_stock = [m for m in medicines if int(m["stock_quantity"]) < int(m["min_stock_level"])]
    
    if not low_stock:
        return {"po_draft": "All inventory levels are optimal. No restock needed."}
        
    po_items = []
    for m in low_stock:
        suggested_order = int(m["min_stock_level"]) * 2 - int(m["stock_quantity"])
        po_items.append(f"- {m['name']} (ID: {m['id']}), Current: {m['stock_quantity']}, Suggest Ordering: {suggested_order}")
        
    items_text = "\n".join(po_items)
    
    if genai:
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            prompt = f"""
            You are drafting a formal Purchase Order (PO) to a pharmaceutical distributor (PharmaCorp India).
            Today's Date is {date.today()}.
            
            The pharmacy 'AushadhiAI Clinic' has the following low stock items that need immediate replenishment:
            {items_text}
            
            Please write a professional, well-formatted Purchase Order email/document.
            Include a table or list of the items, a request for delivery timelines, and standard PO formalities.
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return {"po_draft": response.text}
        except Exception as e:
            print("Gemini PO Error:", e)

    fallback_po = (
        f"PURCHASE ORDER\n"
        f"Date: {date.today()}\n"
        f"To: PharmaCorp India\n\n"
        f"Please supply the following items:\n{items_text}\n\n"
        f"Requested Delivery: ASAP"
    )
    return {"po_draft": fallback_po}
