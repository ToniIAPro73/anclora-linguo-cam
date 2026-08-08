# ASR/MT Microservice (FastAPI + WebSocket)

## Objetivo

Servicio de streaming para ASR + traduccion incremental. Recibe PCM 16kHz (mono), devuelve subtitulos parciales y finales via WebSocket.

## Requisitos

- Python 3.10+
- Pip o uv

## Instalacion

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Tests

```bash
APP_ENV=test SESSION_SIGNING_KEY=test-session-signing-key pytest -q
python -m compileall app
```

### Modelos (opcional, para ASR/MT real)

```bash
pip install -r requirements-ml.txt
```

## Ejecutar

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Gemini Live Translate

Para usar `gemini-3.5-live-translate-preview`, define la clave solo en el entorno del
backend:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
```

En local puedes ponerla en el `.env.local` de la raiz del repo; ese archivo esta ignorado
por Git. No la pongas en variables `VITE_*`, porque esas variables se exponen al navegador.

El frontend pide tokens efimeros a:

```text
POST /api/gemini/live-token
```

El backend valida la sesion de Anclora y solicita a Google un token efimero restringido a:

- `models/gemini-3.5-live-translate-preview`
- `responseModalities: ["AUDIO"]`
- `inputAudioTranscription` y `outputAudioTranscription`
- `translationConfig.targetLanguageCode`

## Configuracion (env)

- `ASR_BACKEND` = `mock` (default), `vosk`, `faster-whisper`, `streaming` (alias de `vosk`), `quality` (alias de `faster-whisper`) o `auto` (seleccion por entorno)
- `MT_BACKEND` = `mock`, `marian`, `nllb`, `transformers` o `auto`
- `TRANSLATION_PROVIDER` = `oss` (default), `gemini` o `ab`. Solo selecciona/etiqueta proveedor en backend; la ruta principal no consume Gemini.
- `QA_AB_PERCENT` = porcentaje determinista de sesiones asignadas al bucket `gemini` cuando `TRANSLATION_PROVIDER=ab` (default `0`)
- `LOG_LEVEL` = `info`
- `GEMINI_API_KEY` = clave de Google AI Studio/Gemini para crear tokens efimeros
  Live API (**solo backend; nunca `VITE_*`**)
- `GEMINI_AUTH_TOKENS_URL` = endpoint de tokens efimeros
  (default `https://generativelanguage.googleapis.com/v1beta/auth_tokens`)
- `GEMINI_LIVE_TRANSLATE_MODEL` = modelo restringido para tokens Live
  (default `models/gemini-3.5-live-translate-preview`)
- `RATE_LIMIT_GEMINI_TOKEN_PER_WINDOW` = limite de tokens efimeros por
  sesion/ventana (default `60`)
- `APP_ENV` = `local`, `development`, `test`, `ci`, `staging` o `production` (default `local`)
- `ALLOWED_ORIGINS` = lista separada por coma (default local sin wildcard)
- `SESSION_SIGNING_KEY` = clave HMAC para tokens de sesion (**obligatoria fuera de local/test; placeholder no permitido en staging/production**)
- `SESSION_TTL_SECONDS` = tiempo de vida de sesion (default `28800`)
- `AUDIT_LOG_PATH` = ruta de log append-only (default `runtime/audit-log.jsonl`)
- `MAX_TRANSLATION_CHARS_PER_SESSION` = cuota de traduccion por sesion (default `20000`)
- `MAX_TTS_CHARS_PER_SESSION` = cuota de TTS por sesion (default `12000`)
- `COST_PER_TRANSLATED_CHAR_EUR` = coste estimado por caracter traducido (default `0.0000008`)
- `COST_PER_TTS_CHAR_EUR` = coste estimado por caracter TTS (default `0.0000004`)
- `MT_MICRO_BATCH_WINDOW_MS` = ventana de micro-batch para parciales WS (default `35`)
- `MT_MICRO_BATCH_MAX_ITEMS` = max parciales por batch (default `4`)
- `MT_MICRO_BATCH_MAX_CHARS` = max caracteres acumulados por batch (default `220`)
- `RATE_LIMIT_WINDOW_SECONDS` = ventana para rate limits (default `60`)
- `RATE_LIMIT_AUTH_SESSION_PER_WINDOW` = limite de creacion de sesion por IP (default `20`)
- `RATE_LIMIT_CHAT_TRANSLATE_PER_WINDOW` = limite translate por sesion (default `120`)
- `RATE_LIMIT_CHAT_TTS_PER_WINDOW` = limite tts por sesion (default `120`)
- `RATE_LIMIT_ROOMS_PER_WINDOW` = limite register/resolve de rooms por sesion (default `60`)
- `RATE_LIMIT_TELEMETRY_PER_WINDOW` = limite de lotes telemetry por sesion (default `240`)
- `RATE_LIMIT_WS_MESSAGES_PER_WINDOW` = limite de mensajes WS por IP (default `1200`)
- `MAX_TELEMETRY_PAYLOAD_KEYS` = max claves aceptadas por payload de evento (default `24`)
- `MAX_TELEMETRY_PAYLOAD_VALUE_CHARS` = max longitud de strings en payload (default `120`)
- `ROOM_PARTICIPANT_TTL_SECONDS` = TTL de participantes en sala (default `180`)
- `MAX_TELEMETRY_EVENTS_PER_SESSION` = max eventos de telemetria por sesion (default `500`)
- `TELEMETRY_RETENTION_SECONDS` = retencion de telemetria por sesion (default `86400`)
- `SLO_TTFC_MS_P50` = umbral SLO TTFC p50 (default `700`)
- `SLO_TTFC_MS_P95` = umbral SLO TTFC p95 (default `1500`)
- `SLO_CAPTION_LAG_MS_P95` = umbral SLO caption lag p95 (default `1800`)
- `SLO_DROPPED_HYPOTHESIS_RATE_PCT` = umbral SLO dropped hypothesis rate (default `25`)
- `STORAGE_BACKEND` = `memory` (default) o `sqlite`
- `SQLITE_DB_PATH` = ruta del fichero sqlite (default `runtime/asr-mt.sqlite3`)
- `ASR_MODEL` = `small` (ej. `base`, `small`, `medium`)
- `ASR_DEVICE` = `cpu` (ej. `cuda`)
- `ASR_COMPUTE_TYPE` = `int8` (ej. `float16`)
- `ASR_AUTO_QUALITY_CPU_THRESHOLD_OPS_MS` = umbral de benchmark CPU para escoger `faster-whisper` en `ASR_BACKEND=auto` (default `8500`)
- `ASR_MIN_CHUNK_MS` = `600`
- `ASR_MAX_BUFFER_MS` = `30000`
- `VOSK_MODEL_PATH` = ruta local a modelo Vosk (opcional)
- `VOSK_MODEL_NAME` = nombre de modelo Vosk descargable (default `vosk-model-small-en-us-0.15`)
- `MT_MODEL` = `Helsinki-NLP/opus-mt-es-en` o `facebook/nllb-200-distilled-600M`
- `MT_DEVICE` = `cpu`
- `MT_MODEL_MAP` = `es-en=Helsinki-NLP/opus-mt-es-en,es-fr=Helsinki-NLP/opus-mt-es-fr`
- `MT_AUTO_PREFERRED` = backend preferido cuando `MT_BACKEND=auto` (`transformers` default)

## Protocolo WebSocket

- URL: `ws://localhost:8001/ws/asr-mt?token=<signed-session-token>`
- Mensajes JSON: `config`, `end`
- Audio: frames binarios PCM 16-bit LE, 16kHz mono

## Notas

El backend `mock` permite probar la canalizacion sin modelos. Para ASR/MT real usa:

```bash
ASR_BACKEND=faster-whisper MT_BACKEND=transformers MT_MODEL=Helsinki-NLP/opus-mt-es-en \
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Ruta low-latency (streaming ASR con Vosk):

```bash
ASR_BACKEND=streaming MT_BACKEND=transformers MT_MODEL=Helsinki-NLP/opus-mt-es-en \
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

El servicio aplica micro-batching de traducciones parciales por WebSocket (ventana corta) y cache por prefijo para reducir inferencias repetidas en MT.
Tambien aplica rate limits configurables para endpoints criticos y mensajes WS como guardrail anti-abuso.

Los contratos de backend declaran capacidades sin cargar modelos: streaming, resultados parciales, idiomas/pares soportados y si requieren `requirements-ml.txt`. Los backends reales son opcionales y no forman parte de la ruta normal de CI; se validan con tests marcados `ml` cuando existan modelos locales.

Para NLLB usa un modelo NLLB y codigos compatibles (se mapean los idiomas mas comunes).

### Seleccion automatica por par (Marian)

Por defecto, el servicio elige automaticamente modelos Marian para:
`es-en`, `en-es`, `es-fr`, `fr-es`, `es-de`, `de-es`, `es-ru`, `ru-es`.  
Puedes sobrescribir con `MT_MODEL_MAP`.

## API HTTP (seguridad/compliance)

### `POST /api/auth/session`

Genera sesion firmada para acceso a llamada.

Body:

```json
{ "display_name": "Ana Gomez", "role": "agent" }
```

### `POST /api/auth/validate`

Valida token de sesion.

### `POST /api/chat/translate`

Traduce mensajes de chat via backend MT.

### `POST /api/chat/tts`

Unifica flujo de TTS bajo backend: traduce/prepara texto y aplica cuota de TTS por sesion.

### `POST /api/sessions/usage`

Devuelve consumo de sesion para gobernanza de coste (`translated_chars`, `tts_chars`, limites).

### `POST /api/sessions/cost`

Devuelve estimacion de coste de sesion a partir de consumo MT/TTS y tarifas configuradas.

### `POST /api/sessions/cost-dashboard`

Resume coste por llamada de la sesion actual (`total_calls`, `total_estimated_cost_eur`, `recent_calls`).

### `POST /api/rooms/register`

Registra presencia de peer autenticado en sala.

### `POST /api/rooms/resolve`

Resuelve contraparte e iniciador de llamada en sala.

### `POST /api/integrations/bot/session`

Crea sesion firmada para integraciones tipo “bot participant” (Zoom/Meet/Teams) y devuelve `ingest_ws_url`.

### `GET /api/rooms/subscribe`

Canal SSE para notificar emparejamiento de sala sin polling agresivo.

### `POST /api/telemetry/events`

Ingesta eventos de operacion de llamada/reconexion/precheck.
Contrato actual: `telemetry.v1`. El payload se sanitiza: no se persisten texto transcrito, mensajes, audio, video, nombres, emails ni telefonos; se limitan claves y longitud por evento.

### `POST /api/telemetry/summary`

Resumen agregado de eventos de operacion por sesion.

### `POST /api/telemetry/slo`

Evalua cumplimiento de SLO de subtitulos contra umbrales configurables.

### `GET /metrics`

Exporta metricas en formato Prometheus (salud, rooms activas, reconexiones, TTFC/caption lag p95).
Incluye tambien WebRTC RTT/jitter/loss p95 y contadores de errores/timeouts retenidos.

### `GET /api/ops/model-recommendation`

Devuelve recomendacion de backend ASR/MT basada en benchmark CPU rapido + hint de GPU del entorno.

### `GET /api/ops/backend-capabilities`

Lista capacidades declaradas para backends ASR/MT disponibles y la configuracion activa. No instancia modelos ni descarga artefactos.

### `POST /api/ops/provider-selection`

Devuelve proveedor estable por `session_id` para QA A/B:

```json
{ "session_id": "call-or-user-session-id" }
```

Con `TRANSLATION_PROVIDER=ab`, `QA_AB_PERCENT` controla el porcentaje asignado al bucket `gemini`. Este endpoint no ejecuta llamadas a proveedores pagos.

Con `STORAGE_BACKEND=sqlite`, rooms y telemetria sobreviven reinicios del servicio.

### `POST /api/sessions/consent`

Registra consentimiento explicito de grabacion por `call_id` en audit log append-only.

## Gestion de modelos (checksum + version)

Script local para descargar y verificar artefactos de modelos:

```bash
cd services/asr-mt
python scripts/model_manager.py download \
  --name opus-es-en \
  --version 1.0.0 \
  --url https://example.com/model.bin \
  --output runtime/models/opus-es-en-1.0.0.bin \
  --sha256 <sha256>
python scripts/model_manager.py verify
python scripts/model_manager.py list
```

El manifiesto se guarda por defecto en `runtime/models-manifest.json`.

## Benchmark minimo (ASR/MT)

Runner lightweight para WER/CER (ASR) y chrF (MT):

```bash
cd services/asr-mt
python scripts/benchmark_runner.py \
  --asr-ref fixtures/asr_ref.jsonl --asr-hyp fixtures/asr_hyp.jsonl \
  --mt-ref fixtures/mt_ref.jsonl --mt-hyp fixtures/mt_hyp.jsonl
```

Guia detallada en `docs/benchmark-minimo-asr-mt.md`.

## Release gate ASR/MT

El release gate consume muestras humanas/tecnicas en JSON y devuelve `PASS`, `FAIL` o `INSUFFICIENT_DATA`. Nunca devuelve `PASS` con menos muestras que el minimo configurado.

```bash
cd services/asr-mt
PYTHONPATH=. python scripts/release_gate.py path/to/evaluation-samples.json
```

Cada muestra debe incluir puntuaciones numericas como `adequacy`, `fluency`, `caption_stability`, `comprehension_success`, `ttfc_ms_p95` y `caption_lag_ms_p95`.
