import time

from app import main
from conftest import make_token


def test_create_session_and_validate_token(client):
    token = make_token(client, display_name="Ana Gomez", role="agent")

    response = client.post("/api/auth/validate", json={"token": token})

    assert response.status_code == 200
    payload = response.json()
    assert payload["valid"] is True
    assert payload["display_name"] == "Ana Gomez"
    assert payload["role"] == "agent"


def test_create_session_rejects_invalid_role(client):
    response = client.post(
        "/api/auth/session",
        json={"display_name": "Ana", "role": "admin"},
    )

    assert response.status_code == 400


def test_validate_rejects_tampered_token(client):
    token = make_token(client)
    encoded_payload, encoded_signature = token.split(".", 1)
    tampered_signature = ("a" if encoded_signature[0] != "a" else "b") + encoded_signature[1:]
    tampered = f"{encoded_payload}.{tampered_signature}"

    response = client.post("/api/auth/validate", json={"token": tampered})

    assert response.status_code == 401


def test_validate_rejects_expired_token(client):
    expired = main._sign_payload(
        {
            "user_id": "expired-user",
            "display_name": "Expired",
            "role": "agent",
            "iat": int(time.time()) - 120,
            "exp": int(time.time()) - 60,
        }
    )

    response = client.post("/api/auth/validate", json={"token": expired})

    assert response.status_code == 401
    assert response.json()["detail"] == "expired token"
