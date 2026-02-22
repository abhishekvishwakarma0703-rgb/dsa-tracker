"""
Solutions endpoints with code execution support
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Solution, Problem
from app.schemas.problem import (
    SolutionSubmitSchema, SolutionTestSchema, SolutionResponseSchema
)
from app.services.code_executor import execute_code
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/{problem_id}/submit", response_model=SolutionResponseSchema)
async def submit_solution(
    problem_id: str,
    user_id: str,
    solution_data: SolutionSubmitSchema,
    db: AsyncSession = Depends(get_db)
):
    """Submit a solution for a problem"""
    try:
        # Verify problem exists
        result = await db.execute(select(Problem).where(Problem.id == problem_id))
        problem = result.scalar_one_or_none()
        
        if not problem:
            raise AppException("Problem not found", status_code=404)
        
        # Create solution record
        solution = Solution(
            user_id=user_id,
            problem_id=problem_id,
            code=solution_data.code,
            language=solution_data.language,
            explanation=solution_data.explanation,
            approach=solution_data.approach,
            time_complexity=solution_data.time_complexity,
            space_complexity=solution_data.space_complexity
        )
        
        # Run test cases if available
        if problem.test_cases:
            test_results = []
            passed = 0
            
            for test_case in problem.test_cases:
                try:
                    result_data = await execute_code(
                        solution_data.code,
                        test_case["input"],
                        solution_data.language
                    )
                    is_passed = result_data.get("output") == test_case["expected"]
                    if is_passed:
                        passed += 1
                    test_results.append({
                        "input": test_case["input"],
                        "expected": test_case["expected"],
                        "output": result_data.get("output"),
                        "passed": is_passed,
                        "error": result_data.get("error")
                    })
                except Exception as e:
                    test_results.append({
                        "input": test_case["input"],
                        "expected": test_case["expected"],
                        "passed": False,
                        "error": str(e)
                    })
            
            solution.passed_test_cases = passed
            solution.total_test_cases = len(problem.test_cases)
            solution.test_results = test_results
        
        db.add(solution)
        await db.commit()
        await db.refresh(solution)
        
        logger.info(f"Solution submitted: {solution.id}")
        return solution
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error submitting solution: {str(e)}")
        raise AppException("Failed to submit solution", status_code=500)

@router.post("/{problem_id}/test")
async def test_solution(
    problem_id: str,
    test_data: SolutionTestSchema,
    db: AsyncSession = Depends(get_db)
):
    """Test a solution without submitting"""
    try:
        results = []
        passed = 0
        
        for test_case in test_data.test_cases:
            try:
                result = await execute_code(
                    test_data.code,
                    test_case.input,
                    test_data.language,
                    timeout=test_data.timeout
                )
                
                is_passed = result.get("output") == test_case.expected
                if is_passed:
                    passed += 1
                
                results.append({
                    "input": test_case.input,
                    "expected": test_case.expected,
                    "output": result.get("output"),
                    "passed": is_passed,
                    "error": result.get("error"),
                    "execution_time": result.get("execution_time")
                })
            except Exception as e:
                results.append({
                    "input": test_case.input,
                    "expected": test_case.expected,
                    "passed": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "total_test_cases": len(test_data.test_cases),
            "passed_test_cases": passed,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error testing solution: {str(e)}")
        raise AppException("Failed to test solution", status_code=500)

@router.get("/user/{user_id}")
async def get_user_solutions(
    user_id: str,
    problem_id: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get user's solutions"""
    try:
        query = select(Solution).where(Solution.user_id == user_id)
        
        if problem_id:
            query = query.where(Solution.problem_id == problem_id)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        solutions = result.scalars().all()
        
        return {"success": True, "data": solutions}
    except Exception as e:
        logger.error(f"Error fetching solutions: {str(e)}")
        raise AppException("Failed to fetch solutions", status_code=500)

@router.get("/{solution_id}")
async def get_solution(
    solution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific solution"""
    try:
        result = await db.execute(select(Solution).where(Solution.id == solution_id))
        solution = result.scalar_one_or_none()
        
        if not solution:
            raise AppException("Solution not found", status_code=404)
        
        return {"success": True, "data": solution}
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error fetching solution: {str(e)}")
        raise AppException("Failed to fetch solution", status_code=500)
