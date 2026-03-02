"""Notes endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_note_creates_if_missing(client, auth_headers):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Note Test", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]

    resp = await client.get(f"/api/v1/notes/{pid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["content"] == ""


@pytest.mark.asyncio
async def test_upsert_note(client, auth_headers):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Note Upsert", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]

    resp = await client.put(f"/api/v1/notes/{pid}", headers=auth_headers, json={
        "content": "<h2>My Notes</h2><p>Use a hash map.</p>"
    })
    assert resp.status_code == 200
    assert "hash map" in resp.json()["content"]


@pytest.mark.asyncio
async def test_notes_are_per_user(client, auth_headers, auth_headers2):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Notes Isolation", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]
    await client.post(f"/api/v1/problems/add-from-master/{pid}", headers=auth_headers2)

    await client.put(f"/api/v1/notes/{pid}", headers=auth_headers,  json={"content": "user1 notes"})
    await client.put(f"/api/v1/notes/{pid}", headers=auth_headers2, json={"content": "user2 notes"})

    n1 = (await client.get(f"/api/v1/notes/{pid}", headers=auth_headers)).json()
    n2 = (await client.get(f"/api/v1/notes/{pid}", headers=auth_headers2)).json()
    assert n1["content"] == "user1 notes"
    assert n2["content"] == "user2 notes"
