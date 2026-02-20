"""
Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ─── Tag Schemas ─────────────────────────────────────────────
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagUpdate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Note/Insight Schemas ─────────────────────────────────────
class NoteBase(BaseModel):
    text: str
    insight_type: str = "note"

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    text: Optional[str] = None
    insight_type: Optional[str] = None

class NoteResponse(NoteBase):
    id: int
    problem_id: int
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Problem Schemas ─────────────────────────────────────────
class ProblemBase(BaseModel):
    title: str
    difficulty: str = "Medium"
    category: Optional[str] = None
    section_id: Optional[str] = None
    pattern: Optional[str] = None
    leetcode_id: Optional[str] = None
    leetcode_slug: Optional[str] = None

class ProblemCreate(ProblemBase):
    pass

class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    section_id: Optional[str] = None
    pattern: Optional[str] = None
    leetcode_id: Optional[str] = None
    leetcode_slug: Optional[str] = None

class ProblemResponse(ProblemBase):
    id: int
    is_done: bool = False
    is_revision: bool = False
    acceptance_rate: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tags: List[TagResponse] = []
    notes: List[NoteResponse] = []

    # Aliases for frontend compatibility
    @property
    def done(self) -> bool:
        return self.is_done

    @property
    def revision(self) -> bool:
        return self.is_revision

    @property
    def insights(self) -> List[NoteResponse]:
        return self.notes

    model_config = {"from_attributes": True}


class ProblemListResponse(BaseModel):
    """Flat list item with frontend-compatible field names"""
    id: int
    title: str
    difficulty: str
    category: Optional[str] = None
    section_id: Optional[str] = None
    pattern: Optional[str] = None
    leetcode_id: Optional[str] = None
    leetcode_slug: Optional[str] = None
    is_done: bool = False
    is_revision: bool = False
    done: bool = False
    revision: bool = False
    acceptance_rate: Optional[float] = None
    tags: List[TagResponse] = []
    notes: List[NoteResponse] = []
    insights: List[NoteResponse] = []
    model_config = {"from_attributes": True}


# ─── Solution Schemas ─────────────────────────────────────────
class SolutionSubmit(BaseModel):
    code: str
    language: str = "python3"
    user_id: Optional[str] = "demo-user"
    explanation: Optional[str] = ""

class SolutionTest(BaseModel):
    code: str
    language: str = "python3"

class SolutionResponse(BaseModel):
    id: int
    problem_id: int
    code: str
    language: str
    is_correct: Optional[bool] = None
    runtime_ms: Optional[float] = None
    test_results: Optional[Any] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── LeetCode Master Schemas ──────────────────────────────────
class LeetCodeMasterResponse(BaseModel):
    id: int
    question_id: str
    title: str
    title_slug: str
    difficulty: str
    ac_rate: Optional[float] = None
    is_paid_only: bool = False
    topic_tags: Optional[List[Any]] = []
    category_title: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Whiteboard Schemas ───────────────────────────────────────
class WhiteboardSave(BaseModel):
    canvas_data: Any

class WhiteboardResponse(BaseModel):
    id: int
    problem_id: int
    canvas_data: Optional[Any] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Misc ─────────────────────────────────────────────────────
class MarkDone(BaseModel):
    user_id: Optional[str] = "demo-user"

class AddTagBody(BaseModel):
    tag_id: int

class InsightCreate(BaseModel):
    text: str
    insight_type: str = "note"
