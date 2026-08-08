import pytest
from starlette.websockets import WebSocketDisconnect

from conftest import make_token


def test_websocket_requires_token(client):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/asr-mt"):
            pass

    assert exc_info.value.code == 4401


def test_websocket_streams_mock_partials_with_signed_token(client):
    token = make_token(client)

    with client.websocket_connect(f"/ws/asr-mt?token={token}") as websocket:
        websocket.send_json(
            {
                "type": "config",
                "session_id": "session-1",
                "source_lang": "en",
                "target_lang": "es",
                "sample_rate": 16000,
                "format": "s16le",
            }
        )
        assert websocket.receive_json()["type"] == "ok"

        websocket.send_bytes(b"\x01\x00" * 320)
        partial = websocket.receive_json()
        assert partial["type"] == "partial"
        assert partial["text"] == "chunk_1"
        assert partial["translated_text"] == "[es] chunk_1"

        websocket.send_json({"type": "segment_end", "reason": "test"})
        websocket.send_json({"type": "end"})
