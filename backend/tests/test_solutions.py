"""Solution submission + versioning tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_solution_versioning(client, auth_headers):
    # Create problem
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Version Test", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]

    # Submit v1
    r1 = await client.post(f"/api/v1/solutions/{pid}/submit", headers=auth_headers, json={
        "code": "def solve(): return 1", "language": "python3"
    })
    assert r1.status_code == 200
    assert r1.json()["version_number"] == 1

    # Submit v2
    r2 = await client.post(f"/api/v1/solutions/{pid}/submit", headers=auth_headers, json={
        "code": "def solve(): return 2", "language": "python3"
    })
    assert r2.json()["version_number"] == 2


@pytest.mark.asyncio
async def test_solution_scoped_to_user(client, auth_headers, auth_headers2):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Scope Test", "difficulty": "Hard", "category": "Graphs"
    })
    pid = r.json()["id"]

    r1 = await client.post(f"/api/v1/solutions/{pid}/submit", headers=auth_headers, json={
        "code": "user1_code", "language": "python3"
    })
    sol_id = r1.json()["id"]

    # user2 cannot access user1's solution
    r2 = await client.get(f"/api/v1/solutions/{sol_id}", headers=auth_headers2)
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_submission_history(client, auth_headers):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "History Test", "difficulty": "Medium", "category": "DP"
    })
    pid = r.json()["id"]
    for i in range(3):
        await client.post(f"/api/v1/solutions/{pid}/submit", headers=auth_headers, json={
            "code": f"def solve_{i}(): pass", "language": "python3"
        })
    hist = await client.get(f"/api/v1/solutions/me/history?problem_id={pid}", headers=auth_headers)
    assert hist.status_code == 200
    assert len(hist.json()["data"]) == 3
