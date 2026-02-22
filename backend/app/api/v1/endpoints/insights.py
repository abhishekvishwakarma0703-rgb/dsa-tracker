"""
Insights endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Insight
from app.schemas.problem import InsightCreateSchema, InsightResponseSchema
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/{problem_id}", response_model=InsightResponseSchema)
async def create_insight(
    problem_id: str,
    user_id: str,
    insight_data: InsightCreateSchema,
    db: AsyncSession = Depends(get_db)
):
    """Create an insight for a problem"""
    try:
        insight = Insight(
            user_id=user_id,
            problem_id=problem_id,
            text=insight_data.text,
            insight_type=insight_data.insight_type
        )
        
        db.add(insight)
        await db.commit()
        await db.refresh(insight)
        
        logger.info(f"Insight created: {insight.id}")
        return insight
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating insight: {str(e)}")
        raise AppException("Failed to create insight", status_code=500)

@router.get("/{problem_id}", response_model=List[InsightResponseSchema])
async def get_problem_insights(
    problem_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get insights for a problem"""
    try:
        query = select(Insight).where(Insight.problem_id == problem_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        insights = result.scalars().all()
        
        return insights
    except Exception as e:
        logger.error(f"Error fetching insights: {str(e)}")
        raise AppException("Failed to fetch insights", status_code=500)

@router.get("/user/{user_id}")
async def get_user_insights(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get user's insights"""
    try:
        query = select(Insight).where(Insight.user_id == user_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        insights = result.scalars().all()
        
        return {"success": True, "data": insights}
    except Exception as e:
        logger.error(f"Error fetching insights: {str(e)}")
        raise AppException("Failed to fetch insights", status_code=500)

@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an insight"""
    try:
        result = await db.execute(select(Insight).where(Insight.id == insight_id))
        insight = result.scalar_one_or_none()
        
        if not insight:
            raise AppException("Insight not found", status_code=404)
        
        await db.delete(insight)
        await db.commit()
        
        logger.info(f"Insight deleted: {insight.id}")
        return {"success": True}
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting insight: {str(e)}")
        raise AppException("Failed to delete insight", status_code=500)


# Update insight (note)
from app.schemas.problem import InsightUpdateSchema
from fastapi import Body

@router.put("/{insight_id}")
async def update_insight(
    insight_id: str,
    insight_data: InsightUpdateSchema = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an insight (note)"""
    try:
        result = await db.execute(select(Insight).where(Insight.id == insight_id))
        insight = result.scalar_one_or_none()
        if not insight:
            raise AppException("Insight not found", status_code=404)
        if insight_data.text is not None:
            insight.text = insight_data.text
        if insight_data.insight_type is not None:
            insight.insight_type = insight_data.insight_type
        await db.commit()
        await db.refresh(insight)
        logger.info(f"Insight updated: {insight.id}")
        return {"success": True, "data": insight}
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating insight: {str(e)}")
        raise AppException("Failed to update insight", status_code=500)
