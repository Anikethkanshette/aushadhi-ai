"""
Medicine endpoints for AushadhiAI backend.
Provides medicine search, lookup, inventory management, and alternatives.
"""

import logging
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional

from database import (
    load_medicines,
    search_medicines,
    get_medicine_by_id,
    update_medicine_stock,
    DatabaseError,
    DataNotFoundError
)
from models import Medicine, MedicineSearchResult
from backend_utils import (
    create_success_response,
    create_error_response,
    ErrorCode,
    ResponseStatus,
    handle_route_errors,
    log_event
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def list_medicines(
    search: Optional[str] = Query(None, min_length=1),
    category: Optional[str] = Query(None, min_length=1),
    prescription_required: Optional[bool] = Query(None),
):
    """
    List medicines with optional filtering.
    
    Query Parameters:
    - search: Search query for medicine name/generic name/category
    - category: Filter by medicine category
    - prescription_required: Filter by prescription requirement
    """
    try:
        medicines = load_medicines()
        
        if search:
            medicines = search_medicines(search)
        
        if category:
            medicines = [
                m for m in medicines
                if m.get("category", "").lower() == category.lower()
            ]
        
        if prescription_required is not None:
            medicines = [
                m for m in medicines
                if m.get("prescription_required") == prescription_required
            ]
        
        log_event(
            "medicines_listed",
            "info",
            count=len(medicines),
            filters={"search": search, "category": category}
        )
        
        return create_success_response(
            message=f"Retrieved {len(medicines)} medicines",
            data={
                "medicines": medicines,
                "total": len(medicines),
                "filters": {
                    "search": search,
                    "category": category,
                    "prescription_required": prescription_required
                }
            }
        )
    except DatabaseError as e:
        logger.error(f"Database error listing medicines: {e}")
        return create_error_response(
            message="Failed to retrieve medicines",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error listing medicines: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while retrieving medicines",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.get("/{medicine_id}", response_model=dict)
async def get_medicine(medicine_id: str):
    """
    Get medicine details by ID.
    
    Parameters:
    - medicine_id: Unique identifier of the medicine
    """
    if not medicine_id or not medicine_id.strip():
        return create_error_response(
            message="Medicine ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        medicine = get_medicine_by_id(medicine_id)
        
        if not medicine:
            logger.warning(f"Medicine not found: {medicine_id}")
            return create_error_response(
                message=f"Medicine '{medicine_id}' not found",
                error_code=ErrorCode.NOT_FOUND,
                status=ResponseStatus.NOT_FOUND,
            )
        
        log_event("medicine_retrieved", "info", medicine_id=medicine_id)
        
        return create_success_response(
            message="Medicine retrieved successfully",
            data={"medicine": medicine}
        )
    except DatabaseError as e:
        logger.error(f"Database error retrieving medicine {medicine_id}: {e}")
        return create_error_response(
            message="Failed to retrieve medicine",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error retrieving medicine {medicine_id}: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while retrieving medicine",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.patch("/{medicine_id}/inventory", response_model=dict)
async def update_inventory(medicine_id: str, quantity: int = Query(..., gt=0)):
    """
    Update medicine inventory stock.
    
    Parameters:
    - medicine_id: Unique identifier of the medicine
    - quantity: Quantity to add to stock
    """
    if not medicine_id or not medicine_id.strip():
        return create_error_response(
            message="Medicine ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    if quantity <= 0:
        return create_error_response(
            message="Quantity must be greater than 0",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        medicine = get_medicine_by_id(medicine_id)
        if not medicine:
            return create_error_response(
                message=f"Medicine '{medicine_id}' not found",
                error_code=ErrorCode.NOT_FOUND,
                status=ResponseStatus.NOT_FOUND,
            )
        
        # Negative quantity means deduction
        success = update_medicine_stock(medicine_id, -quantity)
        
        if not success:
            return create_error_response(
                message=f"Insufficient stock for medicine '{medicine_id}'",
                error_code=ErrorCode.RESOURCE_EXHAUSTED,
                status=ResponseStatus.CONFLICT,
            )
        
        updated_medicine = get_medicine_by_id(medicine_id)
        
        log_event(
            "inventory_updated",
            "info",
            medicine_id=medicine_id,
            quantity_change=quantity
        )
        
        return create_success_response(
            message="Stock updated successfully",
            data={"medicine": updated_medicine}
        )
    except DataNotFoundError as e:
        logger.warning(f"Medicine not found during update: {e}")
        return create_error_response(
            message=f"Medicine '{medicine_id}' not found",
            error_code=ErrorCode.NOT_FOUND,
            status=ResponseStatus.NOT_FOUND,
        )
    except DatabaseError as e:
        logger.error(f"Database error updating inventory: {e}")
        return create_error_response(
            message="Failed to update inventory",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error updating inventory: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while updating inventory",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )


@router.get("/search/alternatives/{medicine_name}", response_model=dict)
async def get_alternatives(medicine_name: str):
    """
    Get alternative medicines for a given medicine.
    
    Parameters:
    - medicine_name: Name of the medicine to find alternatives for
    """
    if not medicine_name or not medicine_name.strip():
        return create_error_response(
            message="Medicine name is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            status=ResponseStatus.INVALID_REQUEST,
        )
    
    try:
        medicines = load_medicines()
        query_lower = medicine_name.lower()
        
        # Find the medicine
        found = None
        for med in medicines:
            if (query_lower in med.get("name", "").lower() or
                query_lower in med.get("generic_name", "").lower()):
                found = med
                break
        
        if not found:
            log_event(
                "alternatives_not_found",
                "info",
                medicine_name=medicine_name
            )
            return create_success_response(
                message="No alternatives found",
                data={"alternatives": []}
            )
        
        # Find alternatives in same category
        alternatives = [
            m for m in medicines
            if m.get("category") == found.get("category") and m["id"] != found["id"]
        ][:5]  # Limit to 5 alternatives
        
        log_event(
            "alternatives_retrieved",
            "info",
            medicine_name=medicine_name,
            alternatives_count=len(alternatives)
        )
        
        return create_success_response(
            message=f"Found {len(alternatives)} alternative medicines",
            data={
                "original_medicine": found,
                "alternatives": alternatives,
                "total_alternatives": len(alternatives)
            }
        )
    except DatabaseError as e:
        logger.error(f"Database error retrieving alternatives: {e}")
        return create_error_response(
            message="Failed to retrieve alternatives",
            error_code=ErrorCode.DATABASE_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Error retrieving alternatives: {e}", exc_info=True)
        return create_error_response(
            message="An error occurred while retrieving alternatives",
            error_code=ErrorCode.INTERNAL_ERROR,
            status=ResponseStatus.SERVER_ERROR,
        )
