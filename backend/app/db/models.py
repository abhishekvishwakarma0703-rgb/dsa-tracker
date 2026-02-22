"""
Database models for DSA Problem Tracker
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from datetime import datetime
import uuid

# Association tables for many-to-many relationships
problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", String, ForeignKey("problems.id")),
    Column("tag_id", String, ForeignKey("tags.id"))
)

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    problems = relationship("UserProblem", back_populates="user", cascade="all, delete-orphan")
    solutions = relationship("Solution", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")

class Problem(Base):
    """Problem model"""
    __tablename__ = "problems"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    leetcode_id = Column(String, unique=True, nullable=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard
    category = Column(String, index=True)
    pattern = Column(String)
    section_id = Column(String)
    
    # Solution metadata
    solution_data = Column(JSON)  # Contains approach, code, complexity, etc.
    test_cases = Column(JSON)  # Contains test cases
    
    # Statistics
    acceptance_rate = Column(Integer, default=0)
    total_submissions = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user_problems = relationship("UserProblem", back_populates="problem", cascade="all, delete-orphan")
    solutions = relationship("Solution", back_populates="problem", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="problem", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=problem_tags, back_populates="problems")

class UserProblem(Base):
    """User progress on problems"""
    __tablename__ = "user_problems"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    
    # Status tracking
    is_done = Column(Boolean, default=False)
    is_revision = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    
    # Timestamps
    first_attempted_at = Column(DateTime)
    last_attempted_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="problems")
    problem = relationship("Problem", back_populates="user_problems")

class Solution(Base):
    """User solutions for problems"""
    __tablename__ = "solutions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    
    # Solution details
    code = Column(Text, nullable=False)
    language = Column(String, default="javascript")  # javascript, python, cpp, java
    explanation = Column(Text)
    approach = Column(String)
    
    # Performance metrics
    time_complexity = Column(String)
    space_complexity = Column(String)
    
    # Testing
    passed_test_cases = Column(Integer, default=0)
    total_test_cases = Column(Integer, default=0)
    test_results = Column(JSON)
    
    # AI Analysis (for future LLM integration)
    ai_feedback = Column(Text)
    ai_score = Column(Integer)  # 0-100
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="solutions")
    problem = relationship("Problem", back_populates="solutions")

class Insight(Base):
    """User insights and notes on problems"""
    __tablename__ = "insights"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    
    # Insight content
    text = Column(Text, nullable=False)
    insight_type = Column(String, default="general")  # general, trick, mistake, optimization
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="insights")
    problem = relationship("Problem", back_populates="insights")

class Tag(Base):
    """Tags for problems"""
    __tablename__ = "tags"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False, index=True)
    color = Column(String, default="#3b82f6")
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    problems = relationship("Problem", secondary=problem_tags, back_populates="tags")


# ---------------------------------------------------------------------------
# NEW: LeetCode problem cache (separate table, does not touch existing models)
# ---------------------------------------------------------------------------
class LeetCodeCache(Base):
    """
    Stores fetched-and-processed LeetCode problem data.
    Populated lazily on first GET /api/v1/leetcode/{slug} request.
    """
    __tablename__ = "lc_cache"

    id           = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    slug         = Column(String,  unique=True, nullable=False, index=True)
    title        = Column(String,  nullable=False)
    difficulty   = Column(String)
    tags         = Column(JSON,    default=list)    # list[str]
    description  = Column(Text)                    # plain-text extracted from HTML
    raw_html     = Column(Text)                    # original content HTML from LC
    examples     = Column(JSON,    default=list)   # list[{input, output, explanation}]
    starter_code = Column(Text)                    # python3 code snippet
    code_snippets= Column(JSON,    default=list)   # all langSlug→code pairs
    example_testcases = Column(Text, default="")
    created_at   = Column(DateTime, server_default=func.now())


# ---------------------------------------------------------------------------
# NEW: AI Tutor chat session messages
# ---------------------------------------------------------------------------
class TutorMessage(Base):
    """Stores per-problem AI tutor conversation messages."""
    __tablename__ = "tutor_messages"

    id         = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String,  nullable=False, index=True)   # "{user_id}-{problem_slug}"
    role       = Column(String,  nullable=False)               # "user" | "assistant" | "system_note"
    content    = Column(Text,    nullable=False)
    msg_type   = Column(String,  default="chat")               # "chat"|"hint"|"review"|"solution"|"explain"
    hint_level = Column(Integer, default=0)                    # 1-3 for hint messages
    created_at = Column(DateTime, server_default=func.now())


# ---------------------------------------------------------------------------
# NEW: AI usage tracking (per day, per model)
# ---------------------------------------------------------------------------
from sqlalchemy import UniqueConstraint

class AiUsage(Base):
    """
    Tracks AI API calls per calendar day and model.
    Used for the usage dashboard so users can see how many free requests remain.
    """
    __tablename__ = "ai_usage"
    __table_args__ = (
        UniqueConstraint("date_str", "model", name="uq_ai_usage_date_model"),
    )

    id          = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    date_str    = Column(String,  nullable=False, index=True)   # "YYYY-MM-DD"
    provider    = Column(String,  nullable=False)               # "gemini" | "anthropic"
    model       = Column(String,  nullable=False)               # e.g. "gemini-2.0-flash"
    req_count   = Column(Integer, default=1, nullable=False)
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
