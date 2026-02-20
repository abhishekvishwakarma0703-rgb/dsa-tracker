"""
API v1 Router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    problems,
    tags,
    insights,
    solutions,
    leetcode_master,
    whiteboard,
    visualize,
    problems_from_master,
)

api_router = APIRouter()

api_router.include_router(problems.router)
api_router.include_router(problems_from_master.router)
api_router.include_router(tags.router)
api_router.include_router(insights.router)
api_router.include_router(solutions.router)
api_router.include_router(solutions.execute_router)
api_router.include_router(leetcode_master.router)
api_router.include_router(whiteboard.router)
api_router.include_router(visualize.router)
