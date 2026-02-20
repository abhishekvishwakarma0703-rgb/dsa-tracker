"""
Database Models
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text,
    ForeignKey, DateTime, Table, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

# Many-to-many: Problem <-> Tag
problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", Integer, ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class LeetCodeMaster(Base):
    """Master list of all LeetCode problems (from leetcode_problems.json)"""
    __tablename__ = "leetcode_master"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False, index=True)
    title_slug = Column(String(500), unique=True, nullable=False, index=True)
    difficulty = Column(String(20), nullable=False)
    ac_rate = Column(Float, default=0.0)
    is_paid_only = Column(Boolean, default=False)
    topic_tags = Column(JSON, default=list)  # list of {name, slug}
    category_title = Column(String(100), default="Algorithms")


class Problem(Base):
    """User's tracked DSA problem"""
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    difficulty = Column(String(20), nullable=False, default="Medium")
    category = Column(String(200), nullable=True)
    section_id = Column(String(200), nullable=True, index=True)
    pattern = Column(String(200), nullable=True)

    # LeetCode linkage
    leetcode_id = Column(String(50), nullable=True)
    leetcode_slug = Column(String(500), nullable=True)  # normalized slug from master list

    # Stats (from LeetCode master)
    acceptance_rate = Column(Float, default=0.0)
    total_submissions = Column(Integer, default=0)

    # User progress
    is_done = Column(Boolean, default=False)
    is_revision = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tags = relationship("Tag", secondary=problem_tags, back_populates="problems", lazy="selectin")
    notes = relationship("Note", back_populates="problem", cascade="all, delete-orphan", lazy="selectin")
    solutions = relationship("Solution", back_populates="problem", cascade="all, delete-orphan")
    whiteboard = relationship("Whiteboard", back_populates="problem", cascade="all, delete-orphan", uselist=False)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    problems = relationship("Problem", secondary=problem_tags, back_populates="tags")


class Note(Base):
    """User notes/insights for a problem"""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(100), nullable=True, default="demo-user")
    text = Column(Text, nullable=False)
    insight_type = Column(String(50), default="note")  # note, trick, complexity, approach
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    problem = relationship("Problem", back_populates="notes")


class Solution(Base):
    """User submitted solution"""
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(100), nullable=True, default="demo-user")
    code = Column(Text, nullable=False)
    language = Column(String(50), default="python3")
    explanation = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    runtime_ms = Column(Float, nullable=True)
    memory_mb = Column(Float, nullable=True)
    test_results = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    problem = relationship("Problem", back_populates="solutions")


class Whiteboard(Base):
    """Per-problem whiteboard canvas data"""
    __tablename__ = "whiteboards"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), unique=True, nullable=False)
    canvas_data = Column(JSON, nullable=True, default=dict)  # Fabric.js or custom canvas JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    problem = relationship("Problem", back_populates="whiteboard")
