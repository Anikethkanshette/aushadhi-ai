from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class Medicine(BaseModel):
    id: str
    name: str
    generic_name: str
    category: str
    stock_quantity: int
    unit: str
    price: float
    prescription_required: bool
    min_stock_level: int
    supplier: str


class MedicineSearchResult(BaseModel):
    medicine: Medicine
    available: bool
    alternatives: List[str] = []


class OrderCreate(BaseModel):
    patient_id: str
    patient_name: str
    abha_id: str
    medicine_id: str
    medicine_name: str
    quantity: int
    dosage_frequency: str
    has_prescription: bool = False


class Order(BaseModel):
    order_id: str
    patient_id: str
    patient_name: str
    abha_id: str
    medicine_id: str
    medicine_name: str
    quantity: int
    dosage_frequency: str
    purchase_date: str
    next_refill_date: str
    total_amount: float
    status: str


class Patient(BaseModel):
    patient_id: str
    abha_id: str
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    blood_group: Optional[str] = None
    chronic_conditions: List[str] = []


class ChatMessage(BaseModel):
    message: str
    patient_id: Optional[str] = None
    abha_id: Optional[str] = None
    language: Optional[str] = "en-IN"
    has_prescription: bool = False


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    medicines_found: List[dict] = []
    action_taken: Optional[str] = None
    welfare_eligible: bool = False
    agent_trace: List[str] = []


class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    patient_id: str
    payment_method: str = "UPI"


class PaymentResponse(BaseModel):
    status: str
    payment_id: str
    message: str


class NotificationRequest(BaseModel):
    patient_id: str
    patient_name: str
    message: str
    channels: List[str] = ["whatsapp", "sms", "email"]


class WelfareCheck(BaseModel):
    patient_id: str
    abha_id: str
    eligible: bool
    scheme: Optional[str] = None
    discount_percent: int = 0
    reason: str


class RefillAlert(BaseModel):
    patient_id: str
    patient_name: str
    medicine_name: str
    last_purchase_date: str
    next_refill_date: str
    days_until_refill: int
    urgency: str
