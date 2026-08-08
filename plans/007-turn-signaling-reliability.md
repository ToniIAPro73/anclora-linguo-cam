# Phase 3 Plan — TURN and Signaling Reliability

## Scope
- Validate and normalize `VITE_ICE_SERVERS`.
- Support multiple STUN/TURN URLs and warn when no TURN is configured.
- Harden PeerJS server defaults with discovery off, proxy/CORS/timeouts/limits and graceful shutdown.
- Document coturn deployment and manual smoke checks without claiming infrastructure is deployed.
- Keep the existing degraded-network Playwright gate explicit and documented.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `cd webrtc/peer-server && npm test`

## Result
- Status: complete.
- Closing commit: `feat(phase-3): improve turn and signaling reliability`.
- Blockers: real TURN/NAT validation requires external infrastructure and remains a manual smoke.
