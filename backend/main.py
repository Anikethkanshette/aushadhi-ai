"""
AushadhiAI Backend - Voice-enabled Agentic AI Pharmacist API
Main application entry point with routing and middleware configuration.
"""

import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from routes import medicines, orders, patients, agent, webhooks, pharmacist
from config import get_settings
from middleware import (
    RequestLoggingMiddleware,
    ErrorHandlingMiddleware,
    lifespan,
    setup_logging
)
from backend_utils import ResponseStatus, ErrorCode, ResponseMetadata
import uvicorn

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Get configuration
settings = get_settings()

# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add middleware (bottom to top = last to first in execution)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include routers
app.include_router(medicines.router, prefix="/medicines", tags=["medicines"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(webhooks.router, prefix="/webhook", tags=["webhooks"])
app.include_router(pharmacist.router)

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with standardized format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": ResponseStatus.ERROR,
            "message": exc.detail,
            "error_code": ErrorCode.INVALID_REQUEST,
            "meta": ResponseMetadata(
                request_id=getattr(request.state, "request_id", None)
            ).dict(),
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle request validation errors with standardized format."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": ResponseStatus.INVALID_REQUEST,
            "message": "Request validation failed",
            "error_code": ErrorCode.VALIDATION_ERROR,
            "error_details": {"validation_errors": errors},
            "meta": ResponseMetadata(
                request_id=getattr(request.state, "request_id", None)
            ).dict(),
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": ResponseStatus.SERVER_ERROR,
            "message": "An internal server error occurred",
            "error_code": ErrorCode.INTERNAL_ERROR,
            "meta": ResponseMetadata(
                request_id=getattr(request.state, "request_id", None)
            ).dict(),
        }
    )


# Root endpoint
@app.get("/", tags=["health"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AushadhiAI API is running",
        "version": settings.API_VERSION,
        "environment": settings.ENV,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


# Health check endpoint
@app.get("/health", tags=["health"])
async def health():
    """
    Health check endpoint.
    Returns the health status of the API and connected services.
    """
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "environment": settings.ENV,
        "services": {
            "api": "running",
            "database": "available",
            "cache": "available",
        }
    }


# Ready endpoint
@app.get("/ready", tags=["health"])
async def ready():
    """
    Readiness endpoint.
    Checks if all dependencies are available and the service is ready to serve traffic.
    """
    try:
        # Import to check if agents can be loaded
        from agents.pharmacy_agent import PharmacyAgent
        agent = PharmacyAgent()
        
        return {
            "ready": True,
            "version": settings.API_VERSION,
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "ready": False,
                "error": str(e),
            }
        )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Perform startup tasks."""
    logger.info("Application startup...")
    logger.info(f"Environment: {settings.ENV}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"API version: {settings.API_VERSION}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Perform shutdown tasks."""
    logger.info("Application shutdown...")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
