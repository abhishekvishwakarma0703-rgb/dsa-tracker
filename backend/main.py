"""
DSA Problem Tracker Backend — with Socket.IO for real-time discussion.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import socketio
import logging
import sys
import os
import json
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.v1.router import api_router
from app.db.database import init_db, close_db
from app.middleware.error_handler import setup_error_handlers

if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logger = logging.getLogger(__name__)

# ── Socket.IO ─────────────────────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")

@sio.event
async def join_problem(sid, data):
    room = f"problem_{data.get('problem_id')}"
    await sio.enter_room(sid, room)

@sio.event
async def leave_problem(sid, data):
    room = f"problem_{data.get('problem_id')}"
    await sio.leave_room(sid, room)

@sio.event
async def send_message(sid, data):
    """Broadcast a new message to all room members."""
    problem_id = data.get("problem_id")
    room       = f"problem_{problem_id}"
    await sio.emit("new_message", data, room=room, skip_sid=sid)

# Export sio so endpoints can emit
import app.sio_instance as _sio_mod
_sio_mod.sio = sio

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DSA Tracker API")
    await init_db()

    from app.db.database import async_session
    from app.db.models import Problem, LeetCodeMaster
    from sqlalchemy import select

    async with async_session() as session:
        # 1. Handle DSA Problems Population (Optional)
        res_p = await session.execute(select(Problem).limit(1))
        if not res_p.scalars().first():
            try:
                from init_db import DSA_PROBLEMS
                for pd in DSA_PROBLEMS:
                    p = Problem(
                        title=pd["title"],
                        difficulty=pd["difficulty"],
                        category=pd["category"],
                        leetcode_id=pd.get("leetcode_id")
                    )
                    session.add(p)
                logger.info("Populated default DSA problems")
            except ImportError:
                logger.warning("init_db.py not found, skipping DSA problem population")

        # 2. Handle LeetCode Master Population from JSON
        res_lc = await session.execute(select(LeetCodeMaster).limit(1))
        if not res_lc.scalars().first():
            json_path = "leetcode_problems.json" # Ensure this path is correct
            if os.path.exists(json_path):
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        lc_data = json.load(f)
                    
                    for item in lc_data:
                        master_entry = LeetCodeMaster(
                            question_id=str(item["questionId"]),
                            title=item["title"],
                            title_slug=item["titleSlug"],
                            difficulty=item["difficulty"],
                            ac_rate=item.get("acRate", 0.0),
                            is_paid_only=item.get("isPaidOnly", False),
                            topic_tags=item.get("topicTags", []),
                            category_title=item.get("categoryTitle", "Algorithms")
                        )
                        session.add(master_entry)
                    
                    await session.commit()
                    logger.info(f"Populated {len(lc_data)} items to LeetCodeMaster")
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Failed to populate LeetCodeMaster: {e}")
            else:
                logger.warning(f"{json_path} not found")

    yield
    await close_db()
# ── FastAPI app ───────────────────────────────────────────────────────────────
fastapi_app = FastAPI(
    title="DSA Problem Tracker API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
fastapi_app.add_middleware(GZipMiddleware, minimum_size=1000)
setup_error_handlers(fastapi_app)
setup_logging()

fastapi_app.include_router(api_router, prefix="/api/v1")

# Static uploads folder (for image uploads if needed)
os.makedirs("uploads", exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@fastapi_app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}

@fastapi_app.get("/")
async def root():
    return {"message": "DSA Problem Tracker API v2", "docs": "/api/docs"}

# ── Mount Socket.IO on the ASGI app ───────────────────────────────────────────
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
