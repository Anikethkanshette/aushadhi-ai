import logging
from database import load_orders, load_medicines
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from agents.agent_utils import (
    setup_agent_logger, validate_string, validate_numeric,
    AgentResponse, ValidationError
)


class PredictiveAgent:
    def __init__(self):
        self.name = "PredictiveAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("[OK] PredictiveAgent initialized")
    
    def compute_refill_alerts(self, days_threshold: int = 7) -> Dict[str, any]:
        """
        Analyze order history and compute proactive refill alerts.
        Returns alerts for patients whose medicines are due within days_threshold.
        
        Args:
            days_threshold: Number of days to look ahead for upcoming refills (default: 7)
            
        Returns:
            Dictionary with alert list and metadata
        """
        try:
            # Validate input
            if not isinstance(days_threshold, int) or days_threshold < 1 or days_threshold > 365:
                raise ValidationError("days_threshold must be between 1 and 365")
            
            self.logger.debug(f"Computing refill alerts (threshold: {days_threshold} days)")
            
            orders = load_orders()
            today = date.today()
            alerts = []
            seen = set()
            
            for order in orders:
                key = f"{order['patient_id']}-{order['medicine_id']}"
                if key in seen:
                    continue
                seen.add(key)
                
                try:
                    next_refill = datetime.strptime(order.get("next_refill_date", ""), "%Y-%m-%d").date()
                    days_until = (next_refill - today).days
                    
                    if days_until <= days_threshold:
                        urgency = self._determine_urgency(days_until)
                        
                        alert = {
                            "patient_id": order.get("patient_id"),
                            "patient_name": order.get("patient_name"),
                            "abha_id": order.get("abha_id", ""),
                            "medicine_id": order.get("medicine_id"),
                            "medicine_name": order.get("medicine_name"),
                            "last_purchase_date": order.get("purchase_date"),
                            "next_refill_date": order.get("next_refill_date"),
                            "days_until_refill": days_until,
                            "urgency": urgency,
                            "recommendation": self._get_recommendation(days_until, order.get("medicine_name")),
                        }
                        alerts.append(alert)
                        
                except (ValueError, TypeError, KeyError) as e:
                    self.logger.warning(f"Error processing order data: {e}")
                    continue
            
            alerts.sort(key=lambda x: x["days_until_refill"])
            
            self.logger.info(f"Generated {len(alerts)} refill alerts")
            
            return AgentResponse(
                status="success",
                message=f"Found {len(alerts)} upcoming refills within {days_threshold} days",
                data={
                    "alerts": alerts,
                    "total_alerts": len(alerts),
                    "critical_count": sum(1 for a in alerts if a["urgency"] == "CRITICAL"),
                    "high_count": sum(1 for a in alerts if a["urgency"] == "HIGH"),
                    "medium_count": sum(1 for a in alerts if a["urgency"] == "MEDIUM"),
                    "threshold_days": days_threshold
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
            self.logger.error(f"Error computing refill alerts: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to compute refill alerts",
                error_code="REFILL_ALERT_ERROR"
            ).to_dict()
    
    def predict_next_refill(self, patient_id: str, medicine_id: str) -> Dict[str, any]:
        """
        Predict the next refill date based on historical order patterns.
        Uses machine learning-like analysis of historical data.
        
        Args:
            patient_id: Patient ID
            medicine_id: Medicine ID
            
        Returns:
            Prediction with confidence score and historical pattern
        """
        try:
            # Validate inputs
            patient_id = validate_string(patient_id, "Patient ID", min_length=1, max_length=50)
            medicine_id = validate_string(medicine_id, "Medicine ID", min_length=1, max_length=50)
            
            self.logger.debug(f"Predicting refill for patient={patient_id}, medicine={medicine_id}")
            
            orders = load_orders()
            patient_orders = [
                o for o in orders
                if o.get("patient_id") == patient_id and o.get("medicine_id") == medicine_id
            ]
            
            if not patient_orders:
                self.logger.warning(f"No order history found for patient {patient_id}, medicine {medicine_id}")
                return AgentResponse(
                    status="no_history",
                    message="No previous orders found for this patient-medicine combination",
                    data={
                        "predicted_refill_date": None,
                        "confidence": 0,
                        "pattern": "No history",
                        "recommendation": "Consult with patient to establish refill schedule"
                    }
                ).to_dict()
            
            # Analyze order dates to find pattern
            dates = []
            for o in patient_orders:
                try:
                    dates.append(datetime.strptime(o.get("purchase_date", ""), "%Y-%m-%d").date())
                except (ValueError, TypeError):
                    continue
            
            if len(dates) >= 2:
                dates.sort()
                intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                avg_interval = sum(intervals) / len(intervals)
                last_purchase = dates[-1]
                predicted = last_purchase + timedelta(days=int(avg_interval))
                
                # Confidence based on consistency and history length
                consistency = self._calculate_consistency(intervals)
                confidence = min(95, 50 + len(dates) * 10)  # Higher with more data
                
                if consistency < 0.5:  # High variability
                    confidence = min(confidence, 60)
                
                self.logger.info(
                    f"Prediction: {predicted}, confidence={confidence}%, pattern={int(avg_interval)} days"
                )
                
                return AgentResponse(
                    status="success",
                    message=f"Predicted refill: {predicted.strftime('%d-%b-%Y')}",
                    data={
                        "predicted_refill_date": str(predicted),
                        "confidence": confidence,
                        "pattern": f"Refills every ~{int(avg_interval)} days",
                        "order_count": len(dates),
                        "last_purchase_date": str(last_purchase),
                        "avg_interval_days": int(avg_interval),
                        "consistency_score": consistency
                    }
                ).to_dict()
            
            # Fallback: single order
            if patient_orders:
                last = patient_orders[-1]
                predicted_date = last.get("next_refill_date")
                
                return AgentResponse(
                    status="success",
                    message="Using explicit refill date",
                    data={
                        "predicted_refill_date": predicted_date,
                        "confidence": 50,
                        "pattern": "Single order - using stated refill date",
                        "order_count": 1
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
            self.logger.error(f"Error predicting refill: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to predict next refill",
                error_code="REFILL_PREDICTION_ERROR"
            ).to_dict()
    
    def get_patient_medication_timeline(self, patient_id: str) -> Dict[str, any]:
        """
        Gets a timeline of a patient's medication orders and refills.
        Useful for medication adherence analysis.
        
        Args:
            patient_id: Patient ID
            
        Returns:
            Timeline with all orders and compliance metrics
        """
        try:
            patient_id = validate_string(patient_id, "Patient ID", min_length=1, max_length=50)
            
            self.logger.debug(f"Getting medication timeline for patient={patient_id}")
            
            orders = load_orders()
            patient_orders = [o for o in orders if o.get("patient_id") == patient_id]
            
            if not patient_orders:
                return AgentResponse(
                    status="no_data",
                    message="No medication orders found for this patient",
                    data={"patient_id": patient_id, "orders": []}
                ).to_dict()
            
            # Sort by date
            patient_orders.sort(key=lambda x: x.get("purchase_date", ""), reverse=True)
            
            total_orders = len(patient_orders)
            unique_medicines = len(set(o.get("medicine_id") for o in patient_orders))
            
            return AgentResponse(
                status="success",
                message=f"Retrieved medication timeline for patient",
                data={
                    "patient_id": patient_id,
                    "total_orders": total_orders,
                    "unique_medicines": unique_medicines,
                    "orders": patient_orders[:10],  # Show last 10
                    "compliance_note": "Monitor refill timeliness for adherence"
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
            self.logger.error(f"Error getting medication timeline: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to retrieve medication timeline",
                error_code="TIMELINE_ERROR"
            ).to_dict()
    
    def _determine_urgency(self, days_until: int) -> str:
        """Determines urgency level based on days remaining."""
        if days_until <= 0:
            return "CRITICAL"
        elif days_until <= 2:
            return "CRITICAL"
        elif days_until <= 5:
            return "HIGH"
        return "MEDIUM"
    
    def _get_recommendation(self, days_until: int, medicine_name: str) -> str:
        """Generates a recommendation message based on days until refill."""
        if days_until <= 0:
            return f"⚠️ OVERDUE: {medicine_name} refill is overdue! Order immediately to avoid missing doses."
        elif days_until <= 2:
            return f"🚨 URGENT: Only {days_until} day(s) left. Order {medicine_name} today!"
        elif days_until <= 5:
            return f"⚡ SOON: {medicine_name} refill needed in {days_until} days. Order this week."
        return f"📅 REMINDER: {medicine_name} refill due in {days_until} days."
    
    def _calculate_consistency(self, intervals: List[int]) -> float:
        """
        Calculates consistency score (0-1) of refill intervals.
        1.0 = perfectly consistent, 0.0 = highly variable.
        """
        if not intervals or len(intervals) < 2:
            return 0.5
        
        avg = sum(intervals) / len(intervals)
        variance = sum((x - avg) ** 2 for x in intervals) / len(intervals)
        std_dev = variance ** 0.5
        
        # Convert std_dev to 0-1 scale (lower std_dev = higher consistency)
        # Assuming typical std_dev of 10 days maps to 0.5 consistency
        consistency = max(0, 1 - (std_dev / avg)) if avg > 0 else 0.5
        return min(1, max(0, consistency))


# Backward compatibility: module-level functions
def compute_refill_alerts(days_threshold: int = 7) -> List[Dict]:
    """Backward compatibility wrapper."""
    agent = PredictiveAgent()
    result = agent.compute_refill_alerts(days_threshold)
    return result.get("data", {}).get("alerts", [])


def predict_next_refill(patient_id: str, medicine_id: str) -> Dict:
    """Backward compatibility wrapper."""
    agent = PredictiveAgent()
    result = agent.predict_next_refill(patient_id, medicine_id)
    return result.get("data", {})
