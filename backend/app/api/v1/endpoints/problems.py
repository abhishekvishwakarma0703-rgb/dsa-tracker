
"""
Problems endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import logging
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Problem, UserProblem, User, Tag
from app.schemas.problem import (
    ProblemCreateSchema, ProblemUpdateSchema, ProblemResponseSchema,
    UserProblemResponseSchema, UserProblemStatsSchema
)
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()

# --- HELPER SCHEMAS ---
class MarkStatusRequest(BaseModel):
    user_id: str

# --- ENDPOINTS ---
@router.post("/{problem_id}/mark-reviewed")
async def mark_problem_reviewed(problem_id: str, request: MarkStatusRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserProblem).where((UserProblem.problem_id == problem_id) & (UserProblem.user_id == request.user_id))
    )
    user_problem = result.scalar_one_or_none()
    if not user_problem:
        user_problem = UserProblem(user_id=request.user_id, problem_id=problem_id, is_revision=True)
        db.add(user_problem)
    else:
        user_problem.is_revision = not user_problem.is_revision
    await db.commit()
    return {"success": True, "is_revision": user_problem.is_revision}

@router.get("/", response_model=List[ProblemResponseSchema])
async def get_problems(
    db: AsyncSession = Depends(get_db),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    user_id: str = Query("demo-user")
):
    """Get all problems with filtering and user progress"""
    try:
        # Load problems with tags and insights eagerly to avoid lazy-load errors
        query = select(Problem).options(selectinload(Problem.tags), selectinload(Problem.insights))
        
        if difficulty:
            query = query.where(Problem.difficulty == difficulty)
        if category:
            query = query.where(Problem.category == category)
        if search:
            query = query.where(Problem.title.ilike(f"%{search}%"))
        
        query = query.offset(skip or 0).limit(limit or 1000)
        
        result = await db.execute(query)
        problems = result.scalars().all()

        # Fetch user progress for all problems in one pass
        problem_ids = [p.id for p in problems]
        user_progress_result = await db.execute(
            select(UserProblem).where(
                (UserProblem.user_id == user_id) & (UserProblem.problem_id.in_(problem_ids))
            )
        )
        user_progress = {up.problem_id: up for up in user_progress_result.scalars().all()}

        # Merge progress and attach notes/insights into the response schema
        final_problems = []
        for p in problems:
            progress = user_progress.get(p.id)
            # Create the schema and manually inject the progress fields
            p_dict = ProblemResponseSchema.from_orm(p)
            p_dict.done = progress.is_done if progress else False
            p_dict.revision = progress.is_revision if progress else False
            p_dict.views = progress.views if progress else 0
            # Attach all related insights as notes
            if hasattr(p, 'insights'):
                p_dict.notes = [i for i in p.insights]
            final_problems.append(p_dict)
        return final_problems
    except Exception as e:
        logger.error(f"Error fetching problems: {str(e)}")
        raise AppException("Failed to fetch problems", status_code=500)


@router.post("/{problem_id}/tags", response_model=ProblemResponseSchema)
async def add_tag_to_problem(
    problem_id: str,
    tag_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """Add a tag to a problem (creates tag if not found)"""
    try:
        # 1. Fetch problem with tags and insights loaded
        result = await db.execute(
            select(Problem).options(selectinload(Problem.tags), selectinload(Problem.insights)).where(Problem.id == problem_id)
        )
        problem = result.scalar_one_or_none()
        if not problem:
            raise AppException("Problem not found", status_code=404)

        # 2. Find tag by ID or Name
        tag_result = await db.execute(select(Tag).where((Tag.id == tag_id) | (Tag.name == tag_id)))
        tag = tag_result.scalar_one_or_none()

        # 3. Create tag if it doesn't exist
        if not tag:
            tag = Tag(name=tag_id)
            db.add(tag)
            await db.flush() # Get an ID without committing the whole transaction

        # 4. Associate and Commit
        if tag not in problem.tags:
            problem.tags.append(tag)
            await db.commit()
            await db.refresh(problem)
        
        return problem
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error adding tag: {str(e)}")
        raise AppException(f"Failed to add tag: {str(e)}", status_code=500)


@router.delete("/{problem_id}/tags/{tag_id}", response_model=ProblemResponseSchema)
async def remove_tag_from_problem(
    problem_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Remove a tag from a problem"""
    try:
        result = await db.execute(
            select(Problem).options(selectinload(Problem.tags), selectinload(Problem.insights)).where(Problem.id == problem_id)
        )
        problem = result.scalar_one_or_none()
        if not problem:
            raise AppException("Problem not found", status_code=404)

        tag_result = await db.execute(select(Tag).where(Tag.id == tag_id))
        tag = tag_result.scalar_one_or_none()
        
        if tag and tag in problem.tags:
            problem.tags.remove(tag)
            await db.commit()
            await db.refresh(problem)
            
        return problem
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error removing tag: {str(e)}")
        raise AppException("Failed to remove tag", status_code=500)


@router.get("/{problem_id}", response_model=ProblemResponseSchema)
async def get_problem(problem_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific problem with its tags and insights"""
    result = await db.execute(
        select(Problem).options(selectinload(Problem.tags), selectinload(Problem.insights)).where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise AppException("Problem not found", status_code=404)
    return problem


@router.post("/", response_model=ProblemResponseSchema, status_code=201)
async def create_problem(problem_data: ProblemCreateSchema, db: AsyncSession = Depends(get_db)):
    try:
        problem = Problem(**problem_data.dict(exclude={'solution_data', 'test_cases'}))
        if problem_data.solution_data:
            problem.solution_data = problem_data.solution_data.dict()
        if problem_data.test_cases:
            problem.test_cases = [tc.dict() for tc in problem_data.test_cases]
        
        db.add(problem)
        await db.commit()
        await db.refresh(problem)
        return problem
    except Exception as e:
        await db.rollback()
        raise AppException(f"Creation failed: {str(e)}", 500)


@router.post("/{problem_id}/mark-done")
async def mark_problem_done(problem_id: str, request: MarkStatusRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserProblem).where((UserProblem.problem_id == problem_id) & (UserProblem.user_id == request.user_id))
    )
    user_problem = result.scalar_one_or_none()
    
    if not user_problem:
        user_problem = UserProblem(user_id=request.user_id, problem_id=problem_id, is_done=True, completed_at=None)
        db.add(user_problem)
    else:
        user_problem.is_done = not user_problem.is_done
    
    await db.commit()
    return {"success": True, "is_done": user_problem.is_done}


@router.get("/{user_id}/stats", response_model=UserProblemStatsSchema)
async def get_user_problem_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProblem).where(UserProblem.user_id == user_id))
    ups = result.scalars().all()
    
    total = len(ups)
    done = sum(1 for x in ups if x.is_done)
    rev = sum(1 for x in ups if x.is_revision)
    
    return {
        "total_problems": total,
        "completed_problems": done,
        "revision_problems": rev,
        "progress_percentage": (done/total*100) if total > 0 else 0
    }