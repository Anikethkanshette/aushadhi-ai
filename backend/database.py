"""
Database layer for AushadhiAI backend.
Manages medicines, orders, and notifications with caching and error handling.
"""

import csv
import os
import json
import logging
import threading
import time
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from config import get_settings

# Setup logger
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()
DATA_DIR = settings.DATA_DIR

# Thread-safe caching
_medicine_cache_lock = threading.RLock()
_order_cache_lock = threading.RLock()
_notification_cache_lock = threading.RLock()

_medicines_cache: Optional[List[Dict]] = None
_medicines_cache_time: float = 0
_orders_cache: Optional[List[Dict]] = None
_orders_cache_time: float = 0
_notifications_cache: Optional[List[Dict]] = None
_notifications_cache_time: float = 0


class DatabaseError(Exception):
    """Base exception for database operations."""
    pass


class DataValidationError(DatabaseError):
    """Raised when data validation fails."""
    pass


class DataNotFoundError(DatabaseError):
    """Raised when requested data is not found."""
    pass


def _is_cache_valid(cached_time: float) -> bool:
    """Check if cache is still valid based on timeout."""
    return (time.time() - cached_time) < settings.DB_CACHE_TIMEOUT


def _safe_read_csv(filepath: str, transformer=None) -> List[Dict]:
    """
    Safely read and parse CSV file with error handling.
    
    Args:
        filepath: Path to CSV file
        transformer: Optional function to transform each row
        
    Returns:
        List of dictionaries
        
    Raises:
        DatabaseError: If file cannot be read
    """
    try:
        if not os.path.exists(filepath):
            logger.warning(f"CSV file not found: {filepath}")
            return []
        
        with open(filepath, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            data = []
            for idx, row in enumerate(reader):
                try:
                    if transformer:
                        row = transformer(row)
                    data.append(row)
                except Exception as e:
                    logger.warning(f"Failed to transform row {idx} in {filepath}: {e}")
                    continue
        
        logger.debug(f"Successfully loaded {len(data)} records from {filepath}")
        return data
    except Exception as e:
        logger.error(f"Error reading CSV file {filepath}: {e}")
        raise DatabaseError(f"Failed to read data from {filepath}: {str(e)}")


def _safe_write_csv(filepath: str, data: List[Dict], fieldnames: List[str]) -> bool:
    """
    Safely write data to CSV file with error handling.
    
    Args:
        filepath: Path to CSV file
        data: List of dictionaries to write
        fieldnames: CSV column names
        
    Returns:
        bool: True if successful
        
    Raises:
        DatabaseError: If file cannot be written
    """
    try:
        # Create backup before writing
        if os.path.exists(filepath):
            backup_path = f"{filepath}.bak"
            try:
                with open(filepath, "r", encoding="utf-8") as f_in:
                    with open(backup_path, "w", encoding="utf-8") as f_out:
                        f_out.write(f_in.read())
            except Exception as e:
                logger.warning(f"Failed to create backup: {e}")
        
        # Write new data
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(data)
        
        logger.debug(f"Successfully wrote {len(data)} records to {filepath}")
        return True
    except Exception as e:
        logger.error(f"Error writing to CSV file {filepath}: {e}")
        raise DatabaseError(f"Failed to write data to {filepath}: {str(e)}")


def _transform_medicine(row: Dict) -> Dict:
    """Transform medicine data from CSV."""
    try:
        return {
            **row,
            "stock_quantity": int(row.get("stock_quantity", 0)),
            "price": float(row.get("price", 0)),
            "min_stock_level": int(row.get("min_stock_level", 0)),
            "prescription_required": row.get("prescription_required", "false").lower() == "true"
        }
    except (ValueError, KeyError) as e:
        raise DataValidationError(f"Invalid medicine data: {e}")


def load_medicines() -> List[Dict]:
    """
    Load medicines from cache or file.
    
    Returns:
        List of medicine dictionaries
        
    Raises:
        DatabaseError: If unable to load medicines
    """
    global _medicines_cache, _medicines_cache_time
    
    with _medicine_cache_lock:
        if _medicines_cache is not None and _is_cache_valid(_medicines_cache_time):
            logger.debug("Using cached medicines data")
            return _medicines_cache
        
        filepath = os.path.join(DATA_DIR, "medicines.csv")
        medicines = _safe_read_csv(filepath, _transform_medicine)
        
        _medicines_cache = medicines
        _medicines_cache_time = time.time()
        return medicines


def load_orders() -> List[Dict]:
    """
    Load orders from cache or file.
    
    Returns:
        List of order dictionaries
        
    Raises:
        DatabaseError: If unable to load orders
    """
    global _orders_cache, _orders_cache_time
    
    with _order_cache_lock:
        if _orders_cache is not None and _is_cache_valid(_orders_cache_time):
            logger.debug("Using cached orders data")
            return _orders_cache
        
        filepath = os.path.join(DATA_DIR, "order_history.csv")
        orders = _safe_read_csv(filepath)
        
        _orders_cache = orders
        _orders_cache_time = time.time()
        return orders


def save_order(order: Dict) -> bool:
    """
    Save order to file and cache.
    
    Args:
        order: Order dictionary to save
        
    Returns:
        bool: True if successful
        
    Raises:
        DatabaseError: If unable to save
    """
    global _orders_cache, _orders_cache_time
    
    if not order:
        raise DataValidationError("Order data cannot be empty")
    
    with _order_cache_lock:
        try:
            orders = load_orders()
            orders.append(order)
            
            if orders:
                fieldnames = []
                for row in orders:
                    for key in row.keys():
                        if key not in fieldnames:
                            fieldnames.append(key)
                filepath = os.path.join(DATA_DIR, "order_history.csv")
                _safe_write_csv(filepath, orders, fieldnames)
            
            _orders_cache = orders
            _orders_cache_time = time.time()
            
            logger.info(f"Order saved: {order.get('order_id', 'unknown')}")
            return True
        except DatabaseError:
            raise
        except Exception as e:
            logger.error(f"Error saving order: {e}")
            raise DatabaseError(f"Failed to save order: {str(e)}")


def update_medicine_stock(medicine_id: str, quantity_sold: int) -> bool:
    """
    Update medicine stock quantity.
    
    Args:
        medicine_id: ID of medicine to update
        quantity_sold: Quantity to deduct from stock
        
    Returns:
        bool: True if successful
        
    Raises:
        DataNotFoundError: If medicine not found
        DatabaseError: If operation fails
    """
    global _medicines_cache, _medicines_cache_time
    
    if not medicine_id:
        raise DataValidationError("Invalid medicine_id")
    
    with _medicine_cache_lock:
        try:
            medicines = load_medicines()
            found = False
            
            for med in medicines:
                if med["id"] == medicine_id:
                    new_qty = med["stock_quantity"] - quantity_sold
                    if new_qty < 0:
                        raise DatabaseError(f"Insufficient stock for medicine {medicine_id}")
                    
                    med["stock_quantity"] = new_qty
                    found = True
                    break
            
            if not found:
                raise DataNotFoundError(f"Medicine not found: {medicine_id}")
            
            fieldnames = list(medicines[0].keys()) if medicines else []
            filepath = os.path.join(DATA_DIR, "medicines.csv")
            _safe_write_csv(filepath, medicines, fieldnames)
            
            _medicines_cache = medicines
            _medicines_cache_time = time.time()
            
            logger.info(f"Stock updated for {medicine_id}: -{quantity_sold} units")
            return True
        except (DataNotFoundError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Error updating stock: {e}")
            raise DatabaseError(f"Failed to update stock: {str(e)}")


def search_medicines(query: str) -> List[Dict]:
    """
    Search for medicines by name, generic name, or category.
    
    Args:
        query: Search query string
        
    Returns:
        List of matching medicines
    """
    if not query or not isinstance(query, str):
        logger.warning("Empty or invalid search query")
        return []
    
    try:
        medicines = load_medicines()
        query_lower = query.lower()
        results = []
        
        for med in medicines:
            if (
                query_lower in med.get("name", "").lower()
                or query_lower in med.get("generic_name", "").lower()
                or query_lower in med.get("category", "").lower()
            ):
                results.append(med)
        
        logger.debug(f"Search '{query}' found {len(results)} medicines")
        return results
    except Exception as e:
        logger.error(f"Error searching medicines: {e}")
        return []


def get_medicine_by_id(medicine_id: str) -> Optional[Dict]:
    """
    Get medicine by ID.
    
    Args:
        medicine_id: ID of medicine to retrieve
        
    Returns:
        Medicine dictionary or None if not found
    """
    if not medicine_id:
        return None
    
    try:
        medicines = load_medicines()
        for med in medicines:
            if med.get("id") == medicine_id:
                logger.debug(f"Found medicine: {medicine_id}")
                return med
        
        logger.warning(f"Medicine not found: {medicine_id}")
        return None
    except Exception as e:
        logger.error(f"Error retrieving medicine: {e}")
        return None


def get_patient_orders(patient_id: str = None, abha_id: str = None) -> List[Dict]:
    """
    Get orders for a patient.
    
    Args:
        patient_id: Patient ID (optional)
        abha_id: ABHA ID (optional)
        
    Returns:
        List of patient orders
    """
    if not patient_id and not abha_id:
        logger.warning("get_patient_orders called without patient_id or abha_id")
        return []
    
    try:
        orders = load_orders()
        result = []
        
        for order in orders:
            if patient_id and order.get("patient_id") == patient_id:
                result.append(order)
            elif abha_id and order.get("abha_id") == abha_id:
                result.append(order)
        
        logger.debug(f"Retrieved {len(result)} orders for patient")
        return result
    except Exception as e:
        logger.error(f"Error retrieving patient orders: {e}")
        return []


def get_all_orders() -> List[Dict]:
    """
    Get all orders.
    
    Returns:
        List of all orders
    """
    try:
        return load_orders()
    except Exception as e:
        logger.error(f"Error retrieving all orders: {e}")
        return []


def update_order_status(order_id: str, status: str) -> bool:
    """
    Update order status.
    
    Args:
        order_id: ID of order to update
        status: New status
        
    Returns:
        bool: True if successful
        
    Raises:
        DataNotFoundError: If order not found
        DatabaseError: If operation fails
    """
    global _orders_cache, _orders_cache_time
    
    if not order_id or not status:
        raise DataValidationError("order_id and status are required")
    
    with _order_cache_lock:
        try:
            orders = load_orders()
            updated = False
            
            for order in orders:
                if order.get("order_id") == order_id:
                    order["status"] = status
                    order["updated_at"] = datetime.utcnow().isoformat()
                    updated = True
                    break
            
            if not updated:
                raise DataNotFoundError(f"Order not found: {order_id}")
            
            if orders:
                fieldnames = list(orders[0].keys())
                filepath = os.path.join(DATA_DIR, "order_history.csv")
                _safe_write_csv(filepath, orders, fieldnames)
            
            _orders_cache = orders
            _orders_cache_time = time.time()
            
            logger.info(f"Order status updated: {order_id} -> {status}")
            return True
        except (DataNotFoundError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Error updating order status: {e}")
            raise DatabaseError(f"Failed to update order status: {str(e)}")


def load_notifications() -> List[Dict]:
    """
    Load notifications from cache or file.
    
    Returns:
        List of notification dictionaries
        
    Raises:
        DatabaseError: If unable to load notifications
    """
    global _notifications_cache, _notifications_cache_time
    
    with _notification_cache_lock:
        if _notifications_cache is not None and _is_cache_valid(_notifications_cache_time):
            logger.debug("Using cached notifications data")
            return _notifications_cache
        
        filepath = os.path.join(DATA_DIR, "notifications.json")
        try:
            if not os.path.exists(filepath):
                logger.info(f"Creating notifications file: {filepath}")
                os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump([], f)
                _notifications_cache = []
                _notifications_cache_time = time.time()
                return []
            
            with open(filepath, "r", encoding="utf-8") as f:
                notifs = json.load(f)
            
            _notifications_cache = notifs
            _notifications_cache_time = time.time()
            logger.debug(f"Loaded {len(notifs)} notifications")
            return notifs
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in notifications file: {e}")
            _notifications_cache = []
            _notifications_cache_time = time.time()
            return []
        except Exception as e:
            logger.error(f"Error loading notifications: {e}")
            raise DatabaseError(f"Failed to load notifications: {str(e)}")


def save_notification(notification: Dict) -> bool:
    """
    Save notification to file and cache.
    
    Args:
        notification: Notification dictionary to save
        
    Returns:
        bool: True if successful
        
    Raises:
        DatabaseError: If unable to save
    """
    global _notifications_cache, _notifications_cache_time
    
    if not notification:
        raise DataValidationError("Notification data cannot be empty")
    
    with _notification_cache_lock:
        try:
            notifs = load_notifications()
            notifs.append(notification)
            
            filepath = os.path.join(DATA_DIR, "notifications.json")
            os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(notifs, f, indent=2)
            
            _notifications_cache = notifs
            _notifications_cache_time = time.time()
            
            logger.info(f"Notification saved: {notification.get('id', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Error saving notification: {e}")
            raise DatabaseError(f"Failed to save notification: {str(e)}")


def get_patient_notifications(patient_id: str = None, abha_id: str = None) -> List[Dict]:
    """
    Get notifications for a patient.
    
    Args:
        patient_id: Patient ID (optional)
        abha_id: ABHA ID (optional)
        
    Returns:
        Sorted list of patient notifications (newest first)
    """
    if not patient_id and not abha_id:
        logger.warning("get_patient_notifications called without patient_id or abha_id")
        return []
    
    try:
        notifs = load_notifications()
        result = []
        
        for n in notifs:
            if patient_id and n.get("patient_id") == patient_id:
                result.append(n)
            elif abha_id and n.get("abha_id") == abha_id:
                result.append(n)
        
        # Sort by timestamp, newest first
        result.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        logger.debug(f"Retrieved {len(result)} notifications for patient")
        return result
    except Exception as e:
        logger.error(f"Error retrieving patient notifications: {e}")
        return []


def mark_notification_read(notification_id: str, read: bool = True, patient_id: str = None, abha_id: str = None) -> bool:
    """
    Update read/unread state for a single notification.

    Args:
        notification_id: Notification identifier
        read: Target read value
        patient_id: Optional patient id ownership check
        abha_id: Optional abha ownership check

    Returns:
        bool: True when a notification was updated
    """
    global _notifications_cache, _notifications_cache_time

    if not notification_id:
        raise DataValidationError("notification_id is required")

    with _notification_cache_lock:
        try:
            notifs = load_notifications()
            updated = False

            for notif in notifs:
                if notif.get("id") != notification_id:
                    continue
                if patient_id and notif.get("patient_id") not in (patient_id, ""):
                    continue
                if abha_id and notif.get("abha_id") not in (abha_id, None, ""):
                    continue

                notif["read"] = bool(read)
                notif["updated_at"] = datetime.utcnow().isoformat()
                updated = True
                break

            if not updated:
                return False

            filepath = os.path.join(DATA_DIR, "notifications.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(notifs, f, indent=2)

            _notifications_cache = notifs
            _notifications_cache_time = time.time()
            return True
        except Exception as e:
            logger.error(f"Error updating notification read state: {e}")
            raise DatabaseError(f"Failed to update notification state: {str(e)}")


def mark_all_notifications_read(patient_id: str = None, abha_id: str = None) -> int:
    """
    Mark all matching notifications as read.

    Returns:
        int: Number of notifications updated
    """
    global _notifications_cache, _notifications_cache_time

    with _notification_cache_lock:
        try:
            notifs = load_notifications()
            updated_count = 0

            for notif in notifs:
                matches_patient = (not patient_id) or (notif.get("patient_id") in (patient_id, ""))
                matches_abha = (not abha_id) or (notif.get("abha_id") in (abha_id, None, ""))
                if matches_patient and matches_abha and not notif.get("read", False):
                    notif["read"] = True
                    notif["updated_at"] = datetime.utcnow().isoformat()
                    updated_count += 1

            if updated_count > 0:
                filepath = os.path.join(DATA_DIR, "notifications.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(notifs, f, indent=2)

                _notifications_cache = notifs
                _notifications_cache_time = time.time()

            return updated_count
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            raise DatabaseError(f"Failed to mark notifications as read: {str(e)}")


def invalidate_cache():
    """Invalidate all caches to force reload from files."""
    global _medicines_cache, _orders_cache, _notifications_cache
    global _medicines_cache_time, _orders_cache_time, _notifications_cache_time
    
    with _medicine_cache_lock:
        _medicines_cache = None
        _medicines_cache_time = 0
    
    with _order_cache_lock:
        _orders_cache = None
        _orders_cache_time = 0
    
    with _notification_cache_lock:
        _notifications_cache = None
        _notifications_cache_time = 0
    
    logger.info("All caches invalidated")
    
