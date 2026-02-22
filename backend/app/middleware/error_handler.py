"""
Error handling middleware and utilities
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class AppException(Exception):
    """Custom application exception"""
    def __init__(self, message: str, status_code: int = 400, details: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}

async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom app exceptions"""
    logger.error(f"Application exception: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "details": exc.details
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation exceptions"""
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors()
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Handle generic exceptions"""
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "details": {} if not logger.isEnabledFor(logging.DEBUG) else {"exception": str(exc)}
        }
    )

def setup_error_handlers(app: FastAPI):
    """Setup error handlers for the app"""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
