from app import main
from conftest import make_token


def test_room_register_normalizes_code(client):
    token = make_token(client)

    response = client.post(
        "/api/rooms/register",
        json={"token": token, "room_code": " ab cd ", "peer_id": "peer-b"},
    )

    assert response.status_code == 200
    assert response.json()["room_code"] == "ABCD"


def test_room_register_rejects_short_code(client):
    token = make_token(client)

    response = client.post(
        "/api/rooms/register",
        json={"token": token, "room_code": "ab", "peer_id": "peer-a"},
    )

    assert response.status_code == 400


def test_room_resolve_returns_target_and_initiator(client):
    token = make_token(client)
    for peer_id in ["peer-a", "peer-b"]:
        response = client.post(
            "/api/rooms/register",
            json={"token": token, "room_code": "deal", "peer_id": peer_id},
        )
        assert response.status_code == 200

    response = client.post(
        "/api/rooms/resolve",
        json={"token": token, "room_code": "deal", "requester_peer_id": "peer-b"},
    )

    assert response.status_code == 200
    assert response.json()["target_peer_id"] == "peer-a"
    assert response.json()["initiator_peer_id"] == "peer-a"


def test_room_resolve_supports_sqlite(client, monkeypatch, tmp_path):
    monkeypatch.setattr(main, "STORAGE_BACKEND", "sqlite")
    monkeypatch.setattr(main, "SQLITE_DB_PATH", tmp_path / "rooms.sqlite3")
    main._init_sqlite_storage()
    token = make_token(client)
    for peer_id in ["peer-a", "peer-b"]:
        response = client.post(
            "/api/rooms/register",
            json={"token": token, "room_code": "deal", "peer_id": peer_id},
        )
        assert response.status_code == 200

    response = client.post(
        "/api/rooms/resolve",
        json={"token": token, "room_code": "deal", "requester_peer_id": "peer-a"},
    )

    assert response.status_code == 200
    assert response.json()["target_peer_id"] == "peer-b"
    assert response.json()["participants"] == 2
