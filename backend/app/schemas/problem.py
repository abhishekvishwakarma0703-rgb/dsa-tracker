"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- 1. SHARED & UTILITY SCHEMAS ---

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

class ErrorResponseSchema(BaseModel):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None

# --- 2. TAG SCHEMAS ---

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

# --- 3. INSIGHT (NOTE) SCHEMAS ---

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

# --- 4. PROBLEM & SOLUTION DATA SCHEMAS ---

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
    difficulty: str
    category: Optional[str] = None
    pattern: Optional[str] = None
    section_id: Optional[str] = None
    solution_data: Optional[SolutionDataSchema] = None
    test_cases: Optional[List[TestCaseSchema]] = None

class ProblemUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    pattern: Optional[str] = None
    solution_data: Optional[SolutionDataSchema] = None
    test_cases: Optional[List[TestCaseSchema]] = None
    # User progress fields
    done: bool = False
    revision: bool = False
    views: int = 0

    model_config = ConfigDict(from_attributes=True)

class ProblemResponseSchema(BaseModel):
    id: str
    title: str
    leetcode_id: Optional[str] = None
    description: Optional[str] = None
    difficulty: str
    category: Optional[str] = None
    pattern: Optional[str] = None
    solution_data: Optional[SolutionDataSchema] = None
    test_cases: Optional[List[TestCaseSchema]] = None
    created_at: datetime
    updated_at: datetime
    # User progress fields
    done: bool = False
    revision: bool = False
    views: int = 0
    # Relationships
    tags: List[TagResponseSchema] = []
    notes: List[InsightResponseSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- 5. USER SCHEMAS ---

class UserCreateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

class UserResponseSchema(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- 6. SOLUTION EXECUTION SCHEMAS ---

class SolutionSubmitSchema(BaseModel):
    code: str = Field(..., max_length=10000)
    language: str = "javascript"
    explanation: Optional[str] = None
    approach: Optional[str] = None
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None

class SolutionTestSchema(BaseModel):
    code: str
    test_cases: List[TestCaseSchema]
    language: str = "javascript"
    timeout: int = 5

class SolutionResponseSchema(BaseModel):
    id: str
    problem_id: str
    code: str
    language: str
    explanation: Optional[str] = None
    passed_test_cases: int = 0
    total_test_cases: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- 7. USER PROGRESS SCHEMAS ---

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

# --- 8. AI / LLM INTEGRATION SCHEMAS ---

class CodeAnalysisRequestSchema(BaseModel):
    code: str
    language: str
    problem_description: str
    test_cases: Optional[List[TestCaseSchema]] = None

class CodeAnalysisResponseSchema(BaseModel):
    score: int  # 0-100
    feedback: str
    improvements: List[str]
    optimizations: Optional[List[str]] = None
    complexity_analysis: Optional[str] = None

class HintRequestSchema(BaseModel):
    problem_id: str
    difficulty_level: str = "medium"  # easy, medium, hard

class HintResponseSchema(BaseModel):
    hint: str
    approach_hint: Optional[str] = None
    code_snippet: Optional[str] = None

# --- FINAL REBUILD ---
ProblemResponseSchema.model_rebuild()

# ---------------------------------------------------------------------------
# NEW: LeetCode cache response schema
# ---------------------------------------------------------------------------
class LeetCodeCacheResponseSchema(BaseModel):
    id:                str
    slug:              str
    title:             str
    difficulty:        Optional[str]       = None
    tags:              List[str]           = []
    description:       Optional[str]       = None
    raw_html:          Optional[str]       = None
    examples:          List[Dict[str, Any]]= []
    starter_code:      Optional[str]       = None
    code_snippets:     List[Dict[str, Any]]= []
    example_testcases: Optional[str]       = None
    created_at:        datetime

    model_config = ConfigDict(from_attributes=True)
