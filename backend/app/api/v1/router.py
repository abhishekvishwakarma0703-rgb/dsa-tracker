"""API v1 router"""
from fastapi import APIRouter
from app.api.v1.endpoints import problems, auth, solutions, insights, health, tags, leetcode, tutor, notes, discussion

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(problems.router,    prefix="/problems",    tags=["Problems"])
api_router.include_router(solutions.router,   prefix="/solutions",   tags=["Solutions"])
api_router.include_router(insights.router,    prefix="/insights",    tags=["Insights"])
api_router.include_router(notes.router,       prefix="/notes",       tags=["Notes"])
api_router.include_router(discussion.router,  prefix="/discussion",  tags=["Discussion"])
api_router.include_router(health.router,      prefix="/health",      tags=["Health"])
api_router.include_router(tags.router,        prefix="/tags",        tags=["Tags"])
api_router.include_router(leetcode.router,    prefix="/leetcode",    tags=["LeetCode Cache"])
api_router.include_router(tutor.router,       prefix="/tutor",       tags=["AI Tutor"])
