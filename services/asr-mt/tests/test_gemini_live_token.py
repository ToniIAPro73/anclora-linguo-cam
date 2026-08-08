from app import main
from conftest import make_token


class FakeGeminiResponse:
    status_code = 200
    text = '{"name":"ephemeral-token"}'

    def json(self):
        return {"name": "ephemeral-token", "expireTime": "2026-01-01T00:30:00Z"}


class FakeGeminiRejectedConstraintsResponse:
    status_code = 400
    text = (
        '{"error":{"code":400,"message":"Invalid JSON payload received. '
        'Unknown name \\"liveConnectConstraints\\" at \\"auth_token\\": Cannot find field.",'
        '"status":"INVALID_ARGUMENT"}}'
    )

    def json(self):
        return {
            "error": {
                "code": 400,
                "message": (
                    "Invalid JSON payload received. Unknown name "
                    '"liveConnectConstraints" at "auth_token": Cannot find field.'
                ),
                "status": "INVALID_ARGUMENT",
            }
        }


class FakeGeminiRejectedModelResponse:
    status_code = 400
    text = '{"error":{"code":400,"message":"Model is not supported","status":"INVALID_ARGUMENT"}}'

    def json(self):
        return {
            "error": {
                "code": 400,
                "message": "Model is not supported",
                "status": "INVALID_ARGUMENT",
            }
        }


class FakeAsyncClient:
    last_request = None
    requests = []
    responses = [FakeGeminiResponse()]

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers, json):
        request = {
            "url": url,
            "headers": headers,
            "json": json,
        }
        FakeAsyncClient.last_request = request
        FakeAsyncClient.requests.append(request)
        if FakeAsyncClient.responses:
            return FakeAsyncClient.responses.pop(0)
        return FakeGeminiResponse()


def force_rest_fallback(monkeypatch):
    def raise_missing_sdk(target_language):
        raise ModuleNotFoundError("google")

    monkeypatch.setattr(main, "_create_gemini_live_token_with_sdk", raise_missing_sdk)


def test_gemini_live_token_uses_sdk_first(client, monkeypatch):
    token = make_token(client)
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-google-key")

    def fake_sdk(target_language):
        assert target_language == "en"
        return {"name": "sdk-ephemeral-token", "expireTime": "2026-01-01T00:30:00Z"}

    monkeypatch.setattr(main, "_create_gemini_live_token_with_sdk", fake_sdk)

    response = client.post(
        "/api/gemini/live-token",
        json={"token": token, "target_language_code": "en"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "token": "sdk-ephemeral-token",
        "expire_time": "2026-01-01T00:30:00Z",
    }


def test_gemini_live_token_uses_constrained_translate_config(client, monkeypatch):
    token = make_token(client)
    FakeAsyncClient.requests = []
    FakeAsyncClient.responses = [FakeGeminiResponse()]
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-google-key")
    force_rest_fallback(monkeypatch)
    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)

    response = client.post(
        "/api/gemini/live-token",
        json={"token": token, "target_language_code": "en"},
    )

    assert response.status_code == 200
    assert response.json()["token"] == "ephemeral-token"
    request = FakeAsyncClient.last_request
    assert request["headers"]["x-goog-api-key"] == "test-google-key"
    constraints = request["json"]["live_connect_constraints"]
    assert constraints["model"] == "models/gemini-3.5-live-translate-preview"
    assert constraints["config"]["response_modalities"] == ["AUDIO"]
    assert constraints["config"]["input_audio_transcription"] == {}
    assert constraints["config"]["output_audio_transcription"] == {}
    assert constraints["config"]["translation_config"] == {
        "target_language_code": "en",
        "echo_target_language": True,
    }


def test_gemini_live_token_returns_sanitized_google_error(client, monkeypatch):
    token = make_token(client)
    FakeAsyncClient.requests = []
    FakeAsyncClient.responses = [FakeGeminiRejectedModelResponse()]
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-google-key")
    force_rest_fallback(monkeypatch)
    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)

    response = client.post(
        "/api/gemini/live-token",
        json={"token": token, "target_language_code": "en"},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Gemini token service rejected request (INVALID_ARGUMENT): Model is not supported"
    )


def test_gemini_live_token_requires_api_key(client, monkeypatch):
    token = make_token(client)
    monkeypatch.setattr(main, "GEMINI_API_KEY", "")

    response = client.post(
        "/api/gemini/live-token",
        json={"token": token, "target_language_code": "es"},
    )

    assert response.status_code == 503
