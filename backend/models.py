"""
Pydantic models for AushadhiAI backend.
Defines request/response schemas with comprehensive validation.
"""

from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# Enums
class PaymentMethod(str, Enum):
    """Supported payment methods."""
    UPI = "UPI"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"
    WALLET = "WALLET"


class OrderStatus(str, Enum):
    """Order status values."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"


class NotificationChannel(str, Enum):
    """Supported notification channels."""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationType(str, Enum):
    """Notification types for UI rendering."""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


# Medicine Models
class Medicine(BaseModel):
    """Medicine details."""
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    generic_name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    stock_quantity: int = Field(..., ge=0)
    unit: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    prescription_required: bool
    min_stock_level: int = Field(..., ge=0)
    supplier: str = Field(..., min_length=1)
    
    class Config:
        schema_extra = {
            "example": {
                "id": "MED001",
                "name": "Aspirin",
                "generic_name": "Acetylsalicylic Acid",
                "category": "Painkiller",
                "stock_quantity": 100,
                "unit": "tablets",
                "price": 10.0,
                "prescription_required": False,
                "min_stock_level": 10,
                "supplier": "XYZ Pharmaceuticals"
            }
        }
    
    @validator('stock_quantity')
    def validate_stock(cls, v):
        """Validate stock quantity is non-negative."""
        if v < 0:
            raise ValueError('Stock quantity cannot be negative')
        return v
    
    @validator('price')
    def validate_price(cls, v):
        """Validate price is positive."""
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v


class MedicineSearchResult(BaseModel):
    """Medicine search result with alternatives."""
    medicine: Medicine
    available: bool
    alternatives: List[str] = []


# Order Models
class OrderCreate(BaseModel):
    """Create order request."""
    patient_id: str = Field(..., min_length=1)
    patient_name: str = Field(..., min_length=1)
    abha_id: str = Field(..., min_length=1)
    medicine_id: str = Field(..., min_length=1)
    medicine_name: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1, le=1000)
    dosage_frequency: str = Field(..., min_length=1)
    has_prescription: bool = False
    prescription_file_name: Optional[str] = None
    prescription_scan_summary: Optional[str] = None
    prescription_verified: bool = False
    prescription_record_id: Optional[str] = None
    prescription_valid_until: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "patient_id": "PAT001",
                "patient_name": "John Doe",
                "abha_id": "1234-5678-9012",
                "medicine_id": "MED001",
                "medicine_name": "Aspirin",
                "quantity": 10,
                "dosage_frequency": "2 tablets daily",
                "has_prescription": False,
                "prescription_file_name": "rx_2026_02_28.jpg",
                "prescription_scan_summary": "Matched: Aspirin 500mg",
                "prescription_verified": True
            }
        }
    
    @validator('quantity')
    def validate_quantity(cls, v):
        """Validate quantity is within reasonable limits."""
        if v < 1 or v > 1000:
            raise ValueError('Quantity must be between 1 and 1000')
        return v


class Order(BaseModel):
    """Complete order details."""
    order_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    patient_name: str = Field(..., min_length=1)
    abha_id: str = Field(..., min_length=1)
    medicine_id: str = Field(..., min_length=1)
    medicine_name: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1)
    dosage_frequency: str = Field(..., min_length=1)
    purchase_date: str
    next_refill_date: str
    total_amount: float = Field(..., ge=0)
    status: OrderStatus = OrderStatus.PENDING
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "order_id": "ORD001",
                "patient_id": "PAT001",
                "patient_name": "John Doe",
                "abha_id": "1234-5678-9012",
                "medicine_id": "MED001",
                "medicine_name": "Aspirin",
                "quantity": 10,
                "dosage_frequency": "2 tablets daily",
                "purchase_date": "2024-01-15",
                "next_refill_date": "2024-02-15",
                "total_amount": 100.0,
                "status": "confirmed"
            }
        }


# Patient Models
class Patient(BaseModel):
    """Patient details."""
    patient_id: str = Field(..., min_length=1)
    abha_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., pattern="^(M|F|Other)$")
    phone: Optional[str] = Field(None)
    email: Optional[str] = Field(None)
    blood_group: Optional[str] = Field(None)
    chronic_conditions: List[str] = []
    
    class Config:
        schema_extra = {
            "example": {
                "patient_id": "PAT001",
                "abha_id": "1234-5678-9012",
                "name": "John Doe",
                "age": 35,
                "gender": "M",
                "phone": "9876543210",
                "email": "john@example.com",
                "blood_group": "O+",
                "chronic_conditions": ["Diabetes", "Hypertension"]
            }
        }
    
    @validator('age')
    def validate_age(cls, v):
        """Validate age is reasonable."""
        if v < 0 or v > 150:
            raise ValueError('Age must be between 0 and 150')
        return v


# Chat Models
class ChatMessage(BaseModel):
    """Chat message request."""
    message: str = Field(..., min_length=1, max_length=2000)
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    abha_id: Optional[str] = None
    language: Optional[str] = Field(default="en-IN")
    has_prescription: bool = False
    
    class Config:
        schema_extra = {
            "example": {
                "message": "I need aspirin for my headache",
                "patient_id": "PAT001",
                "patient_name": "John Doe",
                "abha_id": "1234-5678-9012",
                "language": "en-IN",
                "has_prescription": False
            }
        }
    
    @validator('message')
    def validate_message(cls, v):
        """Validate message is not empty or too long."""
        if len(v.strip()) == 0:
            raise ValueError('Message cannot be empty')
        if len(v) > 2000:
            raise ValueError('Message is too long (max 2000 characters)')
        return v.strip()


class ChatResponse(BaseModel):
    """Chat response."""
    response: str
    intent: Optional[str] = None
    medicines_found: List[dict] = []
    action_taken: Optional[str] = None
    welfare_eligible: bool = False
    agent_trace: List[str] = []
    
    class Config:
        schema_extra = {
            "example": {
                "response": "I found Aspirin for you at ₹10 per tablet",
                "intent": "medicine_search",
                "medicines_found": [{"id": "MED001", "name": "Aspirin", "price": 10.0}],
                "action_taken": "medicine_search",
                "welfare_eligible": True,
                "agent_trace": ["Received message", "Searched medicines", "Applied welfare"]
            }
        }


# Payment Models
class PaymentRequest(BaseModel):
    """Payment processing request."""
    order_id: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0, le=999999.99)
    patient_id: str = Field(..., min_length=1)
    payment_method: PaymentMethod = PaymentMethod.UPI
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "order_id": "ORD001",
                "amount": 100.0,
                "patient_id": "PAT001",
                "payment_method": "UPI"
            }
        }
    
    @validator('amount')
    def validate_amount(cls, v):
        """Validate amount is reasonable."""
        if v <= 0 or v > 999999.99:
            raise ValueError('Amount must be between 0.01 and 999,999.99')
        return v


class PaymentResponse(BaseModel):
    """Payment processing response."""
    status: str = Field(..., pattern="^(success|failed|pending)$")
    payment_id: str = Field(..., min_length=1)
    message: str
    
    class Config:
        schema_extra = {
            "example": {
                "status": "success",
                "payment_id": "PAY001",
                "message": "Payment processed successfully"
            }
        }


# Notification Models
class NotificationRequest(BaseModel):
    """Send notification request."""
    patient_id: str = Field(..., min_length=1)
    patient_name: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    channels: List[NotificationChannel] = [NotificationChannel.WHATSAPP]
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "patient_id": "PAT001",
                "patient_name": "John Doe",
                "message": "Your prescription is ready for pickup",
                "channels": ["whatsapp", "sms"]
            }
        }


class InAppNotification(BaseModel):
    """In-app notification details."""
    id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    abha_id: Optional[str] = None
    title: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    timestamp: str
    read: bool = False
    type: NotificationType = NotificationType.INFO
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "id": "NOTIF001",
                "patient_id": "PAT001",
                "abha_id": "1234-5678-9012",
                "title": "Order Delivered",
                "message": "Your order has been delivered",
                "timestamp": "2024-01-15T10:30:00",
                "read": False,
                "type": "success"
            }
        }


class AgentNotificationResponse(BaseModel):
    """Agent-generated notification for multiple channels."""
    whatsapp: str
    sms: str
    email_subject: str
    email_body: str
    in_app: str


# Welfare Models
class WelfareCheck(BaseModel):
    """Welfare eligibility check response."""
    patient_id: str = Field(..., min_length=1)
    abha_id: str = Field(..., min_length=1)
    eligible: bool
    scheme: Optional[str] = None
    discount_percent: int = Field(..., ge=0, le=100)
    reason: str = Field(..., min_length=1)
    
    class Config:
        schema_extra = {
            "example": {
                "patient_id": "PAT001",
                "abha_id": "1234-5678-9012",
                "eligible": True,
                "scheme": "PMJAY (Ayushman Bharat)",
                "discount_percent": 20,
                "reason": "Patient enrolled in PMJAY scheme"
            }
        }


# Refill Alert Models
class RefillAlert(BaseModel):
    """Medication refill alert."""
    patient_id: str = Field(..., min_length=1)
    patient_name: str = Field(..., min_length=1)
    medicine_name: str = Field(..., min_length=1)
    last_purchase_date: str
    next_refill_date: str
    days_until_refill: int
    urgency: str = Field(..., pattern="^(low|medium|high)$")
    
    class Config:
        schema_extra = {
            "example": {
                "patient_id": "PAT001",
                "patient_name": "John Doe",
                "medicine_name": "Metformin",
                "last_purchase_date": "2024-01-15",
                "next_refill_date": "2024-01-22",
                "days_until_refill": 2,
                "urgency": "high"
            }
        }


# Pharmacist Models
class PharmacistLogin(BaseModel):
    """Pharmacist login request."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    
    class Config:
        schema_extra = {
            "example": {
                "username": "pharmacist001",
                "password": "secure_password"
            }
        }


# Prescription Models
class ScannedMedicine(BaseModel):
    """Medicine extracted from prescription scan."""
    extracted_name: str = Field(..., min_length=1)
    dosage: str = ""
    quantity: int = Field(default=1, ge=1)
    matched_medicine: Optional[Medicine] = None
    available: bool = False
    
    class Config:
        schema_extra = {
            "example": {
                "extracted_name": "Aspirin",
                "dosage": "500mg",
                "quantity": 10,
                "available": True
            }
        }


class ScanPrescriptionResponse(BaseModel):
    """Prescription scan response."""
    message: str
    medicines: List[ScannedMedicine] = []
    scan_duration_ms: Optional[int] = None
    unavailable_items: List[str] = []
    short_availability_eta: Optional[str] = None
    extracted_patient_name: Optional[str] = None
    patient_name_match: Optional[bool] = None
    patient_name_warning: Optional[str] = None
    prescription_record_id: Optional[str] = None
    prescription_valid_until: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "message": "Prescription scanned successfully",
                "medicines": [
                    {
                        "extracted_name": "Aspirin",
                        "dosage": "500mg",
                        "quantity": 10,
                        "available": True
                    }
                ],
                "scan_duration_ms": 1200,
                "unavailable_items": ["Amoxicillin 500mg"],
                "short_availability_eta": "30-60 minutes",
                "extracted_patient_name": "Rajesh Kumar",
                "patient_name_match": True,
                "patient_name_warning": None
            }
        }
