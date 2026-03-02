"""
Discussion / Chat endpoints — messages globally visible, notifications per-user.
Socket.io events are emitted from here via the sio instance.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Message, Notification, ProblemWatch, User
from app.schemas.problem import MessageCreateSchema, MessageResponseSchema, NotificationResponseSchema
from app.core.auth import get_current_user
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Messages ─────────────────────────────────────────────────────────────────

@router.get("/{problem_id}/messages", response_model=List[MessageResponseSchema])
async def get_messages(
    problem_id: str,
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message, User.username)
        .join(User, User.id == Message.user_id)
        .where(Message.problem_id == problem_id)
        .order_by(Message.created_at.asc())
        .offset(skip).limit(limit)
    )
    rows = result.all()
    out = []
    for msg, username in rows:
        schema = MessageResponseSchema.model_validate(msg)
        schema.username = username
        out.append(schema)
    return out


@router.post("/{problem_id}/messages", response_model=MessageResponseSchema)
async def post_message(
    problem_id: str,
    payload: MessageCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = Message(problem_id=problem_id, user_id=current_user.id, content=payload.content)
    db.add(msg)
    await db.flush()

    # Auto-watch on first message
    watch_res = await db.execute(
        select(ProblemWatch).where(ProblemWatch.user_id == current_user.id, ProblemWatch.problem_id == problem_id)
    )
    if not watch_res.scalar_one_or_none():
        db.add(ProblemWatch(user_id=current_user.id, problem_id=problem_id))

    # Notify watchers (except the sender)
    watchers = await db.execute(
        select(ProblemWatch.user_id).where(
            ProblemWatch.problem_id == problem_id,
            ProblemWatch.user_id    != current_user.id,
        )
    )
    for (watcher_id,) in watchers:
        db.add(Notification(
            user_id    = watcher_id,
            problem_id = problem_id,
            message_id = str(msg.id),
            type       = "new_message",
            text       = f"{current_user.username} posted in a problem you're watching",
        ))

    await db.commit()
    await db.refresh(msg)

    schema = MessageResponseSchema.model_validate(msg)
    schema.username = current_user.username
    return schema


@router.get("/{problem_id}/count")
async def get_message_count(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(sql_func.count(Message.id)).where(Message.problem_id == problem_id)
    )
    return {"count": result.scalar() or 0}


# ── Watch / Unwatch ──────────────────────────────────────────────────────────

@router.post("/{problem_id}/watch")
async def watch_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(ProblemWatch).where(ProblemWatch.user_id == current_user.id, ProblemWatch.problem_id == problem_id)
    )
    if not res.scalar_one_or_none():
        db.add(ProblemWatch(user_id=current_user.id, problem_id=problem_id))
        await db.commit()
    return {"watching": True}


@router.delete("/{problem_id}/watch")
async def unwatch_problem(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(ProblemWatch).where(ProblemWatch.user_id == current_user.id, ProblemWatch.problem_id == problem_id)
    )
    watch = res.scalar_one_or_none()
    if watch:
        await db.delete(watch)
        await db.commit()
    return {"watching": False}


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications/me", response_model=List[NotificationResponseSchema])
async def get_my_notifications(
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(50)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/notifications/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    for n in result.scalars().all():
        n.is_read = True
    await db.commit()
    return {"success": True}
