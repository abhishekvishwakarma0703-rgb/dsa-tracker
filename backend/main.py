"""
DSA Problem Tracker Backend
Production-grade FastAPI application with LLM integration support
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import sys
from typing import Optional

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.v1.router import api_router
from app.db.database import init_db, close_db
from app.middleware.error_handler import setup_error_handlers

# Fix for Windows unicode output in console
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Setup logging
logger = logging.getLogger(__name__)

# Lifespan context manager for startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting DSA Problem Tracker API")
    
    # Initialize database and populate with problems if empty
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully")
    
    # Check if database has problems, if not populate
    from app.db.database import async_session
    from app.db.models import Problem
    from sqlalchemy import select
    
    async with async_session() as session:
        result = await session.execute(select(Problem))
        problem_count = len(result.scalars().all())
        
        if problem_count == 0:
            logger.info("Database is empty. Populating with DSA problems...")
            try:
                from init_db import DSA_PROBLEMS
                
                for problem_data in DSA_PROBLEMS:
                    problem = Problem(
                        title=problem_data["title"],
                        difficulty=problem_data["difficulty"],
                        category=problem_data["category"],
                        pattern=problem_data.get("pattern"),
                        leetcode_id=problem_data.get("leetcode_id"),
                        section_id=problem_data.get("section_id"),
                        acceptance_rate=0,
                        total_submissions=0
                    )
                    session.add(problem)
                
                await session.commit()
                logger.info(f"Successfully populated database with {len(DSA_PROBLEMS)} DSA problems")
            except Exception as e:
                logger.warning(f"Could not auto-populate database: {e}")
                logger.info("Run 'python init_db.py' manually to populate the database")
        else:
            logger.info(f"Database already contains {problem_count} problems")
    
    yield
    
    # Shutdown
    logger.info("Shutting down DSA Problem Tracker API")
    await close_db()
    logger.info("Database closed")

# Create FastAPI app
app = FastAPI(
    title="DSA Problem Tracker API",
    description="Production-grade API for tracking and solving DSA problems with AI/LLM integration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Setup error handlers
setup_error_handlers(app)

# Setup logging
setup_logging()

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "DSA Problem Tracker API",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to DSA Problem Tracker API",
        "docs": "/api/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
