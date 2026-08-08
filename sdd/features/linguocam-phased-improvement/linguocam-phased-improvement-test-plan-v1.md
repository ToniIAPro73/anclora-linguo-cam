# Test Plan — linguocam-phased-improvement (v1)

## Phase 0 Gates
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `cd services/asr-mt && python -m compileall app && python -m pytest -q`
- `cd webrtc/peer-server && npm ci && npm test` when a test script exists; otherwise `node --check server.js`.

## Phase 1 Gates
- Backend telemetry tests.
- WebRTC stats calculation tests.
- Prometheus metric smoke test.
- QA panel disabled-by-default verification.

## Phase 2 Gates
- Audio config, VAD, PCM conversion, backpressure, cleanup, reconnect, and subtitle stabilization tests.
- No active `ScriptProcessorNode` usage.

## Phase 3 Gates
- ICE parser tests.
- PeerJS server tests.
- Degraded-network Playwright tests.
- Manual TURN smoke checklist for real infrastructure.

## Phase 4 Gates
- Backend adapter contract tests.
- Mock backend CI tests.
- Optional `pytest -m ml` for real model resources.
- Release gate returns `INSUFFICIENT_DATA`, `FAIL`, or `PASS`; never `PASS` without enough samples.

## Phase 5 Gates
- Unit tests for persisted caption preferences and low-bandwidth logic.
- Accessibility smoke tests.
- Playwright screenshots for main call states if UI changes materially.
- Hermes Copy Curator gate if available; otherwise documented pending review.
