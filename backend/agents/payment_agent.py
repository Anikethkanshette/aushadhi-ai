import logging
import time
import random
from typing import Dict, Any
from agents.agent_utils import (
    setup_agent_logger, validate_string, validate_numeric, 
    validate_choice, AgentResponse, ValidationError, ExternalServiceError
)

class PaymentAgent:
    def __init__(self):
        self.name = "PaymentAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("[OK] PaymentAgent initialized")
        
        # Supported payment methods
        self.PAYMENT_METHODS = ["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"]
        
        # Mock failure rate for testing resilience
        self.MOCK_FAILURE_RATE = 0.01  # 1% failure rate
        
    def process_payment(self, patient_id: str, amount: float, method: str = "UPI") -> Dict[str, Any]:
        """
        Processes a payment with validation and error handling.
        
        Args:
            patient_id: Patient ID making the payment
            amount: Payment amount in rupees
            method: Payment method (UPI, CREDIT_CARD, etc.)
            
        Returns:
            Payment response with transaction details
        """
        try:
            # Validate inputs
            patient_id = validate_string(patient_id, "Patient ID", min_length=1, max_length=50)
            amount = validate_numeric(amount, "Amount", min_val=1.0, max_val=999999.99)
            method = validate_choice(method, "Payment Method", self.PAYMENT_METHODS)
            
            self.logger.info(f"Processing payment: patient={patient_id}, amount=₹{amount}, method={method}")
            
            # Amount validation
            if amount <= 0:
                raise ValidationError(f"Invalid payment amount: ₹{amount}")
            
            # Simulate network delay
            time.sleep(random.uniform(0.1, 0.5))
            
            # Simulate payment gateway success/failure
            if random.random() < self.MOCK_FAILURE_RATE:
                self.logger.warning(f"Payment failed for patient {patient_id}")
                return AgentResponse(
                    status="failed",
                    message="Payment gateway declined. Please try again or use a different payment method.",
                    data={
                        "patient_id": patient_id,
                        "amount": amount,
                        "method": method,
                        "transaction_id": f"TXN_{int(time.time())}",
                        "success": False
                    },
                    error_code="PAYMENT_DECLINED"
                ).to_dict()
            
            # Success
            transaction_id = f"TXN_{int(time.time())}_{patient_id[-4:]}"
            self.logger.info(f"Payment successful: {transaction_id} for ₹{amount}")
            
            return AgentResponse(
                status="success",
                message=f"Payment of ₹{amount} via {method} successful.",
                data={
                    "patient_id": patient_id,
                    "transaction_id": transaction_id,
                    "amount": amount,
                    "method": method,
                    "status": "completed",
                    "timestamp": None
                }
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Unexpected error in process_payment: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Payment processing failed. Please contact support.",
                error_code="PAYMENT_ERROR"
            ).to_dict()
        
    def refund_payment(self, transaction_id: str, amount: float, reason: str = "Customer request") -> Dict[str, Any]:
        """
        Processes a refund for a completed transaction.
        
        Args:
            transaction_id: Original transaction ID
            amount: Refund amount
            reason: Reason for refund
            
        Returns:
            Refund response with refund ID
        """
        try:
            # Validate inputs
            transaction_id = validate_string(transaction_id, "Transaction ID", min_length=5, max_length=50)
            amount = validate_numeric(amount, "Amount", min_val=0.01, max_val=999999.99)
            reason = validate_string(reason, "Reason", min_length=5, max_length=200)
            
            self.logger.info(f"Processing refund: txn={transaction_id}, amount=₹{amount}, reason={reason}")
            
            # Simulate refund processing
            time.sleep(random.uniform(0.2, 0.8))
            
            refund_id = f"REF_{int(time.time())}"
            self.logger.info(f"Refund processed: {refund_id}")
            
            return AgentResponse(
                status="success",
                message=f"Refund of ₹{amount} initiated successfully.",
                data={
                    "original_transaction_id": transaction_id,
                    "refund_id": refund_id,
                    "amount": amount,
                    "reason": reason,
                    "status": "initiated"
                }
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error processing refund: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Refund processing failed. Please contact support.",
                error_code="REFUND_ERROR"
            ).to_dict()
    
    def validate_payment_method(self, method: str, details: Dict[str, str]) -> Dict[str, Any]:
        """
        Validates payment method details before processing.
        
        Args:
            method: Payment method
            details: Payment details (card number, UPI ID, etc.)
            
        Returns:
            Validation result
        """
        try:
            method = validate_choice(method, "Payment Method", self.PAYMENT_METHODS)
            
            self.logger.debug(f"Validating {method} payment details")
            
            # Basic validation based on method
            if method == "UPI":
                upi_id = details.get("upi_id", "")
                if "@" not in upi_id:
                    raise ValidationError("Invalid UPI ID format")
            
            elif method in ["CREDIT_CARD", "DEBIT_CARD"]:
                card_number = details.get("card_number", "")
                if not card_number or len(card_number) < 13:
                    raise ValidationError("Invalid card number")
            
            self.logger.info(f"{method} payment details validated")
            return AgentResponse(
                status="success",
                message=f"{method} payment details are valid.",
                data={"method": method, "valid": True}
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error validating payment: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Payment validation failed.",
                error_code="VALIDATION_ERROR"
            ).to_dict()
