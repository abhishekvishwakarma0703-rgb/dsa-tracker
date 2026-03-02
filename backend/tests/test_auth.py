"""Auth endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "SecurePass123",
        "full_name": "New User"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["username"] == "newuser"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    payload = {"username": "dup", "email": "dup@example.com", "password": "SecurePass123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "username": "logintest", "email": "logintest@example.com", "password": "TestPass123"
    })
    resp = await client.post("/api/v1/auth/login", json={"username": "logintest", "password": "TestPass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_bad_password(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={"username": "logintest", "password": "WrongPass"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403  # HTTPBearer returns 403 when no token
