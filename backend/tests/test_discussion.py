"""Discussion endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_post_and_get_messages(client, auth_headers, auth_headers2):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Discussion Test", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]

    # user1 posts
    resp = await client.post(f"/api/v1/discussion/{pid}/messages", headers=auth_headers, json={
        "content": "Hello world!"
    })
    assert resp.status_code == 200
    assert resp.json()["content"] == "Hello world!"

    # user2 can also read messages (globally visible)
    msgs = await client.get(f"/api/v1/discussion/{pid}/messages", headers=auth_headers2)
    assert msgs.status_code == 200
    assert any(m["content"] == "Hello world!" for m in msgs.json())


@pytest.mark.asyncio
async def test_notifications_on_message(client, auth_headers, auth_headers2):
    r = await client.post("/api/v1/problems/", headers=auth_headers, json={
        "title": "Notify Test", "difficulty": "Easy", "category": "Arrays"
    })
    pid = r.json()["id"]

    # user1 watches
    await client.post(f"/api/v1/discussion/{pid}/watch", headers=auth_headers)

    # user2 posts a message
    await client.post(f"/api/v1/discussion/{pid}/messages", headers=auth_headers2, json={
        "content": "New insight here"
    })

    # user1 should have a notification
    notifs = await client.get("/api/v1/discussion/notifications/me", headers=auth_headers)
    assert notifs.status_code == 200
    assert len(notifs.json()) > 0
