"""
Pydantic schemas — request/response validation
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, AliasChoices

# ── Shared ───────────────────────────────────────────────────────────────────
class TestCaseSchema(BaseModel):
    input: Any
    expected: Any
    model_config = ConfigDict(from_attributes=True)

class PaginationSchema(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

class SuccessResponseSchema(BaseModel):
    success: bool = True
    data: Any
    message: Optional[str] = None


# ── Tags ─────────────────────────────────────────────────────────────────────
class TagCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#3b82f6")

class TagUpdateSchema(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class TagResponseSchema(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Insights (quick plain-text notes) ────────────────────────────────────────
class InsightCreateSchema(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    insight_type: str = "general"

class InsightUpdateSchema(BaseModel):
    text: Optional[str] = None
    insight_type: Optional[str] = None

class InsightResponseSchema(BaseModel):
    id: str
    text: str
    insight_type: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Rich Notes ───────────────────────────────────────────────────────────────
class NoteCreateSchema(BaseModel):
    content: str = Field(default="")
    is_quick: bool = False
    quick_text: str = Field(default="")

class NoteUpdateSchema(BaseModel):
    content: Optional[str] = None
    quick_text: Optional[str] = None

class NoteResponseSchema(BaseModel):
    id: str
    problem_id: str
    user_id: str
    content: str
    is_quick: bool
    quick_text: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Problem ───────────────────────────────────────────────────────────────────
class SolutionDataSchema(BaseModel):
    approach: Optional[str] = None
    key_points: Optional[List[str]] = None
    code: Optional[str] = None
    complexity: Optional[Dict[str, str]] = None
    tradeoffs: Optional[List[str]] = None
    model_config = ConfigDict(from_attributes=True)

class ProblemCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    solution_data: Optional[SolutionDataSchema] = None
    test_cases: Optional[List[TestCaseSchema]] = None
    difficulty: str = "Medium"
    category: Optional[str] = None
    section_id: Optional[str] = None
    pattern: Optional[str] = None
    leetcode_id: Optional[str] = None
    leetcode_slug: Optional[str] = None

class ProblemUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    pattern: Optional[str] = None
    solution_data: Optional[SolutionDataSchema] = None
    test_cases: Optional[List[TestCaseSchema]] = None
    done: bool = False
    revision: bool = False
    views: int = 0
    model_config = ConfigDict(from_attributes=True)


class ProblemResponseSchema(BaseModel):
    id: str
    title: str
    leetcode_id: Optional[str] = None
    leetcode_slug: Optional[str] = None
    description: Optional[str] = None
    difficulty: str
    category: Optional[str] = None
    pattern: Optional[str] = None
    
    # MAPPING: Pulls data from 'insights' model attribute into 'notes' schema field
    notes: List[InsightResponseSchema] = Field(default=[], validation_alias=AliasChoices("notes", "insights"))
    tags: List[TagResponseSchema] = Field(default=[])

    # Per-user overlay fields
    done: bool = False
    revision: bool = False
    views: int = 0
    draft_code: Optional[str] = None
    draft_lang: Optional[str] = None
    chat_count: int = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# Important: Rebuild at end of file if there are circular refs
ProblemResponseSchema.model_rebuild()
# ── Solutions ─────────────────────────────────────────────────────────────────
class SolutionSubmitSchema(BaseModel):
    code: str = Field(..., max_length=50000)
    language: str = "python3"
    explanation: Optional[str] = None
    approach: Optional[str] = None
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None

class SolutionTestSchema(BaseModel):
    code: str
    test_cases: List[TestCaseSchema]
    language: str = "python3"
    timeout: int = 5

class SolutionResponseSchema(BaseModel):
    id: str
    problem_id: str
    user_id: str
    code: str
    language: str
    explanation: Optional[str] = None
    approach: Optional[str] = None
    version_number: int = 1
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    passed_test_cases: int = 0
    total_test_cases: int = 0
    test_results: Optional[Any] = None
    ai_feedback: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AutosaveSchema(BaseModel):
    code: str
    language: str = "python3"


# ── User progress ─────────────────────────────────────────────────────────────
class UserProblemStatsSchema(BaseModel):
    total_problems: int
    completed_problems: int
    revision_problems: int
    progress_percentage: float

class UserProblemResponseSchema(BaseModel):
    problem_id: str
    is_done: bool
    is_revision: bool
    views: int
    first_attempted_at: Optional[datetime] = None
    last_attempted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ── Discussion / Chat ─────────────────────────────────────────────────────────
class MessageCreateSchema(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class MessageResponseSchema(BaseModel):
    id: str
    problem_id: str
    user_id: str
    username: str = ""
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Notifications ─────────────────────────────────────────────────────────────
class NotificationResponseSchema(BaseModel):
    id: str
    problem_id: Optional[str]
    type: str
    text: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── LeetCode cache ────────────────────────────────────────────────────────────
class LeetCodeCacheResponseSchema(BaseModel):
    id: str
    slug: str
    title: str
    difficulty: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None
    raw_html: Optional[str] = None
    examples: List[Dict[str, Any]] = []
    starter_code: Optional[str] = None
    code_snippets: List[Dict[str, Any]] = []
    example_testcases: Optional[str] = None
    created_at: datetime
    # app/schemas/problem.py

class LeetCodeCacheResponseSchema(BaseModel):
    slug: str
    title: str
    difficulty: str
    tags: List[str]
    description: str
    raw_html: str
    examples: List[dict]
    starter_code: str
    code_snippets: List[dict]
    
    # --- User Specific Fields (Add These) ---
    draft_code: Optional[str] = None
    draft_lang: Optional[str] = None
    is_done: bool = False
    is_revision: bool = False
    solution_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ── AI ────────────────────────────────────────────────────────────────────────
class GenerateTestCasesSchema(BaseModel):
    model: Optional[str] = None

ProblemResponseSchema.model_rebuild()
