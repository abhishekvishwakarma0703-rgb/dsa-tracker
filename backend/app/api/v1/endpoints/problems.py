"""
Problems API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
import logging

from app.db.database import get_db
from app.db import models
from app.schemas.problem import (
    ProblemCreate, ProblemUpdate, ProblemResponse, MarkDone, AddTagBody
)

router = APIRouter(prefix="/problems", tags=["Problems"])
logger = logging.getLogger(__name__)


def _problem_to_dict(p: models.Problem) -> dict:
    """Convert Problem model to frontend-compatible dict"""
    notes_list = [
        {
            "id": n.id,
            "text": n.text,
            "insight_type": n.insight_type,
            "problem_id": n.problem_id,
            "user_id": n.user_id,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in (p.notes or [])
    ]
    tags_list = [{"id": t.id, "name": t.name} for t in (p.tags or [])]
    return {
        "id": p.id,
        "title": p.title,
        "difficulty": p.difficulty,
        "category": p.category,
        "section_id": p.section_id,
        "pattern": p.pattern,
        "leetcode_id": p.leetcode_id,
        "leetcode_slug": p.leetcode_slug,
        "is_done": p.is_done,
        "is_revision": p.is_revision,
        "done": p.is_done,
        "revision": p.is_revision,
        "acceptance_rate": p.acceptance_rate,
        "tags": tags_list,
        "notes": notes_list,
        "insights": notes_list,
    }


@router.get("", response_model=List[dict])
async def get_problems(
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
):
    q = select(models.Problem).options(
        selectinload(models.Problem.tags),
        selectinload(models.Problem.notes),
    )
    if difficulty:
        q = q.where(models.Problem.difficulty == difficulty)
    if category:
        q = q.where(models.Problem.category == category)
    if search:
        q = q.where(models.Problem.title.ilike(f"%{search}%"))

    q = q.offset(skip).limit(limit).order_by(models.Problem.id)
    result = await db.execute(q)
    problems = result.scalars().all()
    return [_problem_to_dict(p) for p in problems]


@router.get("/{problem_id}", response_model=dict)
async def get_problem(problem_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags), selectinload(models.Problem.notes))
        .where(models.Problem.id == problem_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    return _problem_to_dict(p)


@router.post("", response_model=dict, status_code=201)
async def create_problem(data: ProblemCreate, db: AsyncSession = Depends(get_db)):
    p = models.Problem(**data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    # Reload with relationships
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags), selectinload(models.Problem.notes))
        .where(models.Problem.id == p.id)
    )
    p = result.scalar_one()
    return _problem_to_dict(p)


@router.put("/{problem_id}", response_model=dict)
async def update_problem(problem_id: int, data: ProblemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags), selectinload(models.Problem.notes))
        .where(models.Problem.id == p.id)
    )
    p = result.scalar_one()
    return _problem_to_dict(p)


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(problem_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    await db.delete(p)
    await db.commit()


@router.post("/{problem_id}/mark-done")
async def mark_done(problem_id: int, body: MarkDone, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    p.is_done = not p.is_done
    await db.commit()
    return {"id": p.id, "is_done": p.is_done, "done": p.is_done}


@router.post("/{problem_id}/mark-reviewed")
async def mark_reviewed(problem_id: int, body: MarkDone, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    p.is_revision = not p.is_revision
    await db.commit()
    return {"id": p.id, "is_revision": p.is_revision, "revision": p.is_revision}


@router.post("/{problem_id}/tags")
async def add_tag_to_problem(problem_id: int, body: AddTagBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags))
        .where(models.Problem.id == problem_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    tag_result = await db.execute(select(models.Tag).where(models.Tag.id == body.tag_id))
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag not in p.tags:
        p.tags.append(tag)
        await db.commit()
    return {"ok": True}


@router.delete("/{problem_id}/tags/{tag_id}")
async def remove_tag_from_problem(problem_id: int, tag_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags))
        .where(models.Problem.id == problem_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    p.tags = [t for t in p.tags if t.id != tag_id]
    await db.commit()
    return {"ok": True}


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Problem))
    problems = result.scalars().all()
    total = len(problems)
    done = sum(1 for p in problems if p.is_done)
    revision = sum(1 for p in problems if p.is_revision)
    return {"total": total, "done": done, "revision": revision,
            "progress": round((done / total * 100) if total else 0, 1)}
