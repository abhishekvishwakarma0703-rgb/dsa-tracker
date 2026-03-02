from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt import PyJWTError
from fastapi import Depends, HTTPException, status
# FIX: Changed HTTPAuthCredentials to HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.db.database import async_session
from app.db.models import User
from sqlalchemy import select

# HTTP Bearer scheme for token extraction
security = HTTPBearer()

class TokenData:
    """Token payload data"""
    def __init__(self, user_id: str, username: str, role: str):
        self.user_id = user_id
        self.username = username
        self.role = role

def create_access_token(user_id: str, username: str, role: str, expires_delta: Optional[timedelta] = None):
    """Create JWT token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode = {
        "user_id": str(user_id), # Ensure string for JSON
        "username": username,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# FIX: Updated type hint to HTTPAuthorizationCredentials
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Verify JWT token from request header"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("user_id")
        username: str = payload.get("username")
        role: str = payload.get("role", "user")
        
        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing claims"
            )
        
        return TokenData(user_id=user_id, username=username, role=role)
        
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_user(token_data: TokenData = Depends(verify_token)):
    """Get current authenticated user from database"""
    async with async_session() as session:
        # We search by ID extracted from the token
        result = await session.execute(
            select(User).where(User.id == token_data.user_id)
        )
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check if model has 'is_active' attribute
        if hasattr(user, 'is_active') and not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        return user

async def require_admin(current_user: User = Depends(get_current_user)):
    """Ensure user has admin privileges"""
    # Assuming your User model has 'is_admin' or checking against settings
    is_admin = getattr(current_user, 'is_admin', False)
    
    # Optional: Also check against ADMIN_USERS list in settings
    if not is_admin and current_user.username not in settings.ADMIN_USERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to ensure user is authenticated
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object
    """
    return current_user
