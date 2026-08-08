# Plan 004: Crear suite pytest para services/asr-mt y gate de CI Python

> **Executor instructions**: Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente paso.
> Si ocurre algo de la sección "STOP conditions", detente y reporta — no improvises.
> Al terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (ejecutar primero)**: `git diff --stat 2293004..HEAD -- services/asr-mt .github/workflows/ci.yml`
> Si `app/main.py` o `app/backends.py` cambiaron (p. ej. por el plan 003),
> lee las funciones citadas en "Current state" antes de escribir asserts — los
> tests deben reflejar el comportamiento vigente, incluido el WS autenticado si
> el plan 003 ya aterrizó.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (solo añade tests y CI; no toca lógica de producción salvo inyección mínima)
- **Depends on**: plans/003-endurecer-asr-mt-y-signaling.md (recomendado, no bloqueante)
- **Category**: tests
- **Planned at**: commit `2293004`, 2026-06-12

## Why this matters

`services/asr-mt` implementa firma de tokens, rate limiting, cuotas, salas,
telemetría con sanitización de PII y un protocolo WebSocket — y tiene **cero
tests**. La CI solo ejecuta lint/tests/build del frontend; el servicio Python
solo se valida indirectamente cuando el E2E lo arranca. AGENTS.md declara TDD y
"90% Test Coverage" como estándar del ecosistema. Sin esta suite, los planes 005
(singleton de modelos + threadpool) y cualquier cambio de backend real son
refactors a ciegas sobre el componente más sensible (auth + coste de cómputo).
Este plan crea tests de caracterización primero, como prerequisito del 005.

## Current state

- `services/asr-mt/` — estructura: `app/main.py` (~1550 líneas, FastAPI completa),
  `app/backends.py` (backends mock/vosk/faster-whisper/transformers),
  `requirements.txt` (fastapi, uvicorn, pydantic), `requirements-ml.txt`,
  `scripts/`. **No existe ningún archivo de test ni conftest.**
- Comportamientos a caracterizar (todos en `app/main.py`):
  - `_sign_payload` / `_validate_token` (líneas 108-130): HMAC-SHA256 sobre JSON
    canónico; `_validate_token` lanza `HTTPException(401)` con firma inválida y
    `401 "expired token"` si `exp < now`.
  - `_is_rate_limited` (185-203): ventana deslizante en memoria por
    `scope:identity`; con `limit <= 0` no limita.
  - `_sanitize_telemetry_payload` (144-168): descarta claves en
    `TELEMETRY_BLOCKED_FIELDS` (`text`, `raw_text`, `transcript`, `message`,
    `translated_text`), trunca strings a `MAX_TELEMETRY_PAYLOAD_VALUE_CHARS`,
    máximo `MAX_TELEMETRY_PAYLOAD_KEYS` claves, listas solo numéricas/bool (25 máx).
  - `POST /api/auth/session` (993-1019): roles válidos `{"agent", "investor"}`;
    400 si no; `display_name` truncado a 80.
  - `POST /api/chat/translate` (1034-1059): cuota
    `MAX_TRANSLATION_CHARS_PER_SESSION`; 429 al excederla; usa caché
    `TRANSLATION_CACHE` (clave `src:tgt:texto_normalizado`).
  - `POST /api/rooms/register` + `/api/rooms/resolve` (1164-1195): normaliza el
    room code a mayúsculas sin espacios; 400 si < 4 chars;
    `_resolve_room_participants` (700-734) elige `target_peer_id` = primer peer
    distinto del solicitante e `initiator_peer_id` = primero en orden asc.
  - `STORAGE_BACKEND` (92): `memory` (default) o `sqlite` — las rutas de salas y
    telemetría tienen doble implementación; testear ambas.
  - WS `/ws/asr-mt` (1387-1486): primer mensaje texto `config` → arranca backend
    (Mock por defecto: `MockASRBackend` devuelve `chunk_N`, `MockMTBackend`
    devuelve `[lang] texto`); chunks binarios → mensajes `partial` micro-batched;
    `segment_end` → mensaje `final`. Si el plan 003 aterrizó: exige
    `?token=` firmado o cierra con 4401.
  - El estado global vive en dicts de módulo (`SESSION_USAGE`,
    `RATE_LIMIT_BUCKETS`, `ROOM_REGISTRY`, `TELEMETRY_EVENTS`,
    `TRANSLATION_CACHE`) — los tests deben limpiarlos entre casos (fixture).
- `.github/workflows/ci.yml` — un único job `checks`; ya hace
  `actions/setup-python@v5` con cache pip apuntando a
  `services/asr-mt/requirements.txt`.
- Config por env vars leída a nivel de módulo: para variar límites en tests usa
  `monkeypatch.setattr(main, "CONSTANTE", valor)`, no `os.environ`.

## Commands you will need

| Purpose       | Command                                                       | Expected |
|---------------|---------------------------------------------------------------|----------|
| Instalar      | `cd services/asr-mt && python3 -m pip install -r requirements.txt -r requirements-dev.txt` | exit 0 |
| Tests         | `cd services/asr-mt && SESSION_SIGNING_KEY=test-key python3 -m pytest -q` | todos pasan |
| Lint python   | `cd services/asr-mt && python3 -m ruff check app tests`       | exit 0   |

## Scope

**In scope**:
- `services/asr-mt/requirements-dev.txt` (crear: `pytest`, `httpx`, `ruff`)
- `services/asr-mt/tests/` (crear: `conftest.py`, `test_auth.py`,
  `test_rate_limit.py`, `test_chat.py`, `test_rooms.py`, `test_telemetry.py`,
  `test_ws.py`)
- `services/asr-mt/pyproject.toml` (crear, mínimo: config de ruff y pytest)
- `.github/workflows/ci.yml` (nuevo job `python-checks`)
- `services/asr-mt/README.md` (documentar cómo correr los tests)

**Out of scope**:
- Cualquier cambio de comportamiento en `app/main.py` o `app/backends.py`.
  Excepción única permitida: si un test es imposible sin un cambio mínimo de
  inyección (p. ej. exponer una función para reset de estado), proponlo en el
  reporte final en lugar de hacerlo.
- Tests de los backends ML reales (vosk/faster-whisper/transformers) — requieren
  modelos pesados; solo se testean los Mock.
- Cobertura del 90% — esta suite es la base, no la meta final.

## Git workflow

- Rama: `chore/004-pytest-asr-mt` desde `development`.
- Commits convencionales, p. ej. `test(asr-mt): add characterization suite for auth, quotas and rooms`.
- No push/PR sin instrucción del operador.

## Steps

### Step 1: Infraestructura de test

1. Crea `services/asr-mt/requirements-dev.txt`:
   ```
   pytest==8.*
   httpx==0.28.*
   ruff==0.11.*
   ```
2. Crea `services/asr-mt/pyproject.toml` con `[tool.pytest.ini_options]`
   (`testpaths = ["tests"]`) y `[tool.ruff]` (line-length 100, target py311).
3. Crea `services/asr-mt/tests/conftest.py` con:
   - `os.environ.setdefault("SESSION_SIGNING_KEY", "test-key")` ANTES de importar `app.main`.
   - Fixture `client` → `fastapi.testclient.TestClient(app)` (TestClient requiere
     `httpx`; soporta `client.websocket_connect`).
   - Fixture autouse `reset_state` que limpia `SESSION_USAGE`,
     `RATE_LIMIT_BUCKETS`, `ROOM_REGISTRY`, `TELEMETRY_EVENTS`,
     `TRANSLATION_CACHE` antes de cada test.
   - Helper `make_token(client)` → POST `/api/auth/session` con
     `{"display_name": "Test", "role": "agent"}` y devuelve el token.

**Verify**: `cd services/asr-mt && python3 -m pytest -q --collect-only` → exit 0 (0 tests aún es válido).

### Step 2: Tests de auth y tokens (`test_auth.py`)

Casos: crear sesión con rol válido devuelve token/user_id/expires_at; rol
inválido → 400; `/api/auth/validate` con token válido → `valid: true`; token
manipulado (cambiar un carácter del payload base64) → 401; token expirado
(genera con `main._sign_payload` y `exp` en pasado) → 401.

**Verify**: `python3 -m pytest tests/test_auth.py -q` → 5+ pass.

### Step 3: Rate limiting y cuotas (`test_rate_limit.py`, `test_chat.py`)

- `_is_rate_limited`: bajo el límite → False; en el límite → True; `limit=0` →
  nunca limita; identidades distintas no comparten bucket.
- `/api/chat/translate` con backend mock: traduce (`[tgt] texto`); al exceder
  `MAX_TRANSLATION_CHARS_PER_SESSION` (usa `monkeypatch.setattr(main,
  "MAX_TRANSLATION_CHARS_PER_SESSION", 10)`) → 429; segunda traducción idéntica
  sale de caché (asserta contra `main.TRANSLATION_CACHE`).
- `/api/sessions/usage` refleja los chars consumidos.

**Verify**: `python3 -m pytest tests/test_rate_limit.py tests/test_chat.py -q` → todos pasan.

### Step 4: Salas en memoria y sqlite (`test_rooms.py`)

- Registro normaliza código (`" ab cd "` → `ABCD`); < 4 chars → 400.
- Dos peers en la misma sala: `resolve` desde peer B devuelve
  `target_peer_id == A` e `initiator_peer_id` = primero alfabético.
- Parametriza `STORAGE_BACKEND` memory/sqlite: para sqlite usa
  `monkeypatch.setattr(main, "STORAGE_BACKEND", "sqlite")` +
  `monkeypatch.setattr(main, "SQLITE_DB_PATH", tmp_path / "t.sqlite3")` +
  llama `main._init_sqlite_storage()`.

**Verify**: `python3 -m pytest tests/test_rooms.py -q` → todos pasan.

### Step 5: Sanitización de telemetría (`test_telemetry.py`)

- `_sanitize_telemetry_payload`: descarta `text`/`transcript`/`message`; trunca
  strings largos; respeta tope de claves; listas solo numéricas.
- `/api/telemetry/events` + `/api/telemetry/summary`: ingesta de
  `caption_metrics` con `ttfc_ms` y verificación de percentiles p50/p95 con
  valores conocidos (p. ej. [100, 200, ..., 1000] → p50=500, p95=1000 según
  `_percentile`, main.py:788-793 — ejecuta la función para fijar el esperado).

**Verify**: `python3 -m pytest tests/test_telemetry.py -q` → todos pasan.

### Step 6: WebSocket (`test_ws.py`)

Con `client.websocket_connect("/ws/asr-mt?token=" + token)` (ajusta según si el
plan 003 aterrizó; si no, sin token):
- Enviar config JSON → respuesta `{"type": "ok"}`.
- Enviar bytes de audio (cualquier payload no vacío) → llega `partial` con
  `text` = `chunk_1` y `translated_text` = `[<tgt>] chunk_1` (MockBackends).
- `segment_end` → no rompe; `end` → cierra limpio.
- Si el plan 003 aterrizó: conectar sin token → el servidor cierra (espera
  excepción de desconexión con código 4401).

**Verify**: `python3 -m pytest tests/test_ws.py -q` → todos pasan.

### Step 7: Job de CI

En `.github/workflows/ci.yml`, añade un job paralelo al `checks` existente:

```yaml
  python-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: services/asr-mt
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip
          cache-dependency-path: |
            services/asr-mt/requirements.txt
            services/asr-mt/requirements-dev.txt
      - run: python -m pip install -r requirements.txt -r requirements-dev.txt
      - run: python -m ruff check app tests
      - run: python -m pytest -q
        env:
          SESSION_SIGNING_KEY: ci-test-key
```

**Verify**: `python3 -m ruff check app tests && SESSION_SIGNING_KEY=test-key python3 -m pytest -q` → exit 0 local (la CI se valida en el PR).

## Test plan

Este plan ES el test plan. Mínimo esperado: ≥ 20 tests repartidos en los 6
archivos, todos deterministas (sin sleeps reales — la ventana de rate limit se
testea con el límite, no con el tiempo), todos pasando con los backends Mock.

## Done criteria

- [ ] `SESSION_SIGNING_KEY=test-key python3 -m pytest -q` → exit 0, ≥ 20 passed
- [ ] `python3 -m ruff check app tests` → exit 0
- [ ] `ci.yml` contiene el job `python-checks`
- [ ] Ningún cambio de comportamiento en `app/main.py`/`app/backends.py` (`git diff --stat` lo confirma)
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Un comportamiento observado contradice lo descrito en "Current state" (p. ej.
  `_percentile` devuelve otro valor) — escribe el test contra el comportamiento
  REAL y déjalo anotado en el reporte, salvo que parezca un bug: en ese caso
  repórtalo sin "arreglarlo".
- Necesitas modificar `app/main.py` para poder testear — para y propone el
  cambio mínimo en el reporte.
- `TestClient.websocket_connect` no funciona con la versión instalada de
  fastapi/httpx — reporta versiones exactas; no cambies `requirements.txt`.

## Maintenance notes

- El plan 005 (singleton de modelos + threadpool) depende de esta suite como
  red de caracterización — debe pasar intacta tras ese refactor.
- El estado global de módulo que la fixture `reset_state` limpia es una lista de
  acoplamiento conocida; si alguien introduce un dict global nuevo, debe
  añadirlo a la fixture.
- Futuro: medir cobertura con `pytest-cov` y subir el listón gradualmente hacia
  el estándar del ecosistema (90%).
