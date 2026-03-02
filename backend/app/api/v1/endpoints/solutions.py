"""
Solutions endpoints — JWT-secured, versioned submissions, autosave.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Solution, Problem, UserProblem, User
from app.schemas.problem import SolutionSubmitSchema, SolutionTestSchema, SolutionResponseSchema
from app.services.code_executor import execute_code
from app.core.auth import get_current_user
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()


async def _next_version(db: AsyncSession, user_id: str, problem_id: str) -> int:
    """Return next version number for this user+problem."""
    result = await db.execute(
        select(sql_func.max(Solution.version_number)).where(
            Solution.user_id    == user_id,
            Solution.problem_id == problem_id,
        )
    )
    max_ver = result.scalar()
    return (max_ver or 0) + 1


@router.post("/{problem_id}/submit", response_model=SolutionResponseSchema)
async def submit_solution(
    problem_id: str,
    solution_data: SolutionSubmitSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a solution. Creates versioned record; runs test cases if available."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise AppException("Problem not found", status_code=404)

    version = await _next_version(db, current_user.id, problem_id)

    solution = Solution(
        user_id        = current_user.id,
        problem_id     = problem_id,
        code           = solution_data.code,
        language       = solution_data.language,
        explanation    = solution_data.explanation,
        approach       = solution_data.approach,
        time_complexity  = solution_data.time_complexity,
        space_complexity = solution_data.space_complexity,
        version_number = version,
    )

    # Run test cases
    if problem.test_cases:
        test_results = []
        passed = 0
        for tc in problem.test_cases:
            try:
                res = await execute_code(solution_data.code, tc["input"], solution_data.language)
                ok  = str(res.get("output", "")).strip() == str(tc["expected"]).strip()
                if ok:
                    passed += 1
                test_results.append({
                    "input":    tc["input"],
                    "expected": tc["expected"],
                    "output":   res.get("output"),
                    "passed":   ok,
                    "error":    res.get("error"),
                    "execution_time": res.get("execution_time"),
                })
            except Exception as e:
                test_results.append({"input": tc["input"], "expected": tc["expected"], "passed": False, "error": str(e)})

        solution.passed_test_cases = passed
        solution.total_test_cases  = len(problem.test_cases)
        solution.test_results      = test_results

    db.add(solution)

    # Mark user_problem as attempted
    up_res = await db.execute(
        select(UserProblem).where(
            UserProblem.user_id    == current_user.id,
            UserProblem.problem_id == problem_id,
        )
    )
    up = up_res.scalar_one_or_none()
    if up:
        from datetime import datetime
        up.last_attempted_at = datetime.utcnow()
        if not up.first_attempted_at:
            up.first_attempted_at = datetime.utcnow()

    await db.commit()
    await db.refresh(solution)
    logger.info(f"Solution v{version} submitted by {current_user.username} for problem {problem_id}")
    return solution


@router.post("/{problem_id}/test")
async def test_solution(
    problem_id: str,
    test_data: SolutionTestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run code against provided test cases without saving."""
    results = []
    passed  = 0
    for tc in test_data.test_cases:
        try:
            res  = await execute_code(test_data.code, tc.input, test_data.language, timeout=test_data.timeout)
            ok   = str(res.get("output", "")).strip() == str(tc.expected).strip()
            if ok:
                passed += 1
            results.append({
                "input":    tc.input,
                "expected": tc.expected,
                "output":   res.get("output"),
                "passed":   ok,
                "error":    res.get("error"),
                "execution_time": res.get("execution_time"),
            })
        except Exception as e:
            results.append({"input": tc.input, "expected": tc.expected, "passed": False, "error": str(e)})

    return {"success": True, "total_test_cases": len(test_data.test_cases), "passed_test_cases": passed, "results": results}


@router.get("/me/history")
async def get_my_solutions(
    problem_id: str = Query(None),
    skip: int  = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's submission history (optionally filtered by problem)."""
    query = select(Solution).where(Solution.user_id == current_user.id)
    if problem_id:
        query = query.where(Solution.problem_id == problem_id)
    query = query.order_by(Solution.created_at.desc()).offset(skip).limit(limit)
    result  = await db.execute(query)
    sols    = result.scalars().all()
    return {"success": True, "data": [SolutionResponseSchema.model_validate(s) for s in sols]}


@router.get("/{solution_id}", response_model=SolutionResponseSchema)
async def get_solution(
    solution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Solution).where(
            Solution.id      == solution_id,
            Solution.user_id == current_user.id,   # enforce ownership
        )
    )
    solution = result.scalar_one_or_none()
    if not solution:
        raise AppException("Solution not found", status_code=404)
    return solution
