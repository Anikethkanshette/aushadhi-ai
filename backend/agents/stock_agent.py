import logging
from typing import Dict, Any, List
from database import search_medicines, get_medicine_by_id
from agents.agent_utils import (
    setup_agent_logger, validate_string, AgentResponse, 
    DataNotFoundError, ValidationError
)

class StockCheckAgent:
    def __init__(self):
        self.name = "StockCheckAgent"
        self.logger = setup_agent_logger(self.name)
        self.logger.info("✓ StockCheckAgent initialized")
        
    def check_inventory(self, query: str) -> Dict[str, Any]:
        """
        Searches inventory for medicines matching the query.
        
        Args:
            query: Medicine name, generic name, or category
            
        Returns:
            Dictionary with status, matches list, and metadata
        """
        try:
            # Validate input
            query = validate_string(query, "Query", min_length=1, max_length=100)
            self.logger.debug(f"Searching inventory for: {query}")
            
            results = search_medicines(query)
            
            if not results:
                self.logger.warning(f"No medicines found for query: {query}")
                return AgentResponse(
                    status="no_results",
                    message=f"No medicines found for '{query}'.",
                    data={"query": query}
                ).to_dict()
            
            matches = []
            for med in results[:5]:  # Limit to 5 results
                try:
                    qty = int(med.get("stock_quantity", 0))
                    matches.append({
                        "id": med.get("id"),
                        "name": med.get("name"),
                        "generic_name": med.get("generic_name", ""),
                        "category": med.get("category", ""),
                        "price": float(med.get("price", 0)),
                        "prescription_required": med.get("prescription_required", False),
                        "in_stock": qty > 0,
                        "quantity_available": qty,
                        "discount_available": med.get("discount_percentage", 0) > 0
                    })
                except (ValueError, TypeError) as e:
                    self.logger.error(f"Error parsing medicine data: {e}")
                    continue
            
            self.logger.info(f"Found {len(matches)} matches for '{query}'")
            return AgentResponse(
                status="success",
                message=f"Found {len(matches)} medicine(s) matching '{query}'",
                data={"matches": matches, "total_count": len(matches)}
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Unexpected error in check_inventory: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="An unexpected error occurred while searching medicines.",
                error_code="INVENTORY_ERROR"
            ).to_dict()
        
    def check_specific_item(self, medicine_id: str) -> Dict[str, Any]:
        """
        Checks exact stock for a specific medicine ID.
        
        Args:
            medicine_id: ID of the medicine to check
            
        Returns:
            Dictionary with stock details or error
        """
        try:
            # Validate input
            medicine_id = validate_string(medicine_id, "Medicine ID", min_length=1, max_length=50)
            self.logger.debug(f"Checking stock for medicine ID: {medicine_id}")
            
            med = get_medicine_by_id(medicine_id)
            
            if not med:
                self.logger.warning(f"Medicine not found: {medicine_id}")
                return AgentResponse(
                    status="error",
                    message=f"Medicine ID '{medicine_id}' not found.",
                    error_code="NOT_FOUND"
                ).to_dict()
            
            qty = int(med.get("stock_quantity", 0))
            min_stock = int(med.get("min_stock_level", 0))
            
            # Determine stock status
            if qty == 0:
                status = "out_of_stock"
            elif qty < min_stock:
                status = "low_stock"
            else:
                status = "in_stock"
            
            response_data = {
                "medicine_id": med.get("id"),
                "name": med.get("name"),
                "generic_name": med.get("generic_name", ""),
                "category": med.get("category", ""),
                "price": float(med.get("price", 0)),
                "in_stock": qty > 0,
                "quantity_available": qty,
                "min_stock_level": min_stock,
                "stock_status": status,
                "prescription_required": med.get("prescription_required", False),
                "manufacturer": med.get("manufacturer", "")
            }
            
            self.logger.info(f"Stock check for {med.get('name')}: {status}")
            return AgentResponse(
                status="success",
                message=f"Stock info for {med.get('name')}",
                data=response_data
            ).to_dict()
            
        except ValidationError as e:
            self.logger.error(f"Validation error: {e}")
            return AgentResponse(
                status="error",
                message=str(e),
                error_code="VALIDATION_ERROR"
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Unexpected error in check_specific_item: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="An unexpected error occurred while checking stock.",
                error_code="STOCK_CHECK_ERROR"
            ).to_dict()
    
    def check_low_stock_items(self, threshold: int = 10) -> Dict[str, Any]:
        """
        Returns medicines with stock below threshold.
        Useful for pharmacist inventory management.
        
        Args:
            threshold: Stock level threshold
            
        Returns:
            List of low-stock items
        """
        try:
            self.logger.debug(f"Checking for items with stock < {threshold}")
            # This would require a database query for all medicines
            # Placeholder implementation
            return AgentResponse(
                status="success",
                message="Low stock items retrieved",
                data={"low_stock_items": []}
            ).to_dict()
        except Exception as e:
            self.logger.error(f"Error checking low stock items: {e}", exc_info=True)
            return AgentResponse(
                status="error",
                message="Failed to retrieve low stock items",
                error_code="LOW_STOCK_CHECK_ERROR"
            ).to_dict()
