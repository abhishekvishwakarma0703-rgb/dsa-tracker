"""
LeetCode Master List API Endpoints
Provides ingest + search of the master LeetCode problem list
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
import json, os, logging

from app.db.database import get_db
from app.db import models
from app.schemas.problem import LeetCodeMasterResponse
from app.core.config import settings

router = APIRouter(prefix="/leetcode-master", tags=["LeetCode Master"])
logger = logging.getLogger(__name__)

import httpx


LC_GRAPHQL = "https://leetcode.com/graphql"

LC_QUERY = """
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    content
    difficulty
    exampleTestcases
    topicTags { name slug }
    codeSnippets { langSlug code }
  }
}
"""

@router.get("/public/{slug}")
async def get_leetcode_problem(slug: str):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                LC_GRAPHQL,
                json={
                    "query": LC_QUERY,
                    "variables": {"titleSlug": slug}
                },
                headers={
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com",
                    "User-Agent": "Mozilla/5.0"
                }
            )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="LeetCode upstream error")

        data = response.json()

        question = (data.get("data") or {}).get("question")
        if not question:
            raise HTTPException(status_code=404, detail="Problem not found")

        return {
            "leetcode_id": question["questionId"],
            "title": question["title"],
            "slug": question["titleSlug"],
            "difficulty": question["difficulty"],
            "description_html": question["content"],
            "example_testcases": question["exampleTestcases"],
            "tags": [t["name"] for t in question.get("topicTags", [])],
            "code_snippets": question.get("codeSnippets", [])
        }

    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="LeetCode unreachable")
   

   
@router.get("", response_model=dict)
async def search_leetcode_master(
    search: Optional[str] = Query(default=None, description="Search by title"),
    difficulty: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Search LeetCode master problem list — used for searchable dropdown"""
    stmt = select(models.LeetCodeMaster)

    if search:
        stmt = stmt.where(
            or_(
                models.LeetCodeMaster.title.ilike(f"%{search}%"),
                models.LeetCodeMaster.question_id.ilike(f"%{search}%"),
            )
        )
    if difficulty:
        stmt = stmt.where(models.LeetCodeMaster.difficulty == difficulty)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * page_size
    stmt = stmt.order_by(models.LeetCodeMaster.id).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": i.id,
                "question_id": i.question_id,
                "title": i.title,
                "title_slug": i.title_slug,
                "difficulty": i.difficulty,
                "ac_rate": i.ac_rate,
                "is_paid_only": i.is_paid_only,
                "topic_tags": i.topic_tags or [],
            }
            for i in items
        ],
    }


@router.post("/ingest", status_code=200)
async def ingest_master_list(db: AsyncSession = Depends(get_db)):
    """
    Ingest leetcode_problems.json into LeetCodeMaster table.
    Safe to call multiple times — skips duplicates.
    """
    json_path = settings.LEETCODE_MASTER_FILE
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail=f"Master file not found: {json_path}")

    with open(json_path, "r") as f:
        raw = json.load(f)

    inserted = 0
    skipped = 0

    for item in raw:
        qid = str(item.get("questionId", "")).strip()
        if not qid:
            continue

        existing = await db.execute(
            select(models.LeetCodeMaster).where(models.LeetCodeMaster.question_id == qid)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        record = models.LeetCodeMaster(
            question_id=qid,
            title=item.get("title", ""),
            title_slug=item.get("titleSlug", ""),
            difficulty=item.get("difficulty", "Medium"),
            ac_rate=item.get("acRate", 0.0),
            is_paid_only=item.get("isPaidOnly", False),
            topic_tags=item.get("topicTags", []),
            category_title=item.get("categoryTitle", "Algorithms"),
        )
        db.add(record)
        inserted += 1

    await db.commit()
    logger.info(f"LeetCode master ingest: inserted={inserted}, skipped={skipped}")
    return {"inserted": inserted, "skipped": skipped, "total": inserted + skipped}


@router.get("/slug/{slug}", response_model=dict)
async def get_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Lookup a single master record by slug"""
    result = await db.execute(
        select(models.LeetCodeMaster).where(models.LeetCodeMaster.title_slug == slug)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail=f"Slug '{slug}' not found in master list")
    return {
        "question_id": item.question_id,
        "title": item.title,
        "title_slug": item.title_slug,
        "difficulty": item.difficulty,
        "ac_rate": item.ac_rate,
        "is_paid_only": item.is_paid_only,
        "topic_tags": item.topic_tags or [],
    }
