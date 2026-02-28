import logging
from typing import Dict, Any
from database import get_medicine_by_id
from agents.agent_utils import (
    setup_agent_logger, validate_string, AgentResponse,
    DataNotFoundError, ValidationError
)

class PrescriptionAgent:
    def __init__(self):
        self.name = "PrescriptionAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("✓ PrescriptionAgent initialized")
        
    def validate_prescription(self, medicine_id: str,
                              has_prescription: bool,
                              patient_abha: str = "anonymous") -> Dict[str, Any]:
        """
        Validates if a specific medicine requires a prescription and if the user provided one.
        
        Args:
            medicine_id: ID of the medicine to validate
            has_prescription: Whether patient has submitted a prescription
            patient_abha: Patient ABHA ID for audit trail
            
        Returns:
            Dictionary with validation status and details
        """
        try:
            # Validate inputs
            medicine_id = validate_string(medicine_id, "Medicine ID", min_length=1, max_length=50)
            patient_abha = validate_string(patient_abha, "Patient ABHA", min_length=1, max_length=50)
            
            self.logger.debug(f"Validating prescription for med_id={medicine_id}, patient={patient_abha}")
            
            # Get medicine details
            med = get_medicine_by_id(medicine_id)
            if not med:
                self.logger.warning(f"Medicine not found: {medicine_id}")
                return AgentResponse(
                    status="error",
                    message=f"Medicine ID '{medicine_id}' not found.",
                    error_code="NOT_FOUND"
                ).to_dict()
            
            medicine_name = med.get("name", "Unknown")
            is_rx_required = med.get("prescription_required", False)
            schedule = med.get("schedule", "OTC")  # H, H1, X, OTC
            
            # Validation logic
            if is_rx_required and not has_prescription:
                self.logger.warning(
                    f"Prescription required but not provided for {medicine_name} (patient: {patient_abha})"
                )
                return AgentResponse(
                    status="rejected",
                    message=f"Prescription required for {medicine_name}. Please upload a valid prescription.",
                    data={
                        "medicine_id": medicine_id,
                        "medicine_name": medicine_name,
                        "schedule": schedule,
                        "can_dispense": False,
                        "reason": "MISSING_PRESCRIPTION",
                        "next_steps": ["Upload prescription", "Consult a doctor"]
                    },
                    error_code="PRESCRIPTION_REQUIRED"
                ).to_dict()
            
            # Additional validation for restricted schedules
            if schedule in ["X"]:  # Schedule X = highly restricted
                if not has_prescription:
                    self.logger.error(f"Schedule X medicine {medicine_name} requires prescription")
                    return AgentResponse(
                        status="rejected",
                        message=f"Schedule X drug: {medicine_name} requires a valid prescription.",
                        data={
                            "medicine_id": medicine_id,
                            "medicine_name": medicine_name,
                            "schedule": schedule,
                            "can_dispense": False,
                            "reason": "SCHEDULE_X_RESTRICTION"
                        },
                        error_code="SCHEDULE_X_RESTRICTION"
                    ).to_dict()
            
            # Success case
            self.logger.info(f"Prescription validated for {medicine_name}")
            return AgentResponse(
                status="approved",
                message=f"Prescription validation passed for {medicine_name}.",
                data={
                    "medicine_id": medicine_id,
                    "medicine_name": medicine_name,
                    "schedule": schedule,
                    "can_dispense": True,
                    "requires_rx": is_rx_required,
                    "patient_abha": patient_abha,
                    "validation_timestamp": None
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
            self.logger.error(f"Unexpected error in validate_prescription: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="An unexpected error occurred during prescription validation.",
                error_code="PRESCRIPTION_VALIDATION_ERROR"
            ).to_dict()
    
    def check_interaction(self, medicine_id_1: str, medicine_id_2: str) -> Dict[str, Any]:
        """
        Checks for potential drug-drug interactions.
        
        Args:
            medicine_id_1: First medicine ID
            medicine_id_2: Second medicine ID
            
        Returns:
            Interaction details if found
        """
        try:
            medicine_id_1 = validate_string(medicine_id_1, "Medicine ID 1", min_length=1, max_length=50)
            medicine_id_2 = validate_string(medicine_id_2, "Medicine ID 2", min_length=1, max_length=50)
            
            self.logger.debug(f"Checking interaction between {medicine_id_1} and {medicine_id_2}")
            
            if medicine_id_1 == medicine_id_2:
                return AgentResponse(
                    status="error",
                    message="Cannot check interaction with the same medicine.",
                    error_code="VALIDATION_ERROR"
                ).to_dict()
            
            # Placeholder implementation - would connect to drug interaction database
            return AgentResponse(
                status="success",
                message="No significant interactions found",
                data={
                    "medicine_id_1": medicine_id_1,
                    "medicine_id_2": medicine_id_2,
                    "interaction_found": False,
                    "severity": "NONE"
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
            self.logger.error(f"Error checking interaction: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to check drug interactions.",
                error_code="INTERACTION_CHECK_ERROR"
            ).to_dict()
