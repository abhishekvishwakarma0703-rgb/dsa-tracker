"""
LeetCode Cache Endpoint
=======================
GET /api/v1/leetcode/{slug}

Resolution order:
  1. DB cache hit         → return immediately
  2. Slug in master list  → fetch live from LeetCode
  3. LeetCode down/miss   → AI generates exact LeetCode-format response
  4. Unknown slug         → AI generates speculative response with suggestions
  5. Cache result         → return
"""

import json
import logging
import os
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user
from app.db.models import UserProblem, Problem

from app.core.config import settings          # ← add this (adjust path if needed)
from app.db import models                     # ← add this (adjust path if needed)
from app.db.database import get_db
from app.db.models import LeetCodeCache
from app.middleware.error_handler import AppException
from app.schemas.problem import LeetCodeCacheResponseSchema
from app.services.ai_provider import call_ai, DEFAULT_MODEL
from app.services.dsa_problems_list import (
    get_problem_by_slug,
    find_similar_slugs,
)
logger = logging.getLogger(__name__)
router = APIRouter()

# ── LeetCode GraphQL ──────────────────────────────────────────────────────────

LC_GRAPHQL = "https://leetcode.com/graphql"

LC_QUERY = """
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    content
    difficulty
    exampleTestcases
    topicTags { name slug }
    codeSnippets { langSlug code }
  }
}
"""

LC_HEADERS = {
    "Content-Type": "application/json",
    "Referer":      "https://leetcode.com",
    "User-Agent":   (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "x-csrftoken": "dummy",
    "Cookie":      "csrftoken=dummy",
}

# ── HTML helpers (unchanged from original) ────────────────────────────────────

def _strip_tags(html: str) -> str:
    if not html:
        return ""
    try:
        from bs4 import BeautifulSoup
        return BeautifulSoup(html, "html.parser").get_text("\n").strip()
    except ImportError:
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


def _parse_examples(html: str) -> list:
    if not html:
        return []
    examples = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for pre in soup.find_all("pre"):
            text = pre.get_text()
            inp  = re.search(r"Input\s*:\s*(.*?)(?=Output\s*:|$)",       text, re.S | re.I)
            out  = re.search(r"Output\s*:\s*(.*?)(?=Explanation\s*:|$)", text, re.S | re.I)
            expl = re.search(r"Explanation\s*:\s*(.*?)$",                text, re.S | re.I)
            if inp or out:
                examples.append({
                    "input":       (inp.group(1).strip()  if inp  else ""),
                    "output":      (out.group(1).strip()  if out  else ""),
                    "explanation": (expl.group(1).strip() if expl else ""),
                })
    except ImportError:
        for m in re.finditer(r"<pre>([\s\S]*?)</pre>", html, re.I):
            text = re.sub(r"<[^>]+>", "", m.group(1))
            inp  = re.search(r"Input\s*:\s*(.*?)(?=Output\s*:|$)",       text, re.S | re.I)
            out  = re.search(r"Output\s*:\s*(.*?)(?=Explanation\s*:|$)", text, re.S | re.I)
            if inp or out:
                examples.append({
                    "input":  (inp.group(1).strip() if inp else ""),
                    "output": (out.group(1).strip() if out else ""),
                    "explanation": "",
                })
    return examples


def _extract_starter(code_snippets: list, lang: str = "python3") -> str:
    for snippet in (code_snippets or []):
        if snippet.get("langSlug") == lang:
            return snippet.get("code", "")
    return ""


# ── LeetCode live fetch ───────────────────────────────────────────────────────

async def _fetch_from_leetcode(slug: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.post(
                LC_GRAPHQL,
                json={"query": LC_QUERY, "variables": {"titleSlug": slug}},
                headers=LC_HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            question = (data.get("data") or {}).get("question")
            if not question or not question.get("title"):
                return None
            return question
    except Exception as exc:
        logger.warning("LeetCode GraphQL fetch failed for '%s': %s", slug, exc)
        return None


# ── AI fallback — generates exact LeetCode-format JSON ───────────────────────

async def _generate_ai_fallback(slug: str, meta: dict | None) -> dict:
    """
    Use Claude to synthesise a LeetCode-format problem JSON.
    When meta is available (slug is in master list), authoritative fields
    (title, difficulty, tags) are patched in after generation.
    """
    if meta:
        context = (
            f"Title: {meta['title']}\n"
            f"Difficulty: {meta['difficulty']}\n"
            f"Topic Tags: {', '.join(t['name'] for t in meta['topicTags'])}\n"
            f"Acceptance Rate: {meta['acRate']}%\n"
            f"Category: {meta['categoryTitle']}\n"
            f"Slug: {slug}"
        )
    else:
        context = f"Slug: {slug} (not in master list — generate best-guess problem)"

    system_prompt = (
        "You are a LeetCode problem database. "
        "Return ONLY a valid JSON object — no markdown, no explanation, no extra keys.\n\n"
        "Required JSON structure:\n"
        "{\n"
        '  "questionId": "<string number>",\n'
        '  "title": "<problem title>",\n'
        '  "content": "<full HTML with problem statement, examples, constraints>",\n'
        '  "difficulty": "Easy|Medium|Hard",\n'
        '  "exampleTestcases": "<newline-separated test inputs>",\n'
        '  "topicTags": [{"name": "Array", "slug": "array"}],\n'
        '  "codeSnippets": [\n'
        '    {"langSlug": "python3", "code": "class Solution:\\n    def solve(self, ...) -> ...:"},\n'
        '    {"langSlug": "java",    "code": "class Solution { ... }"},\n'
        '    {"langSlug": "cpp",     "code": "class Solution { ... };"}\n'
        "  ]\n"
        "}\n\n"
        "The content field must be valid HTML with <p>, <pre>, <code>, <strong> tags "
        "matching real LeetCode formatting. Include 2-3 concrete examples in <pre> blocks "
        "with Input:/Output:/Explanation: labels."
    )

    user_prompt = (
        f"Generate the LeetCode problem JSON for:\n{context}\n\n"
        "Make it accurate, complete, and matching real LeetCode style."
    )

    logger.info("Generating AI fallback for slug '%s' (meta=%s)", slug, bool(meta))

    # Use the unified AI provider (defaults to Gemini, falls back gracefully)
    raw = await call_ai(
        model=DEFAULT_MODEL,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=4096,
    )
    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")].strip()

    question = json.loads(raw)

    # Patch with authoritative master-list metadata
    if meta:
        question["questionId"] = meta["questionId"]
        question["title"]      = meta["title"]
        question["difficulty"] = meta["difficulty"]
        question["topicTags"]  = meta["topicTags"]

    question["_ai_generated"] = True
    return question


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/test/{slug}", response_model=LeetCodeCacheResponseSchema)
async def get_leetcode_problem(
    
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Return a LeetCode problem by slug.

    - Cache hit           → returns immediately from DB
    - Known slug, LC up   → fetches live, caches, returns
    - Known slug, LC down → AI fallback (accurate), caches, returns
    - Unknown slug        → AI fallback (speculative) with similar-slug logged
    """

    # ── 1. Cache lookup ──────────────────────────────────────────────────────
    result = await db.execute(
        select(LeetCodeCache).where(LeetCodeCache.slug == slug)
    )
    cached = result.scalar_one_or_none()
    if cached:
        logger.debug("lc_cache hit: %s", slug)
        return cached

    # ── 2. Validate against master list ──────────────────────────────────────
    meta = get_problem_by_slug(slug)

    if meta is None:
        similar = find_similar_slugs(slug, top_n=5)
        logger.warning(
            "Slug '%s' not in master list. Similar slugs: %s. Falling back to AI.",
            slug, similar,
        )
    else:
        similar = []

    # ── 3. Try live LeetCode (only for known slugs) ───────────────────────────
    question = None
    if meta is not None:
        question = await _fetch_from_leetcode(slug)
        if question:
            logger.info("lc_cache miss — fetched '%s' live from LeetCode", slug)

    # ── 4. AI fallback ────────────────────────────────────────────────────────
    if question is None:
        source = "ai_speculative" if meta is None else "ai_fallback"
        logger.info("Using AI fallback for slug '%s' (source=%s)", slug, source)
        question = await _generate_ai_fallback(slug, meta)

    # ── 5. Process the question dict ─────────────────────────────────────────
    html          = question.get("content") or ""
    code_snippets = question.get("codeSnippets") or []
    tags          = [t["name"] for t in (question.get("topicTags") or [])]
    examples      = _parse_examples(html)
    description   = _strip_tags(html)
    starter_code  = _extract_starter(code_snippets, "python3")

    # ── 6. Persist ────────────────────────────────────────────────────────────
    try:
        entry = LeetCodeCache(
            slug              = slug,
            title             = question.get("title", slug),
            difficulty        = question.get("difficulty"),
            tags              = tags,
            description       = description,
            raw_html          = html,
            examples          = examples,
            starter_code      = starter_code,
            code_snippets     = code_snippets,
            example_testcases = question.get("exampleTestcases") or "",
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)

        logger.info(
            "lc_cache saved: %s (source=%s)",
            slug,
            "ai_fallback" if question.get("_ai_generated") else "leetcode",
        )
        return entry

    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(LeetCodeCache).where(LeetCodeCache.slug == slug)
        )
        cached = result.scalar_one_or_none()
        if cached:
            return cached
        raise AppException("Failed to save problem to cache.", status_code=500)

    except Exception as exc:
        await db.rollback()
        logger.error("Error saving lc_cache for '%s': %s", slug, exc)
        raise AppException(f"Failed to cache problem: {exc}", status_code=500)

from sqlalchemy import desc

@router.get("/{slug}", response_model=LeetCodeCacheResponseSchema)
async def get_leetcode_problem(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Fetch the Problem/Cache (Global)
    result = await db.execute(select(LeetCodeCache).where(LeetCodeCache.slug == slug))
    cached = result.scalar_one_or_none()
    
    # ... (Fallback logic if not cached) ...

    # 2. Get User Draft (from UserProblem)
    up_query = await db.execute(
        select(models.UserProblem)
        .join(models.Problem, models.UserProblem.problem_id == models.Problem.id)
        .where(
            models.UserProblem.user_id == current_user.id,
            models.Problem.leetcode_slug == slug
        )
    )
    up = up_query.scalar_one_or_none()

    # 3. Get User History (from Solution)
    # This fetches all past attempts for this problem by this user
    sol_query = await db.execute(
        select(models.Solution)
        .join(models.Problem, models.Solution.problem_id == models.Problem.id)
        .where(
            models.Solution.user_id == current_user.id,
            models.Problem.leetcode_slug == slug
        )
        .order_by(desc(models.Solution.created_at))
    )
    user_solutions = sol_query.scalars().all()
    print("sol", user_solutions)
    # 4. Map to Schema
    response = LeetCodeCacheResponseSchema.model_validate(cached)
    
    if up:
        response.draft_code = up.draft_code
        response.draft_lang = up.draft_lang
        response.is_done = up.is_done
    
    # Add history from Solution table
    response.solution_count = len(user_solutions)
    if user_solutions:
        # We take the most recent solution as the "latest status"
        response.last_status = user_solutions[0].status 
        response.history = [
            {
                "id": s.id, 
                "status": s.status, 
                "created_at": s.created_at,
                "runtime": getattr(s, 'runtime', None) # Safely get runtime if it exists
            } for s in user_solutions[:10] # Return last 10 attempts
        ]

    return response

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

