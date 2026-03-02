"""
Authentication endpoints
Create this file at: app/api/v1/endpoints/auth.py
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import logging

from app.db.database import async_session
from app.db.models import User, UserProblem
from app.core.auth import create_access_token, get_current_user, require_admin
from app.core.security import hash_password, verify_password
from app.schemas.user import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    UserDetailResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
from sqlalchemy import insert, select
from app.db.models import User, UserProblem, Problem  

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register new user and initialize their DSA workspace"""
    async with async_session() as session:
        # 1. Check if user already exists
        result = await session.execute(
            select(User).where(
                (User.username == user_data.username) | (User.email == user_data.email)
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )

        # 2. Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            full_name=user_data.full_name,
            is_admin=False,
            is_active=True
        )
        
        try:
            session.add(new_user)
            await session.flush() # Flush to get new_user.id before committing

            # --- WORKSPACE INITIALIZATION START ---
            # 3. Fetch all master problems
            problems_result = await session.execute(select(Problem.id))
            master_problem_ids = problems_result.scalars().all()
            print("master id", master_problem_ids)
            # 4. Bulk create UserProblem links for the new user
            if master_problem_ids:
                user_problems = [
                    {"user_id": new_user.id, "problem_id": pid}
                    for pid in master_problem_ids
                ]
                await session.execute(insert(UserProblem), user_problems)
            # --- WORKSPACE INITIALIZATION END ---

            await session.commit()
            await session.refresh(new_user)
            
            access_token = create_access_token(
                user_id=new_user.id,
                username=new_user.username,
                role="admin" if new_user.is_admin else "user"
            )
            
            return TokenResponse(
                access_token=access_token,
                user=UserResponse.from_orm(new_user)
            )
            
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )

@router.post("/register2", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register new user"""
    async with async_session() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(
                (User.username == user_data.username) | (User.email == user_data.email)
            )
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        print(f"DEBUG: Password Length: {len(user_data.password)}")
        print(f"DEBUG: Password Content starts with: {user_data.password[:5]}")
        hashed_password = hash_password(user_data.password)
        print(f"DEBUG: hashed: {hashed_password}")

        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            full_name=user_data.full_name,
            is_admin=False,
            is_active=True
        )
        
        try:
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            
            access_token = create_access_token(
                user_id=new_user.id,
                username=new_user.username,
                role="admin" if new_user.is_admin else "user"
            )
            
            logger.info(f"New user registered: {new_user.username}")
            
            return TokenResponse(
                access_token=access_token,
                user=UserResponse.from_orm(new_user)
            )
            
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login user"""
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == user_data.username)
        )
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        access_token = create_access_token(
            user_id=user.id,
            username=user.username,
            role="admin" if user.is_admin else "user"
        )
        
        logger.info(f"User logged in: {user.username}")
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.from_orm(user)
        )

@router.get("/me", response_model=UserDetailResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.id == current_user.id)
        )
        user = result.scalar_one()
        
        problem_result = await session.execute(
            select(UserProblem).where(UserProblem.user_id == current_user.id)
        )
        problems = problem_result.scalars().all()
        
        total_problems = len(problems)
        completed_count = len([p for p in problems if p.is_done])
        
        return UserDetailResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
            problem_count=total_problems,
            completed_count=completed_count
        )

@router.get("/users", response_model=list[UserResponse])
async def list_users(current_user: User = Depends(require_admin)):
    """List all users (admin only)"""
    async with async_session() as session:
        result = await session.execute(select(User).order_by(User.created_at.desc()))
        users = result.scalars().all()
        return [UserResponse.from_orm(u) for u in users]

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    is_admin: bool,
    current_user: User = Depends(require_admin)
):
    """Update user role (admin only)"""
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_admin = is_admin
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User role updated: {user.username}, admin={is_admin}")
        
        return UserResponse.from_orm(user)

@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: User = Depends(require_admin)
):
    """Activate/deactivate user (admin only)"""
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = is_active
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User status updated: {user.username}, active={is_active}")
        
        return UserResponse.from_orm(user)
