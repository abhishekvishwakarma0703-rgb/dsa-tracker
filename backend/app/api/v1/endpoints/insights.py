"""
Insights/Notes API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.db.database import get_db
from app.db import models
from app.schemas.problem import InsightCreate, NoteUpdate, NoteResponse

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.post("/{problem_id}", response_model=NoteResponse, status_code=201)
async def create_insight(
    problem_id: int,
    data: InsightCreate,
    user_id: Optional[str] = Query(default="demo-user"),
    db: AsyncSession = Depends(get_db),
):
    # Verify problem exists
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Problem not found")

    note = models.Note(
        problem_id=problem_id,
        text=data.text,
        insight_type=data.insight_type,
        user_id=user_id,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/{problem_id}", response_model=List[NoteResponse])
async def get_problem_insights(problem_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Note)
        .where(models.Note.problem_id == problem_id)
        .order_by(models.Note.created_at.desc())
    )
    return result.scalars().all()


@router.get("/user/{user_id}", response_model=List[NoteResponse])
async def get_user_insights(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Note).where(models.Note.user_id == user_id)
    )
    return result.scalars().all()


@router.put("/{insight_id}", response_model=NoteResponse)
async def update_insight(insight_id: int, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Note).where(models.Note.id == insight_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Insight not found")
    if data.text is not None:
        note.text = data.text
    if data.insight_type is not None:
        note.insight_type = data.insight_type
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{insight_id}", status_code=204)
async def delete_insight(insight_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Note).where(models.Note.id == insight_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Insight not found")
    await db.delete(note)
    await db.commit()
