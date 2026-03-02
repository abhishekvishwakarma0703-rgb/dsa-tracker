"""
AI Tutor Endpoint — includes test case generation + complexity analysis.
POST /api/v1/tutor/chat
POST /api/v1/tutor/generate-test-cases/{problem_id}
POST /api/v1/tutor/analyze-complexity
GET  /api/v1/tutor/hints/{problem_id}
GET  /api/v1/tutor/history
DELETE /api/v1/tutor/history
GET  /api/v1/tutor/usage
GET  /api/v1/tutor/models
"""

import json
import logging
from datetime import date as _date
from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import TutorMessage, LeetCodeCache, AiUsage, Problem, User
from app.middleware.error_handler import AppException
from app.services.ai_provider import call_ai, get_models_list, MODELS, DEFAULT_MODEL
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TutorChatRequest(BaseModel):
    session_id:   str
    message:      str
    problem_slug: str
    user_code:    Optional[str] = ""
    language:     Optional[str] = "python3"
    msg_type:     Optional[str] = "chat"
    hint_level:   Optional[int] = 1
    model:        Optional[str] = DEFAULT_MODEL

class AnalyzeComplexityRequest(BaseModel):
    code:     str
    language: str = "python3"
    problem_title: Optional[str] = ""
    model:    Optional[str] = DEFAULT_MODEL

class GenerateTestCasesRequest(BaseModel):
    model: Optional[str] = DEFAULT_MODEL


# ── Usage helpers ─────────────────────────────────────────────────────────────

async def _increment_usage(db: AsyncSession, model: str) -> None:
    today    = _date.today().isoformat()
    provider = MODELS.get(model, {}).get("provider", "unknown")
    res = await db.execute(
        select(AiUsage).where(AiUsage.date_str == today, AiUsage.model == model)
    )
    row = res.scalar_one_or_none()
    if row:
        row.req_count += 1
    else:
        db.add(AiUsage(date_str=today, provider=provider, model=model, req_count=1))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        await db.execute(
            update(AiUsage)
            .where(AiUsage.date_str == today, AiUsage.model == model)
            .values(req_count=AiUsage.req_count + 1)
        )
        await db.commit()


# ── Prompt builders ───────────────────────────────────────────────────────────

def _build_system(problem, language: str) -> str:
    prob_block = ""
    if problem:
        tags  = ", ".join(problem.tags or []) or "general"
        desc  = (problem.description or "")[:3000]
        starter = problem.starter_code or ""
        prob_block = f"""
PROBLEM YOU ARE TUTORING:
  Title:       {problem.title}
  Difficulty:  {problem.difficulty or "Unknown"}
  Topics:      {tags}
  Description: {desc}
  Starter code ({language}):
  ```{language}
  {starter}
  ```
"""
    return f"""You are an expert DSA tutor named "Mentor". Warm, encouraging, Socratic method.
- Guide with questions, don't give answers directly.
- Reveal hints progressively — never the full solution unless explicitly asked.
- Point out what's GOOD before what's wrong.
{prob_block}
FORMATTING: Use markdown — **bold**, `code`, ```lang blocks```.
Keep responses concise (3-6 sentences for hints). Always end hints with a question.
"""


def _hint_prompt(level: int, user_code: str, language: str) -> str:
    scaffolds = {
        1: "Very gentle directional nudge. Hint at the category without naming it. Ask a leading question about data structures. No technique names.",
        2: "Name the key technique/data structure. Explain WHY it helps. No code yet. Ask what to store.",
        3: "Describe algorithm step-by-step in plain English. State time+space targets. No code. Ask if they want to try.",
    }
    code_ctx = ""
    if user_code and user_code.strip() and "# Write your solution" not in user_code:
        code_ctx = f"\nStudent's code:\n```{language}\n{user_code}\n```"
    return f"Student asked for Level {level} hint.\nGuide: {scaffolds.get(level, scaffolds[2])}\n{code_ctx}\nReply as Mentor."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat")
async def tutor_chat(
    req: TutorChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = req.model if req.model in MODELS else DEFAULT_MODEL

    problem = None
    if req.problem_slug:
        res = await db.execute(select(LeetCodeCache).where(LeetCodeCache.slug == req.problem_slug))
        problem = res.scalar_one_or_none()

    system = _build_system(problem, req.language)

    hist_res = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.session_id == req.session_id)
        .order_by(TutorMessage.created_at).limit(30)
    )
    messages = [
        {"role": m.role, "content": m.content}
        for m in hist_res.scalars().all()
        if m.role in ("user", "assistant")
    ]

    if req.msg_type == "hint":
        user_content = _hint_prompt(req.hint_level, req.user_code, req.language)
    elif req.msg_type == "review":
        if not req.user_code or not req.user_code.strip():
            return {"reply": "I don't see any code yet! Write something first. 🙂", "msg_type": "review", "model": model}
        user_content = f"Review this code:\n```{req.language}\n{req.user_code}\n```\nStructure: strengths, correctness, complexity, quality, one improvement. End encouragingly."
    elif req.msg_type == "solution":
        user_content = f"Student asked for full solution. Provide clean {req.language} solution with comments, time+space complexity, and one tip for similar problems."
    else:
        code_ctx = ""
        if req.user_code and req.user_code.strip() and "# Write your solution" not in req.user_code:
            code_ctx = f"\n\n[Student's code — {req.language}]:\n```{req.language}\n{req.user_code[:2000]}\n```"
        user_content = req.message + code_ctx

    messages.append({"role": "user", "content": user_content})

    try:
        reply = await call_ai(model=model, system=system, messages=messages, max_tokens=1200)
    except Exception as e:
        logger.error("AI error: %s", e)
        raise AppException(f"AI service error: {e}", status_code=502)

    await _increment_usage(db, model)
    db.add(TutorMessage(session_id=req.session_id, role="user",      content=req.message, msg_type=req.msg_type, hint_level=req.hint_level if req.msg_type == "hint" else 0))
    db.add(TutorMessage(session_id=req.session_id, role="assistant", content=reply,        msg_type=req.msg_type))
    await db.commit()
    return {"reply": reply, "msg_type": req.msg_type, "model": model}


@router.post("/generate-test-cases/{problem_id}")
async def generate_test_cases(
    problem_id: str,
    req: GenerateTestCasesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI-generate test cases for a problem and save globally."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise AppException("Problem not found", status_code=404)

    model = req.model if req.model in MODELS else DEFAULT_MODEL
    system = "You are a test case generator for coding problems. Return ONLY valid JSON, no markdown."
    prompt = f"""Generate 5 comprehensive test cases for this problem:
Title: {problem.title}
Description: {(problem.description or '')[:2000]}

Return a JSON array ONLY (no markdown fences), like:
[{{"input": "...", "expected": "...", "description": "edge case description"}}, ...]
Include: basic case, edge cases (empty, single element, large values, duplicates), expected output."""

    try:
        raw = await call_ai(model=model, system=system, messages=[{"role": "user", "content": prompt}], max_tokens=800)
        # Strip markdown fences if present
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        test_cases = json.loads(raw)
        if not isinstance(test_cases, list):
            raise ValueError("Not a list")
    except Exception as e:
        logger.error("Test case generation failed: %s", e)
        raise AppException(f"Failed to generate test cases: {e}", status_code=502)

    # Save globally on the problem
    problem.test_cases = test_cases
    await db.commit()
    await _increment_usage(db, model)
    return {"success": True, "test_cases": test_cases, "count": len(test_cases)}


@router.post("/analyze-complexity")
async def analyze_complexity(
    req: AnalyzeComplexityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze time+space complexity of submitted code."""
    model = req.model if req.model in MODELS else DEFAULT_MODEL
    system = "You are a Big-O complexity expert. Be concise and accurate."
    prompt = f"""Analyze the time and space complexity of this {req.language} solution{f' for: {req.problem_title}' if req.problem_title else ''}:

```{req.language}
{req.code[:3000]}
```

Respond in this JSON format ONLY (no markdown):
{{"time_complexity": "O(n)", "space_complexity": "O(1)", "time_explanation": "...", "space_explanation": "...", "is_optimal": true, "optimization_hint": "..."}}"""

    try:
        raw = await call_ai(model=model, system=system, messages=[{"role": "user", "content": prompt}], max_tokens=500)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        analysis = json.loads(raw)
    except Exception as e:
        logger.warning("Complexity JSON parse failed, returning raw: %s", e)
        analysis = {"raw": raw if "raw" not in dir() else str(e), "parse_error": True}

    await _increment_usage(db, model)
    return analysis


@router.get("/hints/{problem_id}")
async def get_hints(
    problem_id: str,
    level: int = 1,
    language: str = "python3",
    user_code: str = "",
    model: str = DEFAULT_MODEL,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific hint level for a problem."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()

    prob_ctx = ""
    if problem:
        prob_ctx = f"Problem: {problem.title}\nDifficulty: {problem.difficulty}\nDescription: {(problem.description or '')[:1500]}"

    system = "You are an expert DSA tutor. Give helpful hints without revealing the full solution."
    prompt = f"{prob_ctx}\n\n{_hint_prompt(min(max(level, 1), 3), user_code, language)}"
    model  = model if model in MODELS else DEFAULT_MODEL

    try:
        hint = await call_ai(model=model, system=system, messages=[{"role": "user", "content": prompt}], max_tokens=600)
    except Exception as e:
        raise AppException(f"AI service error: {e}", status_code=502)

    await _increment_usage(db, model)
    return {"hint": hint, "level": level, "model": model}


@router.get("/history")
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(TutorMessage).where(TutorMessage.session_id == session_id).order_by(TutorMessage.created_at)
    )
    return [{"role": m.role, "content": m.content, "msg_type": m.msg_type, "hint_level": m.hint_level, "created_at": m.created_at.isoformat()} for m in res.scalars().all()]


@router.delete("/history")
async def clear_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(delete(TutorMessage).where(TutorMessage.session_id == session_id))
    await db.commit()
    return {"cleared": True}


@router.get("/usage")
async def get_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today  = _date.today().isoformat()
    res    = await db.execute(select(AiUsage).where(AiUsage.date_str == today))
    counts = {r.model: r.req_count for r in res.scalars().all()}
    by_model = []
    for mid, meta in MODELS.items():
        count = counts.get(mid, 0)
        by_model.append({
            "model": mid, "label": meta["label"], "provider": meta["provider"],
            "badge": meta["badge"], "count": count, "daily_limit": meta["daily_limit"],
            "pct_used": round(count / meta["daily_limit"] * 100, 1) if meta["daily_limit"] else None,
        })
    return {"date": today, "total_today": sum(counts.values()), "by_model": by_model}


@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    return {"models": get_models_list()}
