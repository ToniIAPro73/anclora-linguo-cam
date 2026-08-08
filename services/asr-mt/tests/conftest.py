import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("SESSION_SIGNING_KEY", "test-session-signing-key")
os.environ.setdefault("ALLOWED_ORIGINS", "http://testserver")
os.environ.setdefault("ASR_BACKEND", "mock")
os.environ.setdefault("MT_BACKEND", "mock")

import pytest
from fastapi.testclient import TestClient

from app import main


@pytest.fixture(autouse=True)
def reset_state(monkeypatch, tmp_path):
    main.SESSION_USAGE.clear()
    main.TRANSLATION_CACHE.clear()
    main.ROOM_REGISTRY.clear()
    main.TELEMETRY_EVENTS.clear()
    main.RATE_LIMIT_BUCKETS.clear()
    monkeypatch.setattr(main, "STORAGE_BACKEND", "memory")
    monkeypatch.setattr(main, "SQLITE_DB_PATH", tmp_path / "asr-mt-test.sqlite3")
    monkeypatch.setattr(main, "AUDIT_LOG_PATH", tmp_path / "audit-log.jsonl")
    monkeypatch.setattr(main, "MAX_TRANSLATION_CHARS_PER_SESSION", 20000)
    monkeypatch.setattr(main, "MAX_TTS_CHARS_PER_SESSION", 12000)
    monkeypatch.setattr(main, "RATE_LIMIT_WINDOW_SECONDS", 60)
    monkeypatch.setattr(main, "RATE_LIMIT_AUTH_SESSION_PER_WINDOW", 20)
    monkeypatch.setattr(main, "RATE_LIMIT_CHAT_TRANSLATE_PER_WINDOW", 120)
    monkeypatch.setattr(main, "RATE_LIMIT_TELEMETRY_PER_WINDOW", 240)
    monkeypatch.setattr(main, "RATE_LIMIT_WS_MESSAGES_PER_WINDOW", 1200)
    monkeypatch.setattr(main, "MT_MICRO_BATCH_WINDOW_MS", 0)
    yield
    main.SESSION_USAGE.clear()
    main.TRANSLATION_CACHE.clear()
    main.ROOM_REGISTRY.clear()
    main.TELEMETRY_EVENTS.clear()
    main.RATE_LIMIT_BUCKETS.clear()


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def make_token(client: TestClient, display_name: str = "Test Agent", role: str = "agent") -> str:
    response = client.post(
        "/api/auth/session",
        json={"display_name": display_name, "role": role},
    )
    assert response.status_code == 200
    return response.json()["token"]
