# PeerJS Server (Signaling)

## Objetivo
Servidor de signaling para WebRTC, evitando el PeerJS publico.

## Requisitos
- Node.js 18+

## Instalacion
```bash
npm install
```

## Ejecutar
```bash
npm start
```

## Variables de entorno
- `PEER_PORT` (default 9000)
- `PEER_PATH` (default `/peerjs`)
- `PEER_KEY` (default `peerjs`)
- `PEER_ALLOW_DISCOVERY` (default `false`; set to `true` only for local debugging)
- `PEER_PROXIED` (default `false`; set `true` behind a trusted reverse proxy)
- `PEER_ALIVE_TIMEOUT_MS` (default `60000`)
- `PEER_CONCURRENT_LIMIT` (default `5000`)
- `PEER_ALLOWED_ORIGINS` (comma-separated CORS origins; empty uses PeerJS default)

## Entornos
- Local: `PEER_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- Staging/production: pin exact frontend origins and set `PEER_PROXIED=true` when TLS terminates at a proxy.
- Keep `PEER_ALLOW_DISCOVERY=false` outside temporary local debugging.

## Health
PeerJS exposes an HTTP JSON response at the configured path. Example:

```bash
curl http://127.0.0.1:9000/peerjs
```

## Shutdown and logs
The wrapper handles `SIGTERM`/`SIGINT` and logs peer connect/disconnect events. In production, collect stdout/stderr with the process manager or container runtime.
