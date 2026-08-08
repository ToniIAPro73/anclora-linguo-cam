from app import main
from app.backends import MockASRBackend, MockMTBackend


def test_mock_backends_publish_lightweight_capabilities():
    assert MockASRBackend.capabilities.name == "mock-asr"
    assert MockASRBackend.capabilities.streaming is True
    assert MockASRBackend.capabilities.partial_results is True
    assert MockASRBackend.capabilities.requires_ml_dependencies is False

    assert MockMTBackend.capabilities.name == "mock-mt"
    assert MockMTBackend.capabilities.supported_pairs == ["*"]
    assert MockMTBackend.capabilities.requires_ml_dependencies is False


def test_build_mock_backends_do_not_require_ml_dependencies(monkeypatch):
    monkeypatch.setenv("ASR_BACKEND", "mock")
    monkeypatch.setenv("MT_BACKEND", "mock")

    assert isinstance(main.build_asr_backend(), MockASRBackend)
    assert isinstance(main.build_mt_backend(), MockMTBackend)


def test_backend_capabilities_endpoint_lists_optional_ml_backends(client):
    response = client.get("/api/ops/backend-capabilities")

    assert response.status_code == 200
    payload = response.json()
    asr_names = {item["name"] for item in payload["asr_backends"]}
    mt_names = {item["name"] for item in payload["mt_backends"]}
    assert {"mock-asr", "vosk", "faster-whisper"}.issubset(asr_names)
    assert {"mock-mt", "transformers-mt"}.issubset(mt_names)
    assert payload["translation_provider"] == "oss"
    assert payload["qa_ab_enabled"] is False


def test_provider_selection_is_stable_and_default_oss(monkeypatch):
    monkeypatch.delenv("TRANSLATION_PROVIDER", raising=False)
    monkeypatch.delenv("QA_AB_PERCENT", raising=False)

    first = main._select_translation_provider("session-123")
    second = main._select_translation_provider("session-123")

    assert first == second
    assert first[0] == "oss"
    assert first[2] is False


def test_provider_selection_ab_uses_deterministic_bucket(monkeypatch):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "ab")
    monkeypatch.setenv("QA_AB_PERCENT", "100")

    provider, bucket, enabled, percent = main._select_translation_provider("session-123")

    assert provider == "gemini"
    assert 0 <= bucket < 100
    assert enabled is True
    assert percent == 100


def test_provider_selection_endpoint_rejects_empty_session_id(client):
    response = client.post("/api/ops/provider-selection", json={"session_id": " "})

    assert response.status_code == 400
