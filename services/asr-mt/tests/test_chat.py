from app import main
from conftest import make_token


def test_chat_translate_uses_mock_backend_and_updates_usage(client):
    token = make_token(client)

    response = client.post(
        "/api/chat/translate",
        json={"token": token, "text": "hello", "source_lang": "en", "target_lang": "es"},
    )

    assert response.status_code == 200
    assert response.json()["translated_text"] == "[es] hello"
    usage = client.post("/api/sessions/usage", json={"token": token}).json()
    assert usage["translated_chars"] == 5


def test_chat_translate_enforces_quota(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_TRANSLATION_CHARS_PER_SESSION", 4)
    token = make_token(client)

    response = client.post(
        "/api/chat/translate",
        json={"token": token, "text": "hello", "source_lang": "en", "target_lang": "es"},
    )

    assert response.status_code == 429


def test_chat_translate_populates_cache(client):
    token = make_token(client)
    payload = {"token": token, "text": "Hello", "source_lang": "en", "target_lang": "es"}

    first = client.post("/api/chat/translate", json=payload)
    second = client.post("/api/chat/translate", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert main.TRANSLATION_CACHE["en:es:hello"] == "[es] Hello"
