import logging
from typing import Dict, Any, Set
from agents.agent_utils import (
    setup_agent_logger, validate_string, validate_numeric,
    AgentResponse, ValidationError
)

class WelfareAgent:
    def __init__(self):
        self.name = "WelfareAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("[OK] WelfareAgent initialized")
        
        # Eligible ABHA IDs for PMJAY and other welfare schemes
        self.PMJAY_ELIGIBLE = {
            "1234-5678-9012", "2345-6789-0123", "3456-7890-1234",
            "2002-0002-0002", "2004-0004-0004", "2006-0006-0006"
        }
        
        # Senior citizen ABHA IDs (60+ years)
        self.SENIOR_CITIZEN_ELIGIBLE = {
            "5001-0001-0001", "5002-0002-0002", "5003-0003-0003"
        }
        
        # Income-based eligibility (Annual income <= 2.5L)
        self.INCOME_BASED_ELIGIBLE = set()  # Would be validated against income certificate
        
        # Discount percentages
        self.PMJAY_DISCOUNT = 0.20  # 20%
        self.SENIOR_CITIZEN_DISCOUNT = 0.05  # 5%
        self.INCOME_BASED_DISCOUNT = 0.10  # 10%
        
    def check_eligibility(self, abha_id: str, order_amount: float) -> Dict[str, Any]:
        """
        Checks if a patient is eligible for welfare discounts.
        
        Args:
            abha_id: Patient ABHA ID
            order_amount: Order total amount in rupees
            
        Returns:
            Eligibility status with discount details
        """
        try:
            # Validate inputs
            if not abha_id or abha_id == "":
                return AgentResponse(
                    status="success",
                    message="No ABHA ID provided.",
                    data={
                        "is_eligible": False,
                        "discount_percent": 0.0,
                        "discount_amount": 0.0,
                        "final_amount": order_amount,
                        "schemes_checked": []
                    }
                ).to_dict()
            
            abha_id = validate_string(abha_id, "ABHA ID", min_length=5, max_length=50)
            order_amount = validate_numeric(order_amount, "Order Amount", min_val=0.0, max_val=999999.99)
            
            self.logger.debug(f"Checking eligibility for ABHA={abha_id}, amount=₹{order_amount}")
            
            # Check all eligibility schemes
            applicable_schemes = []
            max_discount = 0.0
            
            # PMJAY check
            if abha_id in self.PMJAY_ELIGIBLE:
                applicable_schemes.append("PMJAY")
                max_discount = max(max_discount, self.PMJAY_DISCOUNT)
                self.logger.info(f"Patient {abha_id} eligible for PMJAY scheme")
            
            # Senior citizen check
            if abha_id in self.SENIOR_CITIZEN_ELIGIBLE:
                applicable_schemes.append("Senior Citizen")
                max_discount = max(max_discount, self.SENIOR_CITIZEN_DISCOUNT)
                self.logger.info(f"Patient {abha_id} eligible for Senior Citizen discount")
            
            # Income-based check
            if abha_id in self.INCOME_BASED_ELIGIBLE:
                applicable_schemes.append("Income-Based Assistance")
                max_discount = max(max_discount, self.INCOME_BASED_DISCOUNT)
                self.logger.info(f"Patient {abha_id} eligible for Income-Based assistance")
            
            # Calculate discounts
            is_eligible = len(applicable_schemes) > 0
            discount_amount = round(order_amount * max_discount, 2)
            final_amount = round(order_amount - discount_amount, 2)
            
            message = (
                f"Patient eligible for {', '.join(applicable_schemes)}. "
                f"Applied {int(max_discount * 100)}% discount (₹{discount_amount} saved)."
                if is_eligible
                else "Patient is not eligible for welfare schemes."
            )
            
            self.logger.info(f"Eligibility check result: {message}")
            
            return AgentResponse(
                status="success",
                message=message,
                data={
                    "abha_id": abha_id,
                    "is_eligible": is_eligible,
                    "schemes": applicable_schemes,
                    "discount_percent": max_discount,
                    "discount_amount": discount_amount,
                    "original_amount": order_amount,
                    "final_amount": final_amount,
                    "amount_saved": discount_amount
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
            self.logger.error(f"Error in check_eligibility: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to check welfare eligibility.",
                error_code="ELIGIBILITY_CHECK_ERROR"
            ).to_dict()
    
    def add_eligible_abha(self, abha_id: str, scheme: str) -> Dict[str, Any]:
        """
        Adds an ABHA ID to an eligibility scheme (Admin function).
        
        Args:
            abha_id: ABHA ID to add
            scheme: Welfare scheme (PMJAY, Senior Citizen, Income-Based)
            
        Returns:
            Confirmation of addition
        """
        try:
            abha_id = validate_string(abha_id, "ABHA ID", min_length=5, max_length=50)
            scheme = validate_string(scheme, "Scheme", min_length=3, max_length=50)
            
            if scheme == "PMJAY":
                self.PMJAY_ELIGIBLE.add(abha_id)
            elif scheme == "Senior Citizen":
                self.SENIOR_CITIZEN_ELIGIBLE.add(abha_id)
            elif scheme == "Income-Based":
                self.INCOME_BASED_ELIGIBLE.add(abha_id)
            else:
                raise ValidationError(f"Unknown scheme: {scheme}")
            
            self.logger.info(f"Added {abha_id} to {scheme} scheme")
            
            return AgentResponse(
                status="success",
                message=f"ABHA ID {abha_id} added to {scheme} scheme.",
                data={"abha_id": abha_id, "scheme": scheme}
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error adding eligible ABHA: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to add eligible ABHA.",
                error_code="ADD_ELIGIBLE_ERROR"
            ).to_dict()
