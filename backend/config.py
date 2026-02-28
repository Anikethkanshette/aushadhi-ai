"""
Configuration management for AushadhiAI backend.
Centralizes all settings with environment variable support.
"""

import os
from typing import Literal
import logging


class Settings:
    """Application settings with environment variable override support."""
    
    # API Configuration
    API_TITLE: str = "AushadhiAI API"
    API_DESCRIPTION: str = "Voice-enabled Agentic AI Pharmacist Backend"
    API_VERSION: str = "2.0.0"
    
    # Server Configuration
    HOST: str = os.getenv("API_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("API_PORT", "8000"))
    RELOAD: bool = os.getenv("API_RELOAD", "true").lower() == "true"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENV: Literal["development", "staging", "production"] = os.getenv("ENVIRONMENT", "development")
    
    # Database Configuration
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "data")
    DB_CACHE_TIMEOUT: int = int(os.getenv("DB_CACHE_TIMEOUT", "3600"))  # 1 hour
    MAX_RETRIES: int = int(os.getenv("DB_MAX_RETRIES", "3"))
    RETRY_DELAY: float = float(os.getenv("DB_RETRY_DELAY", "0.5"))
    
    # Logging Configuration
    LOG_DIR: str = os.path.join(os.path.dirname(__file__), "logs")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE_MAX_BYTES: int = int(os.getenv("LOG_FILE_MAX_BYTES", "10485760"))  # 10MB
    LOG_FILE_BACKUP_COUNT: int = int(os.getenv("LOG_FILE_BACKUP_COUNT", "5"))
    LOG_FORMAT: str = "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    ENABLE_FILE_LOGGING: bool = os.getenv("ENABLE_FILE_LOGGING", "true").lower() == "true"
    
    # CORS Configuration
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    LANGFUSE_API_KEY: str = os.getenv("LANGFUSE_API_KEY", "")
    LANGFUSE_SECRET: str = os.getenv("LANGFUSE_SECRET", "")
    
    # Request Configuration
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    MAX_REQUEST_SIZE_MB: int = int(os.getenv("MAX_REQUEST_SIZE_MB", "10"))
    
    # Health Check Configuration
    HEALTH_CHECK_INTERVAL: int = int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))  # seconds
    
    # Pagination Configuration
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "20"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "100"))
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development mode."""
        return cls.ENV == "development"
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode."""
        return cls.ENV == "production"
    
    @classmethod
    def validate(cls) -> bool:
        """
        Validate critical settings.
        
        Returns:
            bool: True if all required settings are valid.
            
        Raises:
            ValueError: If critical settings are missing.
        """
        if not cls.DATA_DIR:
            raise ValueError("DATA_DIR is required")
        
        if not os.path.exists(cls.DATA_DIR):
            raise ValueError(f"DATA_DIR does not exist: {cls.DATA_DIR}")
        
        if cls.is_production() and not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required in production")
        
        return True


def get_settings() -> Settings:
    """Get application settings instance."""
    return Settings()


# Create directories if they don't exist
def ensure_directories():
    """Ensure all required directories exist."""
    settings = get_settings()
    
    # Create logs directory
    if settings.ENABLE_FILE_LOGGING:
        os.makedirs(settings.LOG_DIR, exist_ok=True)
    
    # Create data directory if it doesn't exist
    os.makedirs(settings.DATA_DIR, exist_ok=True)


# Validate settings on import
try:
    ensure_directories()
    Settings.validate()
except Exception as e:
    logging.error(f"Configuration validation failed: {e}")
    raise
