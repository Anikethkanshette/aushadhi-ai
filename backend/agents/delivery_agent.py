import logging
import time
from typing import Dict, Any
from datetime import datetime, timedelta
from agents.agent_utils import (
    setup_agent_logger, validate_string, validate_choice,
    AgentResponse, ValidationError
)

class DeliveryAgent:
    def __init__(self):
        self.name = "DeliveryAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("[OK] DeliveryAgent initialized")
        
        # Supported couriers
        self.COURIERS = ["Delhivery", "FedEx", "Bluedart", "Ecom Express"]
        
    def schedule_delivery(self, order_id: str, zip_code: str) -> Dict[str, Any]:
        """
        Estimates logistics and schedules a delivery.
        
        Args:
            order_id: Order ID for tracking
            zip_code: Delivery zip code
            
        Returns:
            Delivery schedule with tracking ID
        """
        try:
            # Validate inputs
            order_id = validate_string(order_id, "Order ID", min_length=5, max_length=50)
            zip_code = validate_string(zip_code, "Zip Code", min_length=6, max_length=6)
            
            self.logger.info(f"Scheduling delivery: order={order_id}, zip={zip_code}")
            
            # Validate zip code format
            if not zip_code.isdigit():
                raise ValidationError("Zip code must contain only digits")
            
            # Determine delivery area and days
            days_to_deliver = 2
            is_serviceable = True
            courier = "Delhivery"
            
            zip_prefix = zip_code[0]
            
            # Mock logic based on zip code prefixes
            if zip_prefix == "9":  # Remote areas
                days_to_deliver = 5
                courier = "Bluedart"
            elif zip_prefix == "0":  # Invalid
                is_serviceable = False
            else:  # Metro areas
                days_to_deliver = 1
                courier = "Delhivery"
            
            if not is_serviceable:
                self.logger.warning(f"Unserviceable zip code: {zip_code}")
                return AgentResponse(
                    status="error",
                    message=f"Zip code {zip_code} is currently unserviceable by our logistics partners.",
                    error_code="UNSERVICEABLE_AREA"
                ).to_dict()
            
            delivery_date = datetime.now() + timedelta(days=days_to_deliver)
            tracking_id = f"AWB{int(time.time())}{order_id[-4:]}"
            
            self.logger.info(f"Delivery scheduled: {tracking_id}, estimated {delivery_date.strftime('%Y-%m-%d')}")
            
            return AgentResponse(
                status="success",
                message=f"Delivery scheduled. Expected by {delivery_date.strftime('%d-%b-%Y')}.",
                data={
                    "order_id": order_id,
                    "tracking_id": tracking_id,
                    "expected_delivery_date": delivery_date.strftime('%Y-%m-%d'),
                    "expected_delivery_time_range": "9:00 AM - 6:00 PM",
                    "courier": courier,
                    "status": "scheduled",
                    "delivery_area": "Metro" if days_to_deliver <= 2 else "Remote"
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
            self.logger.error(f"Error scheduling delivery: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to schedule delivery.",
                error_code="DELIVERY_ERROR"
            ).to_dict()
    
    def track_shipment(self, tracking_id: str) -> Dict[str, Any]:
        """
        Tracks a shipment status.
        
        Args:
            tracking_id: Shipment tracking ID
            
        Returns:
            Tracking information
        """
        try:
            tracking_id = validate_string(tracking_id, "Tracking ID", min_length=10, max_length=50)
            
            self.logger.debug(f"Tracking shipment: {tracking_id}")
            
            # Mock tracking status
            statuses = ["Picked", "In Transit", "Out for Delivery", "Delivered"]
            status = statuses[hash(tracking_id) % len(statuses)]
            
            return AgentResponse(
                status="success",
                message=f"Shipment status: {status}",
                data={
                    "tracking_id": tracking_id,
                    "status": status,
                    "last_update": datetime.now().isoformat()
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
            self.logger.error(f"Error tracking shipment: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to track shipment.",
                error_code="TRACKING_ERROR"
            ).to_dict()
    
    def estimate_delivery_cost(self, zip_code: str, weight_kg: float) -> Dict[str, Any]:
        """
        Estimates delivery cost based on zip code and weight.
        
        Args:
            zip_code: Delivery zip code
            weight_kg: Package weight in kg
            
        Returns:
            Estimated delivery cost
        """
        try:
            zip_code = validate_string(zip_code, "Zip Code", min_length=6, max_length=6)
            if not zip_code.isdigit():
                raise ValidationError("Zip code must contain only digits")
            
            self.logger.debug(f"Estimating delivery cost: zip={zip_code}, weight={weight_kg}kg")
            
            # Mock cost calculation
            base_cost = 40  # Base delivery charge
            zip_prefix = zip_code[0]
            
            if zip_prefix == "9":
                base_cost += 30  # Remote area surcharge
            
            weight_cost = max(0, weight_kg - 1) * 10  # ₹10 per kg above 1kg
            total_cost = base_cost + weight_cost
            
            return AgentResponse(
                status="success",
                message=f"Estimated delivery cost: ₹{total_cost}",
                data={
                    "base_cost": base_cost,
                    "weight_cost": weight_cost,
                    "total_cost": total_cost,
                    "zip_code": zip_code
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
            self.logger.error(f"Error estimating cost: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to estimate delivery cost.",
                error_code="COST_ESTIMATION_ERROR"
            ).to_dict()
