# Plan 003: Endurecer el servicio ASR/MT y el signaling (clave de firma, CORS, WS autenticado, discovery)

> **Executor instructions**: Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente paso.
> Si ocurre algo de la sección "STOP conditions", detente y reporta — no improvises.
> Al terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (ejecutar primero)**: `git diff --stat 2293004..HEAD -- services/asr-mt/app/main.py webrtc/peer-server/server.js hooks/useStreamingTranslation.ts App.tsx playwright.config.ts .env.example`
> Si algún archivo in-scope cambió, compara los extractos de "Current state" con
> el código vivo; si no coinciden, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (toca el flujo de subtítulos en vivo; el E2E lo cubre)
- **Depends on**: plans/001-typecheck-baseline-y-saneo-npm.md
- **Category**: security
- **Planned at**: commit `2293004`, 2026-06-12

## Why this matters

Cuatro debilidades del backend, todas de mantenimiento defensivo:

1. **Clave de firma con default débil**: `SESSION_SIGNING_KEY` cae a
   `"change-me-in-production"` si no se define (`main.py:44`). Si el despliegue
   olvida la variable, cualquiera puede forjar tokens de sesión válidos.
2. **CORS abierto con credenciales**: `allow_origins` por defecto es `"*"` con
   `allow_credentials=True` (`main.py:36-42`) — combinación insegura.
3. **WebSocket sin autenticación**: `/ws/asr-mt` (`main.py:1387-1390`) acepta
   cualquier conexión y arranca backends de ASR/MT. Todos los endpoints HTTP
   exigen token firmado; el WS — el endpoint que consume CPU de inferencia — no.
   Cuando se activen los backends reales (faster-whisper/Marian), esto es cómputo
   gratis para cualquiera que conozca la URL.
4. **Discovery de peers activo por defecto**: el servidor PeerJS arranca con
   `allow_discovery=true` (`webrtc/peer-server/server.js:6`), lo que expone la
   lista de peer IDs conectados a cualquiera.

## Current state

- `services/asr-mt/app/main.py:44` —
  `SESSION_SIGNING_KEY = os.getenv("SESSION_SIGNING_KEY", "change-me-in-production")`
- `services/asr-mt/app/main.py:36-42`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
      allow_credentials=True,
      ...
  )
  ```
- `services/asr-mt/app/main.py:1387-1390`:
  ```python
  @app.websocket("/ws/asr-mt")
  async def ws_asr_mt(websocket: WebSocket) -> None:
      await websocket.accept()
      asr_backend = build_asr_backend()
  ```
  No hay validación de token. Existe `_validate_token()` (`main.py:114-130`) que
  lanza `HTTPException(401)` — en un WS hay que cerrarlo con código, no lanzar HTTP.
- `webrtc/peer-server/server.js:6` —
  `const allowDiscovery = (process.env.PEER_ALLOW_DISCOVERY || "true") === "true";`
- Frontend: `hooks/useStreamingTranslation.ts` abre el WS con `new WebSocket(wsUrl)`
  en DOS sitios (líneas ~116 y ~188; lógica duplicada — el plan 007 la unifica,
  este plan solo añade el token a la URL en ambos). El `wsUrl` llega como opción
  desde `App.tsx`, que ya posee el token de sesión (lo crea vía
  `/api/auth/session` y lo guarda en estado; busca `apiPost` en `App.tsx:1087`
  y el uso de `ASR_MT_WS_URL` para localizar el punto de montaje del hook).
- `playwright.config.ts` arranca el servicio con `SESSION_SIGNING_KEY=e2e-demo-key`
  y `ALLOWED_ORIGINS=http://127.0.0.1:4173` — el E2E ya pasa por el flujo real de
  sesión, así que servirá para validar el WS autenticado.
- `.env.example` documenta `SESSION_SIGNING_KEY=replace-with-strong-random-key` y
  `ALLOWED_ORIGINS=http://localhost:3000`.

## Commands you will need

| Purpose         | Command                                                        | Expected |
|-----------------|----------------------------------------------------------------|----------|
| Typecheck front | `npm run typecheck`                                            | exit 0   |
| Lint front      | `npm run lint`                                                 | exit 0   |
| Arrancar svc    | `cd services/asr-mt && SESSION_SIGNING_KEY=dev-key ALLOWED_ORIGINS=http://localhost:3000 python3 -m uvicorn app.main:app --port 8001` | sirve /health |
| E2E             | `npm run test:e2e`                                             | todos pasan |
| Sintaxis python | `python3 -m py_compile services/asr-mt/app/main.py`            | exit 0   |

## Scope

**In scope**:
- `services/asr-mt/app/main.py`
- `webrtc/peer-server/server.js`
- `hooks/useStreamingTranslation.ts` (solo añadir token a la URL del WS)
- `App.tsx` (solo pasar el token como opción al hook)
- `.env.example` (documentación de los nuevos requisitos)
- `webrtc/peer-server/README.md` y `services/asr-mt/README.md` (nota de config)

**Out of scope**:
- Refactorizar la duplicación del hook (plan 007).
- Rate limiting por IP detrás de proxy (queda anotado en Maintenance notes).
- Rotación/gestión de secretos en Render/Vercel — operación, no código.
- El endpoint `/metrics` (sin auth es aceptable para scrape interno; anotado).

## Git workflow

- Rama: `fix/003-harden-asr-mt` desde `development`.
- Commits convencionales, p. ej. `fix(security): require signed token on ASR/MT websocket`.
- No push/PR sin instrucción del operador.

## Steps

### Step 1: Fail-fast de la clave de firma

En `main.py`, sustituye la línea 44 por un arranque que falle si la clave es
insegura, con escape explícito para desarrollo:

```python
SESSION_SIGNING_KEY = os.getenv("SESSION_SIGNING_KEY", "")
_ALLOW_INSECURE = os.getenv("ALLOW_INSECURE_DEV", "false").lower() == "true"
if (not SESSION_SIGNING_KEY or SESSION_SIGNING_KEY == "change-me-in-production") and not _ALLOW_INSECURE:
    raise RuntimeError(
        "SESSION_SIGNING_KEY must be set to a strong random value "
        "(or set ALLOW_INSECURE_DEV=true for local development)."
    )
if not SESSION_SIGNING_KEY:
    SESSION_SIGNING_KEY = "insecure-dev-key"
```

**Verify**: `cd services/asr-mt && python3 -c "import app.main"` → falla con el
RuntimeError; `SESSION_SIGNING_KEY=x python3 -c "import app.main"` → exit 0.

### Step 2: CORS sin wildcard con credenciales

En `main.py:36-42`, cambia el default y protege la combinación insegura:

```python
_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Verify**: `SESSION_SIGNING_KEY=x python3 -c "import app.main"` → exit 0.

### Step 3: Exigir token en /ws/asr-mt

En `ws_asr_mt` (`main.py:1387`), antes de `await websocket.accept()` no hay aún
query params parseados — FastAPI los expone en `websocket.query_params`. Implementa:

```python
@app.websocket("/ws/asr-mt")
async def ws_asr_mt(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token", "")
    try:
        _validate_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    ...
```

Nota: los tokens de bot (`kind: "bot-integration"`, ver `main.py:1216-1225`)
también se validan con `_validate_token` — siguen funcionando sin cambios.

**Verify**: con el servicio corriendo, `python3 - <<'EOF'` usando `websockets` o
`curl --include --no-buffer -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: x" -H "Sec-WebSocket-Version: 13" "http://127.0.0.1:8001/ws/asr-mt"`
→ el handshake se completa pero el server cierra inmediato (o usa el E2E del
paso 5 como verificación integrada si no tienes cliente WS a mano).

### Step 4: Enviar el token desde el frontend

1. En `hooks/useStreamingTranslation.ts`, añade `authToken?: string` a
   `StreamingTranslationOptions` (línea ~3-16) y guárdalo en un ref
   (`authTokenRef`) actualizado por efecto, como ya se hace con
   `sourceLangRef`/`targetLangRef` (líneas 60-61, 387-391).
2. En los DOS puntos donde se hace `new WebSocket(wsUrl)` (dentro de
   `scheduleReconnect`, línea ~116, y `createWebSocket`, línea ~188), construye
   la URL con token:
   ```ts
   const url = authTokenRef.current
     ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(authTokenRef.current)}`
     : wsUrl;
   const ws = new WebSocket(url);
   ```
3. En `App.tsx`, localiza la llamada a `useStreamingTranslation({...})` y pasa
   `authToken` con el token de sesión que la app ya mantiene (la variable de
   estado que alimenta `apiPost` con `token` — búscala con
   `grep -n "useStreamingTranslation(" App.tsx` y
   `grep -n "token" App.tsx | head -40`).

**Verify**: `npm run typecheck && npm run lint` → exit 0.

### Step 5: PeerJS discovery cerrado por defecto

En `webrtc/peer-server/server.js:6`, cambia el default a `"false"`:

```js
const allowDiscovery = (process.env.PEER_ALLOW_DISCOVERY || "false") === "true";
```

Documenta en `webrtc/peer-server/README.md` que el discovery está desactivado y
cómo reactivarlo para depuración.

**Verify**: `node --check webrtc/peer-server/server.js` → exit 0.

### Step 6: Documentar y validar extremo a extremo

1. En `.env.example`, añade comentario sobre `ALLOW_INSECURE_DEV` y el
   requisito de `SESSION_SIGNING_KEY` fuerte.
2. `npm run test:e2e` → la suite arranca peer-server, servicio (con
   `SESSION_SIGNING_KEY=e2e-demo-key`) y frontend, y ejerce el flujo completo de
   llamada con subtítulos. Si el WS autenticado está bien cableado, los tests de
   `call-captions.e2e.ts` pasan.

**Verify**: `npm run test:e2e` → exit 0.

## Test plan

- La verificación de regresión es la suite E2E (`e2e/call-captions.e2e.ts`):
  ejercita sesión → sala → llamada → subtítulos por el WS autenticado.
- Tests unitarios del backend para token inválido/expirado en WS quedan para el
  plan 004 (que crea la infraestructura pytest); este plan no los escribe.

## Done criteria

- [ ] El servicio NO arranca sin `SESSION_SIGNING_KEY` (salvo `ALLOW_INSECURE_DEV=true`)
- [ ] `grep -n "change-me-in-production" services/asr-mt/app/main.py` → sin coincidencia como default activo
- [ ] Conexión WS sin token (o con token corrupto) se cierra con código 4401
- [ ] `grep -n 'PEER_ALLOW_DISCOVERY || "false"' webrtc/peer-server/server.js` → 1 coincidencia
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:e2e` → exit 0
- [ ] Sin archivos modificados fuera del scope (`git status`)
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- El E2E falla porque el frontend abre el WS ANTES de tener token de sesión
  (orden de montaje distinto al asumido) — reporta la secuencia real observada;
  no degrades la validación del servidor a opcional.
- `_validate_token` se usa en algún sitio que dependa del comportamiento default
  de la clave antigua — lista los call sites y para.
- Encuentras un despliegue documentado (Render) que dependa de discovery=true —
  repórtalo antes de cambiar el default.

## Maintenance notes

- **Pendiente conocido (no cubierto aquí)**: el rate limiting HTTP usa
  `request.client.host` (`main.py:171-175`); detrás del proxy de Render todos
  los clientes pueden compartir IP. Hay que arrancar uvicorn con
  `--proxy-headers --forwarded-allow-ips` y derivar la identidad de
  `X-Forwarded-For` — revisar en el despliegue.
- `/metrics` queda sin auth; si el servicio es público, restringirlo por red o
  token de scrape.
- La rotación de la `SESSION_SIGNING_KEY` invalida todas las sesiones activas —
  hacerla en ventana de bajo uso.
- Revisor: comprobar que el código de cierre WS (4401) se distinga del cierre por
  rate limit (1013, `main.py:1439`) para diagnósticos.
