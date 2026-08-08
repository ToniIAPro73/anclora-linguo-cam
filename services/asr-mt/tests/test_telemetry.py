import time

from app import main
from conftest import make_token


def test_sanitize_telemetry_payload_blocks_content_and_truncates(monkeypatch):
    monkeypatch.setattr(main, "MAX_TELEMETRY_PAYLOAD_VALUE_CHARS", 5)
    payload = {
        "email": "person@example.com",
        "display_name": "Sensitive Person",
        "customer_phone": "+15555555555",
        "text": "sensitive",
        "transcript": "sensitive",
        "message": "sensitive",
        "safe": "abcdefghi",
        "samples": [1, 2, "drop", True],
    }

    sanitized = main._sanitize_telemetry_payload(payload)

    assert "text" not in sanitized
    assert "transcript" not in sanitized
    assert "message" not in sanitized
    assert "email" not in sanitized
    assert "display_name" not in sanitized
    assert "customer_phone" not in sanitized
    assert sanitized["safe"] == "abcde"
    assert sanitized["samples"] == [1, 2, True]


def test_sanitize_telemetry_payload_limits_keys(monkeypatch):
    monkeypatch.setattr(main, "MAX_TELEMETRY_PAYLOAD_KEYS", 2)

    sanitized = main._sanitize_telemetry_payload({"a": 1, "b": 2, "c": 3})

    assert list(sanitized.keys()) == ["a", "b"]


def test_telemetry_summary_percentiles_and_schema(client):
    token = make_token(client)
    timestamp_ms = int(time.time() * 1000)
    events = [
        {
            "type": "caption_metrics",
            "timestamp_ms": timestamp_ms + idx,
            "payload": {
                "ttfc_ms": sample,
                "caption_lag_samples_ms": [sample],
                "dropped_hypothesis_rate_pct": 10,
            },
        }
        for idx, sample in enumerate([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])
    ]

    ingest = client.post(
        "/api/telemetry/events",
        json={"token": token, "call_id": "call-1", "events": events},
    )
    summary = client.post("/api/telemetry/summary", json={"token": token})

    assert ingest.status_code == 200
    assert ingest.json()["accepted_events"] == 10
    assert summary.status_code == 200
    assert summary.json()["schema_version"] == "telemetry.v1"
    assert summary.json()["ttfc_ms_p50"] == 500
    assert summary.json()["ttfc_ms_p95"] == 1000
    assert summary.json()["caption_lag_ms_p95"] == 1000


def test_telemetry_retention_and_event_limit(client, monkeypatch):
    token = make_token(client)
    timestamp_ms = int(time.time() * 1000)
    monkeypatch.setattr(main, "MAX_TELEMETRY_EVENTS_PER_SESSION", 1)
    monkeypatch.setattr(main, "TELEMETRY_RETENTION_SECONDS", 1)

    first = client.post(
        "/api/telemetry/events",
        json={
            "token": token,
            "call_id": "call-limit",
            "events": [
                {"type": "call_started", "timestamp_ms": timestamp_ms, "payload": {}},
                {"type": "call_ended", "timestamp_ms": timestamp_ms + 1, "payload": {}},
            ],
        },
    )
    assert first.status_code == 200
    assert first.json()["accepted_events"] == 1

    main.TELEMETRY_EVENTS[next(iter(main.TELEMETRY_EVENTS))][0]["timestamp_ms"] = timestamp_ms - 5000
    summary = client.post("/api/telemetry/summary", json={"token": token})
    assert summary.status_code == 200
    assert summary.json()["total_events"] == 0


def test_webrtc_metrics_prometheus_smoke(client):
    token = make_token(client)
    timestamp_ms = int(time.time() * 1000)
    ingest = client.post(
        "/api/telemetry/events",
        json={
            "token": token,
            "call_id": "call-webrtc",
            "events": [
                {
                    "type": "webrtc_metrics",
                    "schema_version": "telemetry.v1",
                    "timestamp_ms": timestamp_ms,
                    "payload": {
                        "bitrate_kbps": 1250,
                        "packet_loss_pct": 3,
                        "jitter_ms": 18,
                        "rtt_ms": 140,
                        "quality": "medium",
                        "peer_display_name": "Sensitive",
                    },
                },
                {"type": "media_timeout", "timestamp_ms": timestamp_ms + 1, "payload": {}},
                {"type": "ws_error", "timestamp_ms": timestamp_ms + 2, "payload": {}},
            ],
        },
    )
    summary = client.post("/api/telemetry/summary", json={"token": token})
    metrics = client.get("/metrics")

    assert ingest.status_code == 200
    assert summary.json()["webrtc_metrics_events"] == 1
    assert summary.json()["latest_webrtc_quality"] == "medium"
    assert summary.json()["webrtc_rtt_ms_p95"] == 140
    assert summary.json()["error_events"] == 1
    assert summary.json()["timeout_events"] == 1
    assert "asrmt_webrtc_rtt_ms_p95 140" in metrics.text
    assert "asrmt_telemetry_errors_total 1" in metrics.text
    stored_payload = next(iter(main.TELEMETRY_EVENTS.values()))[0]["payload"]
    assert "peer_display_name" not in stored_payload
