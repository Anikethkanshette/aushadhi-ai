"""
Middleware for AushadhiAI backend.
Provides request logging, error handling, and performance monitoring.
"""

import logging
import time
import json
import uuid
from typing import Callable
from contextlib import asynccontextmanager

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from backend_utils import ResponseStatus, ResponseMetadata, ErrorCode

# Setup logger
logger = logging.getLogger(__name__)

settings = get_settings()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> any:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        body = ""
        
        try:
            if request.method in ["POST", "PUT", "PATCH"]:
                body = await request.body()
                # Re-create receive for further use
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
        except Exception as e:
            logger.debug(f"Failed to read request body: {e}")
        
        log_entry = {
            "request_id": request_id,
            "timestamp": time.time(),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client": request.client.host if request.client else None,
        }
        
        logger.info(json.dumps({**log_entry, "event": "request_started"}))
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            logger.info(json.dumps({
                **log_entry,
                "event": "request_completed",
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            }))
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(duration_ms)
            
            return response
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            logger.error(json.dumps({
                **log_entry,
                "event": "request_error",
                "error": str(e),
                "duration_ms": round(duration_ms, 2),
            }))
            
            return JSONResponse(
                status_code=500,
                content={
                    "status": ResponseStatus.SERVER_ERROR,
                    "message": "Internal server error",
                    "error_code": ErrorCode.INTERNAL_ERROR,
                    "meta": ResponseMetadata(request_id=request_id).dict(),
                }
            )


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle and format errors consistently."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> any:
        try:
            response = await call_next(request)
            return response
        except ValueError as e:
            logger.warning(f"Validation error: {e}")
            return JSONResponse(
                status_code=400,
                content={
                    "status": ResponseStatus.INVALID_REQUEST,
                    "message": str(e),
                    "error_code": ErrorCode.VALIDATION_ERROR,
                    "meta": ResponseMetadata(
                        request_id=getattr(request.state, "request_id", None)
                    ).dict(),
                }
            )
        except KeyError as e:
            logger.warning(f"Missing key: {e}")
            return JSONResponse(
                status_code=400,
                content={
                    "status": ResponseStatus.INVALID_REQUEST,
                    "message": f"Missing required field: {str(e)}",
                    "error_code": ErrorCode.VALIDATION_ERROR,
                    "meta": ResponseMetadata(
                        request_id=getattr(request.state, "request_id", None)
                    ).dict(),
                }
            )
        except Exception as e:
            logger.error(f"Unhandled exception: {e}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "status": ResponseStatus.SERVER_ERROR,
                    "message": "Internal server error",
                    "error_code": ErrorCode.INTERNAL_ERROR,
                    "meta": ResponseMetadata(
                        request_id=getattr(request.state, "request_id", None)
                    ).dict(),
                }
            )


def setup_logging():
    """Configure logging for the backend."""
    import logging.handlers
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, settings.LOG_LEVEL))
    console_formatter = logging.Formatter(settings.LOG_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if enabled)
    if settings.ENABLE_FILE_LOGGING:
        import os
        os.makedirs(settings.LOG_DIR, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            filename=os.path.join(settings.LOG_DIR, "backend.log"),
            maxBytes=settings.LOG_FILE_MAX_BYTES,
            backupCount=settings.LOG_FILE_BACKUP_COUNT,
            encoding="utf-8"
        )
        file_handler.setLevel(getattr(logging, settings.LOG_LEVEL))
        file_formatter = logging.Formatter(settings.LOG_FORMAT)
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
    
    logger.info(f"Logging configured: {settings.LOG_LEVEL} (File: {settings.ENABLE_FILE_LOGGING})")


@asynccontextmanager
async def lifespan(app):
    """Application lifespan for startup and shutdown tasks."""
    # Startup
    logger.info("╭─────────────────────────────────────────────────────╮")
    logger.info("│      AushadhiAI Backend Starting                     │")
    logger.info(f"│      Environment: {settings.ENV:<33} │")
    logger.info(f"│      Debug: {settings.DEBUG!s:<44} │")
    logger.info(f"│      Server: {settings.HOST}:{settings.PORT:<39} │")
    logger.info("╰─────────────────────────────────────────────────────╯")
    
    setup_logging()
    
    yield
    
    # Shutdown
    logger.info("╭─────────────────────────────────────────────────────╮")
    logger.info("│      AushadhiAI Backend Shutting Down               │")
    logger.info("╰─────────────────────────────────────────────────────╯")
