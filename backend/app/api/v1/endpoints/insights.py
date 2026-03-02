"""
Insights endpoints — JWT-secured, per-user.
"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Insight, User
from app.schemas.problem import InsightCreateSchema, InsightUpdateSchema, InsightResponseSchema
from app.core.auth import get_current_user
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{problem_id}", response_model=InsightResponseSchema)
async def create_insight(
    problem_id: str,
    insight_data: InsightCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    insight = Insight(
        user_id=current_user.id,
        problem_id=problem_id,
        text=insight_data.text,
        insight_type=insight_data.insight_type,
    )
    db.add(insight)
    await db.commit()
    await db.refresh(insight)
    return insight


@router.get("/{problem_id}", response_model=List[InsightResponseSchema])
async def get_problem_insights(
    problem_id: str,
    skip: int  = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return only THIS user's insights for the problem."""
    result = await db.execute(
        select(Insight)
        .where(Insight.problem_id == problem_id, Insight.user_id == current_user.id)
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.put("/{insight_id}")
async def update_insight(
    insight_id: str,
    insight_data: InsightUpdateSchema = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Insight).where(Insight.id == insight_id, Insight.user_id == current_user.id)
    )
    insight = result.scalar_one_or_none()
    if not insight:
        raise AppException("Insight not found", status_code=404)
    if insight_data.text is not None:
        insight.text = insight_data.text
    if insight_data.insight_type is not None:
        insight.insight_type = insight_data.insight_type
    await db.commit()
    await db.refresh(insight)
    return {"success": True, "data": InsightResponseSchema.model_validate(insight)}


@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Insight).where(Insight.id == insight_id, Insight.user_id == current_user.id)
    )
    insight = result.scalar_one_or_none()
    if not insight:
        raise AppException("Insight not found", status_code=404)
    await db.delete(insight)
    await db.commit()
    return {"success": True}
