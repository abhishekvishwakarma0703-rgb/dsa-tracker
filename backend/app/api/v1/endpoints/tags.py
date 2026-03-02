"""
Tag endpoints for CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.db.database import get_db
from app.db.models import Tag
from app.schemas.problem import TagCreateSchema, TagUpdateSchema, TagResponseSchema
from app.middleware.error_handler import AppException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=TagResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreateSchema,
    db: AsyncSession = Depends(get_db)
):
    try:
        tag = Tag(name=tag_data.name, color=tag_data.color)
        db.add(tag)
        await db.commit()
        await db.refresh(tag)
        logger.info(f"Tag created: {tag.id}")
        return tag
    except Exception as e:
        await db.rollback()
        # Check for unique constraint error (duplicate tag)
        if 'UNIQUE constraint failed: tags.name' in str(e):
            # Fetch and return the existing tag
            result = await db.execute(select(Tag).where(Tag.name == tag_data.name))
            existing_tag = result.scalar_one_or_none()
            if existing_tag:
                logger.info(f"Tag already exists, returning existing tag: {existing_tag.id}")
                return existing_tag
            else:
                logger.error(f"Duplicate tag error but tag not found: {tag_data.name}")
                raise AppException("Tag already exists but could not be retrieved", status_code=409)
        logger.error(f"Error creating tag: {str(e)}")
        raise AppException("Failed to create tag", status_code=500)

@router.get("/", response_model=List[TagResponseSchema])
async def get_tags(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    try:
        query = select(Tag).offset(skip).limit(limit)
        result = await db.execute(query)
        tags = result.scalars().all()
        return tags
    except Exception as e:
        logger.error(f"Error fetching tags: {str(e)}")
        raise AppException("Failed to fetch tags", status_code=500)

@router.put("/{tag_id}", response_model=TagResponseSchema)
async def update_tag(
    tag_id: str,
    tag_data: TagUpdateSchema,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(Tag).where(Tag.id == tag_id))
        tag = result.scalar_one_or_none()
        if not tag:
            raise AppException("Tag not found", status_code=404)
        if tag_data.name:
            tag.name = tag_data.name
        if tag_data.color:
            tag.color = tag_data.color
        await db.commit()
        await db.refresh(tag)
        logger.info(f"Tag updated: {tag.id}")
        return tag
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating tag: {str(e)}")
        raise AppException("Failed to update tag", status_code=500)

@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(Tag).where(Tag.id == tag_id))
        tag = result.scalar_one_or_none()
        if not tag:
            raise AppException("Tag not found", status_code=404)
        await db.delete(tag)
        await db.commit()
        logger.info(f"Tag deleted: {tag.id}")
    except AppException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting tag: {str(e)}")
        raise AppException("Failed to delete tag", status_code=500)
