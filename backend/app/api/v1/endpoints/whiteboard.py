"""
Whiteboard API — save/load Excalidraw canvas state per problem
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any

from app.db.database import get_db
from app.db import models
from app.schemas.problem import WhiteboardSave, WhiteboardResponse

router = APIRouter(prefix="/whiteboard", tags=["Whiteboard"])


@router.get("/{problem_id}", response_model=dict)
async def get_whiteboard(problem_id: int, db: AsyncSession = Depends(get_db)):
    """Load whiteboard canvas state for a problem"""
    result = await db.execute(
        select(models.Whiteboard).where(models.Whiteboard.problem_id == problem_id)
    )
    wb = result.scalar_one_or_none()
    if not wb:
        return {"problem_id": problem_id, "canvas_data": None}
    return {
        "id": wb.id,
        "problem_id": wb.problem_id,
        "canvas_data": wb.canvas_data,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
    }


@router.post("/{problem_id}", response_model=dict)
async def save_whiteboard(problem_id: int, body: WhiteboardSave, db: AsyncSession = Depends(get_db)):
    """Save (upsert) whiteboard canvas state"""
    # Verify problem exists
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Problem not found")

    # Upsert
    result = await db.execute(
        select(models.Whiteboard).where(models.Whiteboard.problem_id == problem_id)
    )
    wb = result.scalar_one_or_none()

    if wb:
        wb.canvas_data = body.canvas_data
    else:
        wb = models.Whiteboard(problem_id=problem_id, canvas_data=body.canvas_data)
        db.add(wb)

    await db.commit()
    await db.refresh(wb)
    return {
        "id": wb.id,
        "problem_id": wb.problem_id,
        "canvas_data": wb.canvas_data,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
    }
