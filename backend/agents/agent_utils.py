"""
Shared utilities for all agents: logging, error handling, validation, retry logic.
"""
import logging
import json
from typing import Any, Callable, Dict, Optional, TypeVar, Union
from functools import wraps
import asyncio
from datetime import datetime

# ── Configure Logging ────────────────────────────────────────────────────────
def setup_agent_logger(agent_name: str) -> logging.Logger:
    """
    Sets up a logger for an agent with both file and console handlers.
    """
    logger = logging.getLogger(f"aushadhi.{agent_name}")
    
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_format)
        
        # File handler
        file_handler = logging.FileHandler(f'logs/{agent_name}.log')
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
        )
        file_handler.setFormatter(file_format)
        
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
    
    return logger


# ── Custom Exceptions ───────────────────────────────────────────────────────
class AgentException(Exception):
    """Base exception for all agent errors."""
    pass


class ValidationError(AgentException):
    """Raised when input validation fails."""
    pass


class ExternalServiceError(AgentException):
    """Raised when external API/service calls fail."""
    pass


class DataNotFoundError(AgentException):
    """Raised when required data is not found in database."""
    pass


# ── Input Validation Functions ──────────────────────────────────────────────
def validate_string(value: Any, field_name: str, min_length: int = 1, max_length: Optional[int] = None) -> str:
    """Validates that a value is a non-empty string."""
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string, got {type(value).__name__}")
    
    if len(value) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} character(s)")
    
    if max_length and len(value) > max_length:
        raise ValidationError(f"{field_name} must be at most {max_length} character(s)")
    
    return value.strip()


def validate_numeric(value: Any, field_name: str, min_val: Optional[float] = None, 
                    max_val: Optional[float] = None) -> Union[int, float]:
    """Validates that a value is numeric and within range."""
    if not isinstance(value, (int, float)):
        raise ValidationError(f"{field_name} must be numeric, got {type(value).__name__}")
    
    if min_val is not None and value < min_val:
        raise ValidationError(f"{field_name} must be >= {min_val}")
    
    if max_val is not None and value > max_val:
        raise ValidationError(f"{field_name} must be <= {max_val}")
    
    return value


def validate_choice(value: Any, field_name: str, choices: list) -> str:
    """Validates that a value is one of the allowed choices."""
    if value not in choices:
        raise ValidationError(f"{field_name} must be one of {choices}, got '{value}'")
    return value


# ── Retry Decorator for Resilience ──────────────────────────────────────────
def retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """
    Decorator that retries a function with exponential backoff.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = logging.getLogger("aushadhi")
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except ExternalServiceError as e:
                    if attempt == max_attempts:
                        logger.error(f"Failed after {max_attempts} attempts: {e}")
                        raise
                    wait_time = delay * (backoff ** (attempt - 1))
                    logger.warning(f"Attempt {attempt}/{max_attempts} failed. Retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = logging.getLogger("aushadhi")
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except ExternalServiceError as e:
                    if attempt == max_attempts:
                        logger.error(f"Failed after {max_attempts} attempts: {e}")
                        raise
                    wait_time = delay * (backoff ** (attempt - 1))
                    logger.warning(f"Attempt {attempt}/{max_attempts} failed. Retrying in {wait_time}s: {e}")
                    asyncio.run(asyncio.sleep(wait_time))
        
        # Return appropriate wrapper based on whether func is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# ── Standardized Response Format ────────────────────────────────────────────
class AgentResponse:
    """Standardized response format for all agents."""
    
    def __init__(self, 
                 status: str,  # 'success', 'error', 'warning', 'warning'
                 message: str,
                 data: Optional[Dict[str, Any]] = None,
                 error_code: Optional[str] = None,
                 meta: Optional[Dict[str, Any]] = None):
        self.status = status
        self.message = message
        self.data = data or {}
        self.error_code = error_code
        self.meta = meta or {"timestamp": datetime.now().isoformat()}
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts response to dictionary."""
        return {
            "status": self.status,
            "message": self.message,
            "data": self.data,
            "error_code": self.error_code,
            "meta": self.meta
        }
    
    def to_json(self) -> str:
        """Converts response to JSON string."""
        return json.dumps(self.to_dict(), default=str)


# ── Caching Utility ─────────────────────────────────────────────────────────
class SimpleCache:
    """Simple in-memory cache with TTL support."""
    
    def __init__(self, ttl_seconds: int = 300):
        self.cache: Dict[str, tuple] = {}  # {key: (value, expiry_time)}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Gets a value from cache if it exists and hasn't expired."""
        if key not in self.cache:
            return None
        
        value, expiry = self.cache[key]
        if datetime.now().timestamp() > expiry:
            del self.cache[key]
            return None
        
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Stores a value in cache with TTL."""
        expiry = datetime.now().timestamp() + self.ttl
        self.cache[key] = (value, expiry)
    
    def clear(self) -> None:
        """Clears all cache entries."""
        self.cache.clear()


# ── Health Check Utility ────────────────────────────────────────────────────
def check_service_health(service_name: str, test_fn: Callable) -> bool:
    """
    Checks if an external service is healthy.
    
    Args:
        service_name: Name of the service
        test_fn: Function that returns True if service is healthy
    
    Returns:
        True if service is healthy, False otherwise
    """
    logger = logging.getLogger("aushadhi.health")
    try:
        result = test_fn()
        logger.info(f"[OK] {service_name} is healthy")
        return result
    except Exception as e:
        logger.warning(f"✗ {service_name} health check failed: {e}")
        return False
