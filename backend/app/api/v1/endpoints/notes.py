"""
Rich notes endpoints — per-user per-problem, HTML content + quick notes.
"""
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import base64, logging

from app.db.database import get_db
from app.db.models import Note, User
from app.schemas.problem import NoteCreateSchema, NoteUpdateSchema, NoteResponseSchema
from app.core.auth import get_current_user
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{problem_id}", response_model=NoteResponseSchema)
async def get_note(
    problem_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get (or create) the rich note for this user+problem."""
    result = await db.execute(
        select(Note).where(Note.problem_id == problem_id, Note.user_id == current_user.id, Note.is_quick == False)
    )
    note = result.scalar_one_or_none()
    if not note:
        note = Note(user_id=current_user.id, problem_id=problem_id, content="", is_quick=False)
        db.add(note)
        await db.commit()
        await db.refresh(note)
    return note


@router.put("/{problem_id}", response_model=NoteResponseSchema)
async def upsert_note(
    problem_id: str,
    payload: NoteUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.problem_id == problem_id, Note.user_id == current_user.id, Note.is_quick == False)
    )
    note = result.scalar_one_or_none()
    if not note:
        note = Note(user_id=current_user.id, problem_id=problem_id, is_quick=False)
        db.add(note)
    if payload.content is not None:
        note.content = payload.content
    await db.commit()
    await db.refresh(note)
    return note


@router.post("/{problem_id}/quick", response_model=NoteResponseSchema)
async def upsert_quick_note(
    problem_id: str,
    payload: NoteUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.problem_id == problem_id, Note.user_id == current_user.id, Note.is_quick == True)
    )
    note = result.scalar_one_or_none()
    if not note:
        note = Note(user_id=current_user.id, problem_id=problem_id, is_quick=True)
        db.add(note)
    if payload.quick_text is not None:
        note.quick_text = payload.quick_text
    await db.commit()
    await db.refresh(note)
    return note


@router.post("/{problem_id}/upload-image")
async def upload_image(
    problem_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Return base64-encoded image for inline embedding in rich note."""
    data  = await file.read()
    b64   = base64.b64encode(data).decode()
    mime  = file.content_type or "image/png"
    return {"url": f"data:{mime};base64,{b64}", "name": file.filename}
