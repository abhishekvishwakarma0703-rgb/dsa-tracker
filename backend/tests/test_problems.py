"""Problem endpoint tests — per-user isolation."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_problems_empty_for_new_user(client, auth_headers):
    resp = await client.get("/api/v1/problems/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_problem_adds_to_workspace(client, auth_headers):
    resp = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Test Problem",
        "difficulty": "Easy",
        "category": "Arrays",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Problem"
    return data["id"]


@pytest.mark.asyncio
async def test_user_isolation_delete(client, auth_headers, auth_headers2):
    """User 1 deletes their problem — user 2 is unaffected."""
    # user1 creates
    r1 = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Shared Problem", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r1.json()["id"]

    # user2 adds to their workspace via add-from-master
    r2 = await client.post(f"/api/v1/problems/add-from-master/{pid}", headers=auth_headers2)
    assert r2.status_code == 201

    # user1 deletes from their workspace
    rd = await client.delete(f"/api/v1/problems/{pid}", headers=auth_headers)
    assert rd.status_code == 204

    # user1's list no longer has it
    r1_list = await client.get("/api/v1/problems/", headers=auth_headers)
    ids1 = [p["id"] for p in r1_list.json()]
    assert pid not in ids1

    # user2's list still has it
    r2_list = await client.get("/api/v1/problems/", headers=auth_headers2)
    ids2 = [p["id"] for p in r2_list.json()]
    assert pid in ids2


@pytest.mark.asyncio
async def test_mark_done_per_user(client, auth_headers, auth_headers2):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Mark Test", "difficulty": "Medium", "category": "DP"
    })
    pid = r.json()["id"]
    await client.post(f"/api/v1/problems/add-from-master/{pid}", headers=auth_headers2)

    # user1 marks done
    await client.post(f"/api/v1/problems/{pid}/mark-done", headers=auth_headers)

    # user1 sees done=True
    list1 = await client.get("/api/v1/problems/", headers=auth_headers)
    p1 = next(p for p in list1.json() if p["id"] == pid)
    assert p1["done"] is True

    # user2 still sees done=False
    list2 = await client.get("/api/v1/problems/", headers=auth_headers2)
    p2 = next(p for p in list2.json() if p["id"] == pid)
    assert p2["done"] is False


@pytest.mark.asyncio
async def test_autosave(client, auth_headers):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Autosave Test", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]
    resp = await client.patch(f"/api/v1/problems/{pid}/autosave", headers=auth_headers, json={
        "code": "def solution(): pass", "language": "python3"
    })
    assert resp.status_code == 200

    # Verify draft is persisted
    detail = await client.get(f"/api/v1/problems/{pid}", headers=auth_headers)
    assert detail.json()["draft_code"] == "def solution(): pass"
