"""
User schemas for API requests/responses
Create this file at: app/schemas/user.py
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    """User registration schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    """User login schema"""
    username: str
    password: str

class UserResponse(BaseModel):
    """User response schema (no password)"""
    id: str
    username: str
    email: str
    full_name: Optional[str]
    is_admin: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserProgressResponse(BaseModel):
    """User progress response"""
    user_id: str
    username: str
    total_problems: int
    completed_problems: int
    revision_problems: int
    completion_percentage: float
    
    class Config:
        from_attributes = True

class UserDetailResponse(BaseModel):
    """Detailed user response with stats"""
    id: str
    username: str
    email: str
    full_name: Optional[str]
    is_admin: bool
    is_active: bool
    created_at: datetime
    problem_count: int = 0
    completed_count: int = 0
    
    class Config:
        from_attributes = True
