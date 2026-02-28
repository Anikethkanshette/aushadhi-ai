"""
Shared utilities for backend routes.
Provides standardized response handling, pagination, and error management.
"""

import logging
from typing import Any, Dict, List, Optional, TypeVar, Generic
from enum import Enum
from datetime import datetime
from functools import wraps
import json

from pydantic import BaseModel, Field, validator


# Setup logger
logger = logging.getLogger(__name__)


class ResponseStatus(str, Enum):
    """Standardized response status codes."""
    SUCCESS = "success"
    ERROR = "error"
    PARTIALLY_SUCCESS = "partial_success"
    INVALID_REQUEST = "invalid_request"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    SERVER_ERROR = "server_error"


class ResponseMetadata(BaseModel):
    """Metadata included in all responses."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    request_id: Optional[str] = None
    duration_ms: Optional[float] = None
    version: str = "2.0.0"


T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized API response format.
    All routes should return responses in this format.
    """
    status: ResponseStatus
    message: str
    data: Optional[T] = None
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    meta: ResponseMetadata = Field(default_factory=ResponseMetadata)
    
    class Config:
        use_enum_values = True


class PaginationParams(BaseModel):
    """Standard pagination parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$")
    
    @validator('page_size')
    def validate_page_size(cls, v):
        """Ensure page size is within limits."""
        if v > 100:
            return 100
        return v


class PaginatedResponse(BaseModel, Generic[T]):
    """Response model for paginated results."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
    
    @classmethod
    def create(cls, items: List[T], total: int, page: int, page_size: int):
        """Factory method to create paginated response."""
        total_pages = (total + page_size - 1) // page_size
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )


class ErrorResponse(BaseModel):
    """Standardized error response."""
    status: ResponseStatus = ResponseStatus.ERROR
    message: str
    error_code: str
    error_details: Optional[Dict[str, Any]] = None
    meta: ResponseMetadata = Field(default_factory=ResponseMetadata)
    
    class Config:
        use_enum_values = True


# Common Error Codes
class ErrorCode:
    """Standard error codes."""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    DATABASE_ERROR = "DATABASE_ERROR"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"


def create_success_response(
    message: str,
    data: Any = None,
    status: ResponseStatus = ResponseStatus.SUCCESS,
    request_id: Optional[str] = None,
) -> ApiResponse:
    """
    Create a standardized success response.
    
    Args:
        message: Response message
        data: Response data payload
        status: Response status (default: success)
        request_id: Optional request ID for tracking
        
    Returns:
        ApiResponse: Formatted response
    """
    meta = ResponseMetadata(request_id=request_id)
    return ApiResponse(
        status=status,
        message=message,
        data=data,
        meta=meta
    )


def create_error_response(
    message: str,
    error_code: str,
    status: ResponseStatus = ResponseStatus.ERROR,
    error_details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> ErrorResponse:
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        error_code: Machine-readable error code
        status: HTTP status indicator
        error_details: Additional error details
        request_id: Optional request ID for tracking
        
    Returns:
        ErrorResponse: Formatted error response
    """
    meta = ResponseMetadata(request_id=request_id)
    return ErrorResponse(
        status=status,
        message=message,
        error_code=error_code,
        error_details=error_details,
        meta=meta
    )


def handle_route_errors(func):
    """
    Decorator to handle common errors in routes.
    Catches exceptions and returns standardized error responses.
    
    Usage:
        @router.get("/items")
        @handle_route_errors
        async def get_items():
            return create_success_response("Items retrieved", data=[])
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            result = await func(*args, **kwargs)
            return result
        except ValueError as e:
            logger.warning(f"Validation error in {func.__name__}: {str(e)}")
            return create_error_response(
                message=str(e),
                error_code=ErrorCode.VALIDATION_ERROR,
                status=ResponseStatus.INVALID_REQUEST,
            )
        except KeyError as e:
            logger.warning(f"Missing key in {func.__name__}: {str(e)}")
            return create_error_response(
                message=f"Missing required field: {str(e)}",
                error_code=ErrorCode.VALIDATION_ERROR,
                status=ResponseStatus.INVALID_REQUEST,
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}", exc_info=True)
            return create_error_response(
                message="An internal server error occurred",
                error_code=ErrorCode.INTERNAL_ERROR,
                status=ResponseStatus.SERVER_ERROR,
                error_details={"original_error": str(e)} if logger.level == logging.DEBUG else None,
            )
    return wrapper


def validate_abha_id(abha_id: str) -> bool:
    """
    Validate ABHA ID format (12-4-4 format with hyphens).
    
    Args:
        abha_id: ABHA ID to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not abha_id or not isinstance(abha_id, str):
        return False
    
    parts = abha_id.split("-")
    if len(parts) != 3:
        return False
    
    return (
        len(parts[0]) == 4 and parts[0].isdigit() and
        len(parts[1]) == 4 and parts[1].isdigit() and
        len(parts[2]) == 4 and parts[2].isdigit()
    )


def validate_phone_number(phone: str) -> bool:
    """
    Validate Indian phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not phone or not isinstance(phone, str):
        return False
    
    clean_phone = phone.replace("-", "").replace(" ", "")
    return (
        clean_phone.isdigit() and
        (len(clean_phone) == 10 or (len(clean_phone) == 12 and clean_phone.startswith("91")))
    )


def validate_email(email: str) -> bool:
    """
    Basic email validation.
    
    Args:
        email: Email to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    return "@" in email and "." in email.split("@")[-1]


def validate_date_format(date_str: str, format: str = "%Y-%m-%d") -> bool:
    """
    Validate date string format.
    
    Args:
        date_str: Date string to validate
        format: Expected date format (default: YYYY-MM-DD)
        
    Returns:
        bool: True if valid, False otherwise
    """
    try:
        datetime.strptime(date_str, format)
        return True
    except (ValueError, TypeError):
        return False


def serialize_response(data: Any) -> Dict[str, Any]:
    """
    Serialize response data to JSON-compatible format.
    Handles Pydantic models, datetime, and other special types.
    
    Args:
        data: Data to serialize
        
    Returns:
        Dict: JSON-compatible dictionary
    """
    if isinstance(data, BaseModel):
        return data.dict()
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {k: serialize_response(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [serialize_response(item) for item in data]
    elif isinstance(data, Enum):
        return data.value
    else:
        return data


def log_event(
    event_name: str,
    event_type: str = "info",
    **kwargs
):
    """
    Log structured events with context.
    
    Args:
        event_name: Name of the event
        event_type: Type (info, warning, error, debug)
        **kwargs: Additional context fields
    """
    log_entry = {
        "event": event_name,
        "timestamp": datetime.utcnow().isoformat(),
        **kwargs
    }
    
    log_message = json.dumps(log_entry)
    
    if event_type == "warning":
        logger.warning(log_message)
    elif event_type == "error":
        logger.error(log_message)
    elif event_type == "debug":
        logger.debug(log_message)
    else:
        logger.info(log_message)


def calculate_pagination_offset(page: int, page_size: int) -> int:
    """
    Calculate offset for pagination.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        
    Returns:
        int: Offset for data retrieval
    """
    return (page - 1) * page_size


def mask_sensitive_data(data: Dict[str, Any], sensitive_fields: List[str]) -> Dict[str, Any]:
    """
    Mask sensitive data fields in a dictionary.
    
    Args:
        data: Dictionary containing potentially sensitive data
        sensitive_fields: List of field names to mask
        
    Returns:
        Dict: Dictionary with sensitive fields masked
    """
    masked_data = data.copy()
    for field in sensitive_fields:
        if field in masked_data and masked_data[field]:
            masked_data[field] = f"***{str(masked_data[field])[-3:]}"
    return masked_data
