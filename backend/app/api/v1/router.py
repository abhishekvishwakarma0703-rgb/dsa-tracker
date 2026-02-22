"""
API v1 router configuration
"""

from fastapi import APIRouter
from app.api.v1.endpoints import problems, solutions, insights, health, tags, leetcode, tutor

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(problems.router, prefix="/problems", tags=["Problems"])
api_router.include_router(solutions.router, prefix="/solutions", tags=["Solutions"])
api_router.include_router(insights.router, prefix="/insights", tags=["Insights"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(tags.router, prefix="/tags", tags=["Tags"])

# LeetCode lazy-fetch cache (new)
api_router.include_router(leetcode.router, prefix="/leetcode", tags=["LeetCode Cache"])

# AI Tutor (new)
api_router.include_router(tutor.router, prefix="/tutor", tags=["AI Tutor"])
