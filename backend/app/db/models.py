"""
Database models for DSA Problem Tracker
Full multi-user isolation — every user-specific table has user_id FK.
"""

from sqlalchemy import (
    Column, Float, String, Integer, Boolean, DateTime, Text, JSON,
    ForeignKey, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

# ── Association tables ──────────────────────────────────────────────────────
problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", String, ForeignKey("problems.id")),
    Column("tag_id",     String, ForeignKey("tags.id"))
)


class LeetCodeMaster(Base):
    __tablename__ = "leetcode_master"
    id           = Column(Integer, primary_key=True, index=True)
    question_id  = Column(String(20),  unique=True, index=True, nullable=False)
    title        = Column(String(500), nullable=False, index=True)
    title_slug   = Column(String(500), unique=True, nullable=False, index=True)
    difficulty   = Column(String(20),  nullable=False)
    ac_rate      = Column(Float, default=0.0)
    is_paid_only = Column(Boolean, default=False)
    topic_tags   = Column(JSON, default=list)
    category_title = Column(String(100), default="Algorithms")


class User(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username        = Column(String, unique=True, nullable=False, index=True)
    email           = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name       = Column(String)
    is_active       = Column(Boolean, default=True)
    is_admin        = Column(Boolean, default=False)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    problems         = relationship("UserProblem",  back_populates="user", cascade="all, delete-orphan")
    solutions        = relationship("Solution",      back_populates="user", cascade="all, delete-orphan")
    insights         = relationship("Insight",       back_populates="user", cascade="all, delete-orphan")
    notes            = relationship("Note",          back_populates="user", cascade="all, delete-orphan")
    messages         = relationship("Message",       back_populates="user", cascade="all, delete-orphan")
    notifications    = relationship("Notification",  back_populates="user", cascade="all, delete-orphan")
    watched_problems = relationship("ProblemWatch",  back_populates="user", cascade="all, delete-orphan")


class Problem(Base):
    __tablename__ = "problems"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, index=True)
    description = Column(Text)
    difficulty = Column(String, nullable=False)
    category = Column(String, index=True)
    pattern = Column(String)
    section_id = Column(String)
    leetcode_id = Column(String(50), nullable=True)
    leetcode_slug = Column(String(500), nullable=True, index=True)
    solution_data = Column(JSON)
    test_cases = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # ADDED: lazy="selectin" to prevent MissingGreenlet errors during serialization
    user_problems = relationship("UserProblem", back_populates="problem", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="problem", cascade="all, delete-orphan", lazy="selectin")
    tags = relationship("Tag", secondary=problem_tags, back_populates="problems", lazy="selectin")
    messages = relationship("Message", back_populates="problem", cascade="all, delete-orphan")
# ADD THIS LINE:
    notes = relationship("Note", back_populates="problem", cascade="all, delete-orphan", lazy="selectin")
    
    # ADD THIS LINE (for ProblemWatch):
    watches = relationship("ProblemWatch", back_populates="problem", cascade="all, delete-orphan")
    solutions = relationship("Solution", back_populates="problem", cascade="all, delete-orphan")

class UserProblem(Base):
    """Per-user workspace entry. Add/delete are per-user only."""
    __tablename__ = "user_problems"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_user_problem"),)

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)

    is_done     = Column(Boolean, default=False)
    is_revision = Column(Boolean, default=False)
    views       = Column(Integer, default=0)
    draft_code  = Column(Text)
    draft_lang  = Column(String, default="python3")

    first_attempted_at = Column(DateTime)
    last_attempted_at  = Column(DateTime, server_default=func.now())
    completed_at       = Column(DateTime)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user    = relationship("User",    back_populates="problems")
    problem = relationship("Problem", back_populates="user_problems")


class Solution(Base):
    __tablename__ = "solutions"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)

    code        = Column(Text, nullable=False)
    language    = Column(String, default="python3")
    explanation = Column(Text)
    approach    = Column(String)

    version_number   = Column(Integer, default=1)
    time_complexity  = Column(String)
    space_complexity = Column(String)

    passed_test_cases = Column(Integer, default=0)
    total_test_cases  = Column(Integer, default=0)
    test_results      = Column(JSON)

    ai_feedback = Column(Text)
    ai_score    = Column(Integer)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user    = relationship("User",    back_populates="solutions")
    problem = relationship("Problem", back_populates="solutions")


class Insight(Base):
    """Quick plain-text insights/notes."""
    __tablename__ = "insights"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)
    text         = Column(Text, nullable=False)
    insight_type = Column(String, default="general")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user    = relationship("User",    back_populates="insights")
    problem = relationship("Problem", back_populates="insights")


class Note(Base):
    """Rich HTML notes per user per problem."""
    __tablename__ = "notes"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)
    content    = Column(Text, default="")
    is_quick   = Column(Boolean, default=False)
    quick_text = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user    = relationship("User",    back_populates="notes")
    problem = relationship("Problem", back_populates="notes")


class Message(Base):
    """Discussion message — globally visible, per problem."""
    __tablename__ = "messages"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user    = relationship("User",    back_populates="messages")
    problem = relationship("Problem", back_populates="messages")


class ProblemWatch(Base):
    __tablename__ = "problem_watches"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_watch"),)
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"),    nullable=False, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    user    = relationship("User",    back_populates="watched_problems")
    problem = relationship("Problem", back_populates="watches")


class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    problem_id = Column(String, nullable=True)
    message_id = Column(String, nullable=True)
    type       = Column(String, default="new_message")
    text       = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


class Tag(Base):
    __tablename__ = "tags"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String, unique=True, nullable=False, index=True)
    color      = Column(String, default="#3b82f6")
    created_at = Column(DateTime, server_default=func.now())

    problems = relationship("Problem", secondary=problem_tags, back_populates="tags")


class LeetCodeCache(Base):
    __tablename__ = "lc_cache"
    id                = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug              = Column(String, unique=True, nullable=False, index=True)
    title             = Column(String, nullable=False)
    difficulty        = Column(String)
    tags              = Column(JSON, default=list)
    description       = Column(Text)
    raw_html          = Column(Text)
    examples          = Column(JSON, default=list)
    starter_code      = Column(Text)
    code_snippets     = Column(JSON, default=list)
    example_testcases = Column(Text, default="")
    created_at        = Column(DateTime, server_default=func.now())


class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)
    role       = Column(String, nullable=False)
    content    = Column(Text,   nullable=False)
    msg_type   = Column(String, default="chat")
    hint_level = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class AiUsage(Base):
    __tablename__ = "ai_usage"
    __table_args__ = (UniqueConstraint("date_str", "model", name="uq_ai_usage_date_model"),)
    id         = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    date_str   = Column(String,  nullable=False, index=True)
    provider   = Column(String,  nullable=False)
    model      = Column(String,  nullable=False)
    req_count  = Column(Integer, default=1, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
