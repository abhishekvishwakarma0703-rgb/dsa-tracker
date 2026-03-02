"""
Test configuration — in-memory SQLite DB, test client, test users.
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.db.database import Base, get_db
from app.db.models import User, Problem, UserProblem
from app.core.security import hash_password

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def test_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password("TestPass123"),
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    yield user
    await db_session.delete(user)
    await db_session.commit()


@pytest.fixture
async def test_user2(db_session):
    user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password=hash_password("TestPass123"),
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    yield user
    await db_session.delete(user)
    await db_session.commit()


@pytest.fixture
async def test_problem(db_session):
    problem = Problem(
        title="Two Sum",
        difficulty="Easy",
        category="Arrays",
        description="Given an array, find two numbers that sum to target.",
        test_cases=[
            {"input": "[2,7,11,15], 9", "expected": "[0,1]"},
            {"input": "[3,2,4], 6",     "expected": "[1,2]"},
        ]
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)
    yield problem
    await db_session.delete(problem)
    await db_session.commit()


@pytest.fixture
async def auth_headers(db_session, test_user):
    """Return JWT auth headers for test_user."""
    # Import here to avoid circular imports
    from app.core.auth import create_access_token
    token = create_access_token(user_id=test_user.id, username=test_user.username, role="user")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers2(db_session, test_user2):
    from app.core.auth import create_access_token
    token = create_access_token(user_id=test_user2.id, username=test_user2.username, role="user")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def client(setup_database):
    """AsyncClient with the FastAPI app and overridden DB."""
    from main import fastapi_app
    fastapi_app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()
