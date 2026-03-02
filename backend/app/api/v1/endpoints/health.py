"""
Health check endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check"""
    try:
        # Check database
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "DSA Problem Tracker API",
        "database": db_status,
        "version": "1.0.0"
    }
