# Phase 1 Plan — Observability Contract and QA Panel

## Scope
- Version telemetry events as `telemetry.v1`.
- Keep telemetry content-free and bounded.
- Add WebRTC quality calculations and throttled `webrtc_metrics` events.
- Add a local/QA-only diagnostics panel behind `VITE_ENABLE_QA_TELEMETRY_PANEL=false`.
- Update Prometheus/Grafana assets to match real metrics.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `cd services/asr-mt && APP_ENV=test SESSION_SIGNING_KEY=test-session-signing-key .venv/bin/python -m pytest -q`
- `python3 -m json.tool infra/observability/grafana-asrmt-dashboard.json`

## Result
- Status: complete.
- Closing commit: `feat(phase-1): add translation and webrtc observability`.
- Blockers: none.
