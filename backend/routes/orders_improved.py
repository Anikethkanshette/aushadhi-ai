"""
Improved order endpoints for AushadhiAI backend.
Handles order creation, retrieval, status updates with comprehensive validation and error handling.
"""

import logging
import uuid
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import date, timedelta

from database import (
    load_orders,
    save_order,
    get_patient_orders,
    get_all_orders,
    update_order_status as db_update_order_status,
    get_medicine_by_id,
    update_medicine_stock,
    DatabaseError,
    DataNotFoundError
)
from models import OrderCreate, Order
from ledger import ledger_db
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.welfare_agent import WelfareAgent
from agents.delivery_agent import DeliveryAgent
from backend_utils import (
    create_success_response,
    create_error_response,
    ErrorCode,
    ResponseStatus,
    log_event,
    validate_abha_id,
    PaginationParams
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize agents
rx_agent = PrescriptionAgent()
payment_agent = PaymentAgent()
welfare_agent = WelfareAgent()
delivery_agent = DeliveryAgent()


@router.post("/", response_model=dict)
async def create_order(order: OrderCreate):
    """
    Create a new order with validation, payment, and delivery scheduling.
    
    Workflow:
    1. Validate prescription via PrescriptionAgent
    2. Check medicine availability
    3. Calculate welfare discounts
    4. Process payment
    5. Schedule delivery
    6. Create transaction record
    """
    order_id = None
    tx_id = None
    
    try:
        # Input validation
        if not validate_abha_id(order.abha_id):
            return create_error_response(
                message="Invalid ABHA ID format",
                error_code=ErrorCode.VALIDATION_ERROR,
                status=ResponseStatus.INVALID_REQUEST,
            )
        
        if order.quantity <= 0 or order.quantity > 1000:
            return create_error_response(
                message="Quantity must be between 1 and 1000",
                error_code=ErrorCode.VALIDATION_ERROR,
                status=ResponseStatus.INVALID_REQUEST,
            )
        
        # Check medicine availability
        medicine = get_medicine_by_id(order.medicine_id)
        if not medicine:
            return create_error_response(
                message=f"Medicine '{order.medicine_id}' not found",
                error_code=ErrorCode.NOT_FOUND,
                status=ResponseStatus.NOT_FOUND,
            )
        
        if int(medicine.get("stock_quantity", 0)) < order.quantity:
            return create_error_response(
                message=f"Insufficient stock. Available: {medicine.get('stock_quantity', 0)} units",
                error_code=ErrorCode.RESOURCE_EXHAUSTED,
                status=ResponseStatus.CONFLICT,
                error_details={"available": medicine.get("stock_quantity", 0)}
            )
        
        # Validate prescription
        rx_res = rx_agent.validate_prescription(
            order.medicine_id,
            order.has_prescription,
            order.abha_id
        )
        if rx_res.get("status") == "rejected":
            log_event(
                "prescription_validation_failed",
                "warning",
                medicine_id=order.medicine_id,
                reason=rx_res.get("message", "Unknown")
            )
            return create_error_response(
                message=rx_res.get("message", "Prescription validation failed"),
                error_code=ErrorCode.VALIDATION_ERROR,
                status=ResponseStatus.INVALID_REQUEST,
            )
        
        # Calculate pricing & welfare
        base_amount = float(medicine.get("price", 0)) * order.quantity
        welfare_res = welfare_agent.check_eligibility(order.abha_id, base_amount)
        final_amount = welfare_res.get("final_amount", base_amount)
        
        # Create IDs
        order_id = f"ORD{str(uuid.uuid4())[:8].upper()}"
        tx_id = f"TXN-{str(uuid.uuid4())[:8].upper()}"
        
        # Begin transaction
        ledger_db.begin_transaction(tx_id, "CREATE_ORDER", {
            "order_id": order_id,
            "medicine_id": order.medicine_id,
            "quantity": order.quantity,
            "amount": final_amount
        })
        
        # Deduct stock
        try:
            success = update_medicine_stock(order.medicine_id, order.quantity)
            if not success:
                ledger_db.rollback(tx_id)
                return create_error_response(
                    message="Failed to update stock",
                    error_code=ErrorCode.RESOURCE_EXHAUSTED,
                    status=ResponseStatus.CONFLICT,
                )
            
            # Register compensating action
            ledger_db.add_compensating_action(
                tx_id,
                update_medicine_stock,
                order.medicine_id,
                -order.quantity
            )
        except DatabaseError as e:
            ledger_db.rollback(tx_id)
            logger.error(f"Stock update failed: {e}")
            return create_error_response(
                message="Failed to reserve stock",
                error_code=ErrorCode.DATABASE_ERROR,
                status=ResponseStatus.SERVER_ERROR,
            )
        
        # Process payment
        payment_res = payment_agent.process_payment(
            order.patient_id,
            final_amount,
            "UPI"
        )
        
        if not payment_res.get("success", False):
            ledger_db.rollback(tx_id)
            log_event(
                "payment_failed",
                "warning",
                order_id=order_id,
                reason=payment_res.get("message", "Unknown")
            )
            return create_error_response(
                message=f"Payment failed: {payment_res.get('message', 'Unknown error')}. Stock has been released.",
                error_code=ErrorCode.INVALID_REQUEST,
                status=ResponseStatus.INVALID_REQUEST,
            )
        
        # Commit transaction
        ledger_db.commit(tx_id)
        
        # Schedule delivery
        today = date.today()
        next_refill = today + timedelta(days=30)
        
        try:
            delivery_res = delivery_agent.schedule_delivery(order_id, "100001")
            delivery_status = delivery_res.get("status", "pending")
        except Exception as e:
            logger.warning(f"Delivery scheduling failed: {e}")
            delivery_status = "pending"
        
        # Save order
        new_order = {
            "order_id": order_id,
            "patient_id": order.patient_id,
            "patient_name": order.patient_name,
            "abha_id": order.abha_id,
            "medicine_id": order.medicine_id,
            "medicine_name": order.medicine_name,
            "quantity": order.quantity,
            "dosage_frequency": order.dosage_frequency,
            "purchase_date": today.isoformat(),
            "next_refill_date": next_refill.isoformat(),
            "total_amount": final_amount,
            "status": "confirmed",
            "welfare_applied": welfare_res.get("discount_percent", 0) > 0,
        }
        
        save_order(new_order)
        
        log_event(
            "order_created",
            "info",
            order_id=order_id,
            patient_id=order.patient_id,
            amount=final_amount
        )
        
        return create_success_response(
            message="Order created successfully",
            data={
                "order": new_order,
                "payment": {"status": "success", "amount": final_amount},
                "delivery": {"status": delivery_status},
                "welfare": {
                    "eligible": welfare_res.get("eligible", False),
                    "discount_percent": welfare_res.get("discount_percent", 0)
                }
            }
        )
    except DatabaseError as e:
        if tx_id:
            try:
                ledger_db.rollback(tx_id)
            except:
                pass
        logger.error(f"Database error creating order: {e}")
        return create_error_response(
            message="Failed to create order",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        if tx_id:
            try:
                ledger_db.rollback(tx_id)
            except:
                pass
        logger.error(f"Error creating order: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while creating the order",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.get("/{order_id}", response_model=dict)
async def get_order(order_id: str):
    """
    Get order details by order ID.
    """
    if not order_id or not order_id.strip():
        return create_error_response(
            message="Order ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        orders = get_all_orders()
        order = next((o for o in orders if o.get("order_id") == order_id), None)
        
        if not order:
            return create_error_response(
                message=f"Order '{order_id}' not found",
                error_code=ErrorCode.NOT_FOUND,
                status=ResponseStatus.NOT_FOUND,
            )
        
        log_event("order_retrieved", "info", order_id=order_id)
        
        return create_success_response(
            message="Order retrieved successfully",
            data={"order": order}
        )
    except DatabaseError as e:
        logger.error(f"Database error retrieving order: {e}")
        return create_error_response(
            message="Failed to retrieve order",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error retrieving order: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while retrieving the order",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.get("/patient/{patient_id}", response_model=dict)
async def get_patient_orders_endpoint(
    patient_id: str,
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get all orders for a patient.
    """
    if not patient_id or not patient_id.strip():
        return create_error_response(
            message="Patient ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        orders = get_patient_orders(patient_id=patient_id)
        orders = orders[:limit]
        
        log_event(
            "patient_orders_retrieved",
            "info",
            patient_id=patient_id,
            count=len(orders)
        )
        
        return create_success_response(
            message=f"Retrieved {len(orders)} orders",
            data={
                "orders": orders,
                "total": len(orders),
                "patient_id": patient_id
            }
        )
    except DatabaseError as e:
        logger.error(f"Database error retrieving patient orders: {e}")
        return create_error_response(
            message="Failed to retrieve orders",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error retrieving patient orders: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while retrieving orders",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.patch("/{order_id}/status", response_model=dict)
async def update_order_status(
    order_id: str,
    status: str = Query(..., regex="^(pending|confirmed|processing|shipped|delivered|cancelled|failed)$")
):
    """
    Update order status.
    
    Valid statuses: pending, confirmed, processing, shipped, delivered, cancelled, failed
    """
    if not order_id or not order_id.strip():
        return create_error_response(
            message="Order ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        success = db_update_order_status(order_id, status)
        
        if not success:
            return create_error_response(
                message=f"Order '{order_id}' not found",
                error_code=ErrorCode.NOT_FOUND,
                status=ResponseStatus.NOT_FOUND,
            )
        
        orders = get_all_orders()
        updated_order = next((o for o in orders if o.get("order_id") == order_id), None)
        
        log_event(
            "order_status_updated",
            "info",
            order_id=order_id,
            new_status=status
        )
        
        return create_success_response(
            message=f"Order status updated to '{status}'",
            data={"order": updated_order}
        )
    except DatabaseError as e:
        logger.error(f"Database error updating order status: {e}")
        return create_error_response(
            message="Failed to update order status",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error updating order status: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while updating order status",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
