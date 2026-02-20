"""
Solutions API + Code Execution Endpoint
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import subprocess, sys, tempfile, os, json, time, asyncio, logging

from app.db.database import get_db
from app.db import models
from app.schemas.problem import SolutionSubmit, SolutionTest, SolutionResponse

router = APIRouter(prefix="/solutions", tags=["Solutions"])
logger = logging.getLogger(__name__)

# ─── Execute Endpoint ─────────────────────────────────────────
execute_router = APIRouter(prefix="/execute", tags=["Execute"])

EXEC_TIMEOUT = 10  # seconds


def _run_python_code(code: str, test_cases: list) -> dict:
    """
    Run Python code against test cases in a subprocess sandbox.
    Returns per-testcase results.
    """
    results = []
    total_start = time.time()

    for i, tc in enumerate(test_cases):
        input_str = tc.get("input", "")
        expected = tc.get("expected", None)

        # Wrap code to capture output
        runner = f"""
import sys, io
_captured = io.StringIO()
sys.stdout = _captured

{code}

sys.stdout = sys.__stdout__
_out = _captured.getvalue().strip()
print(_out)
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(runner)
            tmpfile = f.name

        try:
            start = time.time()
            proc = subprocess.run(
                [sys.executable, tmpfile],
                input=input_str,
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT,
            )
            elapsed_ms = round((time.time() - start) * 1000, 2)
            stdout = proc.stdout.strip()
            stderr = proc.stderr.strip()

            passed = None
            if expected is not None:
                passed = str(stdout) == str(expected)

            results.append({
                "test_case": i + 1,
                "input": input_str,
                "expected": str(expected) if expected is not None else None,
                "actual": stdout,
                "passed": passed,
                "runtime_ms": elapsed_ms,
                "error": stderr if stderr else None,
            })
        except subprocess.TimeoutExpired:
            results.append({
                "test_case": i + 1,
                "input": input_str,
                "expected": str(expected) if expected is not None else None,
                "actual": None,
                "passed": False,
                "runtime_ms": EXEC_TIMEOUT * 1000,
                "error": "Time Limit Exceeded",
            })
        except Exception as e:
            results.append({
                "test_case": i + 1,
                "input": input_str,
                "passed": False,
                "error": str(e),
                "runtime_ms": 0,
            })
        finally:
            try:
                os.unlink(tmpfile)
            except Exception:
                pass

    total_ms = round((time.time() - total_start) * 1000, 2)
    passed_count = sum(1 for r in results if r.get("passed") is True)
    return {
        "results": results,
        "passed": passed_count,
        "total": len(results),
        "all_passed": passed_count == len(results),
        "total_runtime_ms": total_ms,
    }


class ExecuteBody(SolutionTest):
    test_cases: Optional[List[dict]] = []


@execute_router.post("")
async def execute_code(body: ExecuteBody):
    """
    Execute code against test cases.
    Currently supports Python only.
    Sandboxed via subprocess with timeout.
    """
    if body.language not in ("python3", "python"):
        return {
            "results": [],
            "passed": 0,
            "total": 0,
            "all_passed": False,
            "error": f"Language '{body.language}' not supported for execution. Python only.",
        }

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        _run_python_code,
        body.code,
        body.test_cases or [],
    )
    return result


# ─── Solutions CRUD ───────────────────────────────────────────

@router.post("/{problem_id}/submit", response_model=dict)
async def submit_solution(
    problem_id: int,
    body: SolutionSubmit,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.Problem).where(models.Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    sol = models.Solution(
        problem_id=problem_id,
        user_id=body.user_id or "demo-user",
        code=body.code,
        language=body.language,
        explanation=body.explanation,
    )
    db.add(sol)
    await db.commit()
    await db.refresh(sol)
    return {
        "id": sol.id,
        "problem_id": sol.problem_id,
        "language": sol.language,
        "created_at": sol.created_at.isoformat() if sol.created_at else None,
        "message": "Solution saved",
    }


@router.post("/{problem_id}/test")
async def test_solution(problem_id: int, body: SolutionTest, db: AsyncSession = Depends(get_db)):
    """Test solution without saving — runs code execution"""
    if body.language not in ("python3", "python"):
        return {"message": "Execution only available for Python currently"}
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_python_code, body.code, [])
    return result


@router.get("/user/{user_id}", response_model=List[dict])
async def get_user_solutions(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Solution).where(models.Solution.user_id == user_id)
    )
    solutions = result.scalars().all()
    return [
        {
            "id": s.id,
            "problem_id": s.problem_id,
            "language": s.language,
            "code": s.code,
            "is_correct": s.is_correct,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in solutions
    ]


@router.get("/{solution_id}", response_model=dict)
async def get_solution(solution_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Solution).where(models.Solution.id == solution_id))
    sol = result.scalar_one_or_none()
    if not sol:
        raise HTTPException(status_code=404, detail="Solution not found")
    return {
        "id": sol.id,
        "problem_id": sol.problem_id,
        "language": sol.language,
        "code": sol.code,
        "is_correct": sol.is_correct,
        "created_at": sol.created_at.isoformat() if sol.created_at else None,
    }
