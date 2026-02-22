"""
AI Tutor Endpoint
=================
POST   /api/v1/tutor/chat    — send a message, get a tutoring response
GET    /api/v1/tutor/history — load session history
DELETE /api/v1/tutor/history — clear session
GET    /api/v1/tutor/usage   — today's AI request counts per model
GET    /api/v1/tutor/models  — available models list

All LLM calls are routed through app.services.ai_provider so the
provider/model can be switched at runtime via the 'model' field in the
request body.  Default: gemini-2.0-flash (free, 1,500 req/day).
"""

import logging
from datetime import date as _date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import TutorMessage, LeetCodeCache, AiUsage
from app.middleware.error_handler import AppException
from app.services.ai_provider import call_ai, get_models_list, MODELS, DEFAULT_MODEL

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class TutorChatRequest(BaseModel):
    session_id:   str
    message:      str
    problem_slug: str
    user_code:    Optional[str] = ""
    language:     Optional[str] = "python3"
    msg_type:     Optional[str] = "chat"
    hint_level:   Optional[int] = 1
    model:        Optional[str] = DEFAULT_MODEL   # NEW: model selector


# ── Usage helpers ──────────────────────────────────────────────────────────────

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


# ── Prompt builders (unchanged teaching logic) ─────────────────────────────────

def _build_system(problem, language: str) -> str:
    if problem:
        tags       = ", ".join(problem.tags or []) or "general"
        diff       = problem.difficulty or "Unknown"
        desc       = (problem.description or "")[:3000]
        starter    = problem.starter_code or ""
        prob_block = f"""
PROBLEM YOU ARE TUTORING:
  Title:       {problem.title}
  Difficulty:  {diff}
  Topics:      {tags}
  Description: {desc}
  Starter code ({language}):
  ```{language}
  {starter}
  ```
"""
    else:
        prob_block = "\nNo specific problem loaded yet.\n"

    return f"""You are an expert DSA tutor embedded in a coding practice app.
Your name is "Mentor". You are warm, encouraging, and patient.

TEACHING PHILOSOPHY:
- Use the Socratic method: guide with questions, don't give answers directly.
- Celebrate every small win enthusiastically.
- When a student is stuck, ask a leading question first.
- Reveal hints progressively — never the full solution unless asked.
- Point out what's GOOD in their code before what's wrong.
- Use concrete examples and analogies.
- If they ask "what should I do?", respond with a guiding question, not a direct answer.
- Only reveal the full solution if they explicitly ask ("show me the solution" / "I give up").
{prob_block}
FORMATTING:
- Use markdown: **bold** for key terms, `code` for inline code, ```python for blocks.
- Keep responses concise: 3-6 sentences for hints, more for code reviews.
- Use bullet points sparingly.
- Always end hint messages with a question to keep them thinking.
"""


def _hint_prompt(level: int, user_code: str, language: str) -> str:
    scaffolds = {
        1: ("Give a very gentle directional nudge. Hint at the problem category "
            "without naming it. Ask a question that makes them think about the "
            "data structure. Do NOT mention hash maps, sets, or any technique directly."),
        2: ("Name the key technique or data structure they should use. Explain WHY "
            "it helps. Don't show code yet. Ask what information they'd need to store."),
        3: ("Describe the algorithm step by step in plain English. Include time and "
            "space complexity targets. Still no code. Ask if they want to try coding it."),
    }
    code_ctx = ""
    if user_code and user_code.strip() and "# Write your solution" not in user_code:
        code_ctx = f"\nStudent's current code:\n```{language}\n{user_code}\n```\nReference this if relevant."
    return (
        f"The student asked for a Level {level} hint.\n"
        f"Level guide: {scaffolds.get(level, scaffolds[2])}\n"
        f"{code_ctx}\nReply as Mentor."
    )


def _review_prompt(user_code: str, language: str) -> str:
    return f"""The student submitted their code for review.
```{language}
{user_code}
```
Review it as Mentor. Structure your review:
1. **What's working well** (be specific and encouraging)
2. **Correctness** — does it handle edge cases? (empty input, duplicates, large numbers)
3. **Complexity** — what's the time and space complexity? Is it optimal?
4. **Code quality** — naming, readability, Pythonic style
5. **One concrete improvement** with a code snippet if helpful
6. End with an encouraging message and a question about their next step.
"""


def _explain_prompt(user_code: str, language: str) -> str:
    code_ctx = ""
    if user_code and user_code.strip():
        code_ctx = f"\nTheir current code:\n```{language}\n{user_code}\n```\n"
    return (
        "The student wants a concept explanation relevant to this problem.\n"
        f"{code_ctx}"
        "Explain the core concept, data structure, or technique needed. "
        "Use an analogy. Show a minimal example. Ask if it makes sense."
    )


def _solution_prompt(language: str) -> str:
    return (
        f"The student explicitly asked for the full solution.\n"
        f"Provide a clean, well-commented {language} solution.\n"
        "After the code block:\n"
        "- Explain the approach in 2-3 sentences\n"
        "- State time and space complexity\n"
        "- Point out one thing to remember for similar problems\n"
        "- Encourage them to type it out themselves, not just copy it."
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/chat")
async def tutor_chat(req: TutorChatRequest, db: AsyncSession = Depends(get_db)):
    model = req.model if req.model in MODELS else DEFAULT_MODEL

    # Load problem context
    problem = None
    if req.problem_slug:
        res = await db.execute(
            select(LeetCodeCache).where(LeetCodeCache.slug == req.problem_slug)
        )
        problem = res.scalar_one_or_none()

    system = _build_system(problem, req.language)

    # Load history (last 30)
    hist_res = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.session_id == req.session_id)
        .order_by(TutorMessage.created_at)
        .limit(30)
    )
    messages = [
        {"role": m.role, "content": m.content}
        for m in hist_res.scalars().all()
        if m.role in ("user", "assistant")
    ]

    # Build user turn
    if req.msg_type == "hint":
        user_content = _hint_prompt(req.hint_level, req.user_code, req.language)
    elif req.msg_type == "review":
        if not req.user_code or not req.user_code.strip():
            return {"reply": "I don't see any code yet! Write something first, even incomplete — I'll help you improve it. 🙂", "msg_type": "review", "model": model}
        user_content = _review_prompt(req.user_code, req.language)
    elif req.msg_type == "explain":
        user_content = _explain_prompt(req.user_code, req.language)
    elif req.msg_type == "solution":
        user_content = _solution_prompt(req.language)
    else:
        code_ctx = ""
        if req.user_code and req.user_code.strip() and "# Write your solution" not in req.user_code:
            code_ctx = f"\n\n[Student's current editor code — {req.language}]:\n```{req.language}\n{req.user_code[:2000]}\n```"
        user_content = req.message + code_ctx

    messages.append({"role": "user", "content": user_content})

    # Call AI
    try:
        reply = await call_ai(model=model, system=system, messages=messages, max_tokens=1200)
    except ValueError as e:
        raise AppException(str(e), status_code=503)
    except Exception as e:
        logger.error("AI provider error: %s", e)
        raise AppException(f"AI service error: {e}", status_code=502)

    # Track usage
    await _increment_usage(db, model)

    # Persist
    user_msg_text = req.message if req.msg_type == "chat" else f"[{req.msg_type.upper()}] {req.message}"
    db.add(TutorMessage(session_id=req.session_id, role="user",      content=user_msg_text, msg_type=req.msg_type, hint_level=req.hint_level if req.msg_type == "hint" else 0))
    db.add(TutorMessage(session_id=req.session_id, role="assistant", content=reply,         msg_type=req.msg_type))
    await db.commit()

    return {"reply": reply, "msg_type": req.msg_type, "model": model}


@router.get("/history")
async def get_history(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(TutorMessage).where(TutorMessage.session_id == session_id).order_by(TutorMessage.created_at)
    )
    return [
        {"role": m.role, "content": m.content, "msg_type": m.msg_type, "hint_level": m.hint_level, "created_at": m.created_at.isoformat()}
        for m in res.scalars().all()
    ]


@router.delete("/history")
async def clear_history(session_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(TutorMessage).where(TutorMessage.session_id == session_id))
    await db.commit()
    return {"cleared": True}


@router.get("/usage")
async def get_usage(db: AsyncSession = Depends(get_db)):
    today = _date.today().isoformat()
    res   = await db.execute(select(AiUsage).where(AiUsage.date_str == today))
    counts = {r.model: r.req_count for r in res.scalars().all()}

    by_model = []
    for model_id, meta in MODELS.items():
        count = counts.get(model_id, 0)
        by_model.append({
            "model":       model_id,
            "label":       meta["label"],
            "provider":    meta["provider"],
            "badge":       meta["badge"],
            "count":       count,
            "daily_limit": meta["daily_limit"],
            "pct_used":    round(count / meta["daily_limit"] * 100, 1) if meta["daily_limit"] else None,
        })

    return {"date": today, "total_today": sum(counts.values()), "by_model": by_model}


@router.get("/models")
async def list_models():
    return {"models": get_models_list()}
