"""
Problems endpoints — fully JWT-secured, per-user isolation.
Add/delete/mark-done/mark-revision all operate on UserProblem records only.
The master Problem row is never deleted by a user action.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import logging
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Problem, UserProblem, User, Tag, Message, Insight, LeetCodeMaster
from app.schemas.problem import (
    ProblemCreateSchema, ProblemUpdateSchema, ProblemResponseSchema,
    UserProblemResponseSchema, UserProblemStatsSchema, AutosaveSchema
)
from app.core.auth import get_current_user
from app.middleware.error_handler import AppException
from sqlalchemy.exc import IntegrityError
logger = logging.getLogger(__name__)
router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_or_create_user_problem(db, user_id: str, problem_id: str) -> UserProblem:
    """Fetch or lazily create the UserProblem overlay row."""
    result = await db.execute(
        select(UserProblem).where(
            UserProblem.user_id == user_id,
            UserProblem.problem_id == problem_id
        )
    )
    up = result.scalar_one_or_none()
    if not up:
        up = UserProblem(user_id=user_id, problem_id=problem_id)
        db.add(up)
        await db.flush()
    return up


def _build_response(p: Problem, progress: Optional[UserProblem], chat_count: int = 0) -> ProblemResponseSchema:
    """Safely merges Problem ORM and UserProblem overlay."""
    # model_validate works because of 'lazy=selectin' in models 
    # and 'validation_alias' in schemas.
    schema = ProblemResponseSchema.model_validate(p)
    
    if progress:
        schema.done = progress.is_done
        schema.revision = progress.is_revision
        schema.views = progress.views
        schema.draft_code = progress.draft_code
        schema.draft_lang = progress.draft_lang
    print("chat count for problem",schema, p.id, chat_count)
    schema.chat_count = chat_count
    return schema

# ── GET /problems/ ────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ProblemResponseSchema])
async def get_problems(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
):
    # 1. Get user's specific progress records
    up_result = await db.execute(
        select(UserProblem).where(UserProblem.user_id == current_user.id)
    )
    user_problems_map = {up.problem_id: up for up in up_result.scalars().all()}
    print("current user id",current_user, current_user.id)
    # 2. Query ALL problems (or those in user's workspace based on your preference)
    # To ensure "All new users see this list", we fetch problems that 
    # HAVE a UserProblem record for this user.
    query = (
    select(Problem)
    .options(
        selectinload(Problem.tags), 
        selectinload(Problem.insights) # Use 'insights' here as defined in Model
    )
    .join(UserProblem)
    .where(UserProblem.user_id == current_user.id)
   )
 

    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if search:
        query = query.where(Problem.title.ilike(f"%{search}%"))

    result = await db.execute(query)
    problems = result.scalars().all()

    # 3. Get chat counts
    msg_rows = await db.execute(
        select(Message.problem_id, sql_func.count(Message.id).label("cnt"))
        .where(Message.problem_id.in_([p.id for p in problems]))
        .group_by(Message.problem_id)
    )
    chat_counts = {r.problem_id: r.cnt for r in msg_rows}

    return [
        _build_response(p, user_problems_map.get(p.id), chat_counts.get(p.id, 0)) 
        for p in problems
    ]
# ── POST /problems/add-from-master ────────────────────────────────────────────

@router.post("/add-from-master/{master_id}", response_model=ProblemResponseSchema, status_code=201)
async def add_problem_to_workspace(
    master_id: int,
    category: str = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds a problem from LeetCodeMaster to the user's workspace.
    Uses 'category_title' from master as the Problem category.
    """
    # 1. Fetch from Master List
    master_result = await db.execute(
        select(LeetCodeMaster).where(LeetCodeMaster.id == master_id)
    )
    master_item = master_result.scalar_one_or_none()
    
    if not master_item:
        raise AppException("LeetCode problem not found in master list", status_code=404)

    # 2. Check if Problem exists globally (by slug)
    prob_query = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.insights))
        .where(Problem.leetcode_slug == master_item.title_slug)
    )
    problem = prob_query.scalar_one_or_none()

    # 3. Create Problem if it doesn't exist
    if not problem:
        # We use category_title from the master list (e.g., 'Algorithms')
        problem = Problem(
            title=master_item.title,
            difficulty=master_item.difficulty,
            category=category or master_item.category_title or "Algorithms",
            leetcode_id=master_item.question_id,
            leetcode_slug=master_item.title_slug,
            description="", # Will be populated by the /leetcode/{slug} cache endpoint later
        )
        db.add(problem)
        
        # Sync Tags
        if master_item.topic_tags:
            for t_data in master_item.topic_tags:
                tag_name = t_data.get("name")
                if not tag_name:
                    continue

                # 1. Try to find the tag first
                tag_res = await db.execute(select(Tag).where(Tag.name == tag_name))
                tag = tag_res.scalar_one_or_none()

                if not tag:
                    # 2. If it doesn't exist, try to create it
                    try:
                        # nested_begin() creates a SAVEPOINT to handle the local error
                        async with db.begin_nested():
                            tag = Tag(name=tag_name)
                            db.add(tag)
                            await db.flush()
                    except IntegrityError:
                        # 3. If someone else created it since our first check, 
                        # catch the error and fetch the now-existing tag
                        tag_res = await db.execute(select(Tag).where(Tag.name == tag_name))
                        tag = tag_res.scalar_one_or_none()

                # 4. Safely attach to problem (SQLAlchemy handles duplicates here)
                if tag and tag not in problem.tags:
                    problem.tags.append(tag)

    # 4. Create User-specific Link (UserProblem)
    up_result = await db.execute(
        select(UserProblem).where(
            UserProblem.user_id == current_user.id,
            UserProblem.problem_id == problem.id
        )
    )
    up = up_result.scalar_one_or_none()
    
    if not up:
        up = UserProblem(user_id=current_user.id, problem_id=problem.id)
        db.add(up)
    
    await db.commit()
    await db.refresh(problem)

    # 5. Get chat count
    cnt_res = await db.execute(
        select(sql_func.count(Message.id)).where(Message.problem_id == problem.id)
    )
    
    return _build_response(problem, up, cnt_res.scalar() or 0)
# ── DELETE /problems/{id} — removes from user's workspace only ────────────────

@router.delete("/{problem_id}", status_code=204)
async def remove_problem_from_workspace(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a problem from THIS user's workspace. Does NOT delete the master row."""
    result = await db.execute(
        select(UserProblem).where(
            UserProblem.user_id    == current_user.id,
            UserProblem.problem_id == problem_id,
        )
    )
    up = result.scalar_one_or_none()
    if not up:
        raise HTTPException(status_code=404, detail="Problem not in your workspace")
    await db.delete(up)
    await db.commit()
    return None


# ── MARK DONE ────────────────────────────────────────────────────────────────

@router.post("/{problem_id}/mark-done")
async def mark_problem_done(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    up = await _get_or_create_user_problem(db, current_user.id, problem_id)
    up.is_done = not up.is_done
    await db.commit()
    return {"success": True, "is_done": up.is_done}


# ── MARK REVISION ────────────────────────────────────────────────────────────

@router.post("/{problem_id}/mark-reviewed")
async def mark_problem_reviewed(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    up = await _get_or_create_user_problem(db, current_user.id, problem_id)
    up.is_revision = not up.is_revision
    await db.commit()
    return {"success": True, "is_revision": up.is_revision}


# ── AUTOSAVE DRAFT ────────────────────────────────────────────────────────────

@router.patch("/{problem_id}/autosave")
async def autosave_draft(
    problem_id: str,
    payload: AutosaveSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    up = await _get_or_create_user_problem(db, current_user.id, problem_id)
    up.draft_code = payload.code
    up.draft_lang = payload.language
    await db.commit()
    return {"success": True}


# ── GET /problems/{id} ────────────────────────────────────────────────────────

@router.get("/{problem_id}", response_model=ProblemResponseSchema)
async def get_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.insights))
        .where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise AppException("Problem not found", status_code=404)

    up_res = await db.execute(
        select(UserProblem).where(
            UserProblem.user_id == current_user.id,
            UserProblem.problem_id == problem_id,
        )
    )
    up = up_res.scalar_one_or_none()

    cnt_res = await db.execute(
        select(sql_func.count(Message.id)).where(Message.problem_id == problem_id)
    )
    chat_count = cnt_res.scalar() or 0

    # increment views
    if up:
        up.views = (up.views or 0) + 1
        await db.commit()

    return _build_response(problem, up, chat_count)


# ── POST /problems/ — create in master bank + add to workspace ────────────────

@router.post("/", response_model=ProblemResponseSchema, status_code=201)
async def create_problem(
    problem_data: ProblemCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        problem = Problem(
            **problem_data.model_dump(exclude={"solution_data", "test_cases"})
        )
        if problem_data.solution_data:
            problem.solution_data = problem_data.solution_data.model_dump()
        if problem_data.test_cases:
            problem.test_cases = [tc.model_dump() for tc in problem_data.test_cases]
        db.add(problem)
        await db.flush()

        # Automatically add to creator's workspace
        up = UserProblem(user_id=current_user.id, problem_id=problem.id)
        db.add(up)
        await db.commit()
        await db.refresh(problem)
        return _build_response(problem, up)
    except Exception as e:
        await db.rollback()
        raise AppException(f"Creation failed: {e}", 500)


# ── TAGS ──────────────────────────────────────────────────────────────────────

@router.post("/{problem_id}/tags", response_model=ProblemResponseSchema)
async def add_tag_to_problem(
    problem_id: str,
    tag_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.insights))
        .where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise AppException("Problem not found", status_code=404)

    tag_result = await db.execute(select(Tag).where((Tag.id == tag_id) | (Tag.name == tag_id)))
    tag = tag_result.scalar_one_or_none()
    if not tag:
        tag = Tag(name=tag_id)
        db.add(tag)
        await db.flush()

    if tag not in problem.tags:
        problem.tags.append(tag)
        await db.commit()
        await db.refresh(problem)

    up_res = await db.execute(
        select(UserProblem).where(UserProblem.user_id == current_user.id, UserProblem.problem_id == problem_id)
    )
    return _build_response(problem, up_res.scalar_one_or_none())


@router.delete("/{problem_id}/tags/{tag_id}", response_model=ProblemResponseSchema)
async def remove_tag_from_problem(
    problem_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.insights))
        .where(Problem.id == problem_id)
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

    up_res = await db.execute(
        select(UserProblem).where(UserProblem.user_id == current_user.id, UserProblem.problem_id == problem_id)
    )
    return _build_response(problem, up_res.scalar_one_or_none())


# ── STATS ─────────────────────────────────────────────────────────────────────

@router.get("/me/stats", response_model=UserProblemStatsSchema)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserProblem).where(UserProblem.user_id == current_user.id)
    )
    ups = result.scalars().all()
    total = len(ups)
    done  = sum(1 for x in ups if x.is_done)
    rev   = sum(1 for x in ups if x.is_revision)
    return {
        "total_problems": total,
        "completed_problems": done,
        "revision_problems": rev,
        "progress_percentage": (done / total * 100) if total > 0 else 0,
    }
