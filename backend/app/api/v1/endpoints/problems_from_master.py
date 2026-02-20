"""
Create Problem From LeetCode Master Slug
POST /api/v1/problems/from-master/{slug}
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import httpx, logging
from typing import Optional

from app.db.database import get_db
from app.db import models

router = APIRouter(prefix="/problems", tags=["Problems From Master"])
logger = logging.getLogger(__name__)

ALFA_API = "https://alfa-leetcode-api.onrender.com"


async def _fetch_leetcode_data(slug: str) -> dict:
    """Fetch full problem data from alfa-leetcode-api"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{ALFA_API}/select?titleSlug={slug}")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("question", data) or {}
    except Exception as e:
        logger.warning(f"Could not fetch LeetCode data for {slug}: {e}")
    return {}


def _to_dict(p: models.Problem) -> dict:
    notes = [{"id": n.id, "text": n.text, "insight_type": n.insight_type} for n in (p.notes or [])]
    tags = [{"id": t.id, "name": t.name} for t in (p.tags or [])]
    return {
        "id": p.id, "title": p.title, "difficulty": p.difficulty,
        "category": p.category, "section_id": p.section_id,
        "pattern": p.pattern, "leetcode_id": p.leetcode_id,
        "leetcode_slug": p.leetcode_slug, "is_done": p.is_done,
        "is_revision": p.is_revision, "done": p.is_done, "revision": p.is_revision,
        "acceptance_rate": p.acceptance_rate, "tags": tags,
        "notes": notes, "insights": notes,
    }


@router.post("/from-master/{slug}", response_model=dict, status_code=201)
async def create_from_master(
    slug: str,
    section_id: Optional[str] = Query(default=None, description="Section/category to place this problem in"),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a tracked problem from the LeetCode master list by slug.
    Fetches full data (description, starter code, examples) from LeetCode API.
    """
    # 1. Lookup in master list
    master_result = await db.execute(
        select(models.LeetCodeMaster).where(models.LeetCodeMaster.title_slug == slug)
    )
    master = master_result.scalar_one_or_none()

    if not master:
        raise HTTPException(status_code=404, detail=f"Slug '{slug}' not found in master list. Run /leetcode-master/ingest first.")

    # 2. Check if already added
    existing = await db.execute(
        select(models.Problem).where(models.Problem.leetcode_slug == slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Problem with slug '{slug}' already exists in tracker.")

    # 3. Fetch full data from LeetCode API (best-effort)
    lc_data = await _fetch_leetcode_data(slug)

    # 4. Determine category/section
    category = section_id or master.category_title or "General"
    sid = section_id or slug

    # 5. Create problem
    p = models.Problem(
        title=master.title,
        difficulty=master.difficulty,
        category=category,
        section_id=sid,
        pattern=None,
        leetcode_id=master.question_id,
        leetcode_slug=slug,
        acceptance_rate=master.ac_rate,
    )
    db.add(p)
    await db.flush()  # get ID

    # 6. Add topic tags as problem tags
    for tag_info in (master.topic_tags or []):
        tag_name = tag_info.get("name", "") if isinstance(tag_info, dict) else str(tag_info)
        if not tag_name:
            continue
        tag_result = await db.execute(select(models.Tag).where(models.Tag.name == tag_name))
        tag = tag_result.scalar_one_or_none()
        if not tag:
            tag = models.Tag(name=tag_name)
            db.add(tag)
            await db.flush()
        if tag not in p.tags:
            p.tags.append(tag)

    await db.commit()

    # 7. Reload with relationships
    result = await db.execute(
        select(models.Problem)
        .options(selectinload(models.Problem.tags), selectinload(models.Problem.notes))
        .where(models.Problem.id == p.id)
    )
    p = result.scalar_one()

    return {
        **_to_dict(p),
        "leetcode_data": {
            "content_html": lc_data.get("content", ""),
            "starter_codes": lc_data.get("codeSnippets", []),
            "examples": lc_data.get("exampleTestcases", ""),
            "hints": lc_data.get("hints", []),
            "link": f"https://leetcode.com/problems/{slug}/",
        }
    }
