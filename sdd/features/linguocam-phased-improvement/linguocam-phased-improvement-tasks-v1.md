# Tasks — linguocam-phased-improvement (v1)

## Phase 0 — Toolchain, CI, and Security Baseline

- [x] Capture baseline commands and gaps.
- [x] Add `typecheck`.
- [x] Remove Tailwind Play CDN and Google Fonts runtime dependency.
- [x] Type Vite environment variables.
- [x] Require signed ASR/MT WebSocket tokens.
- [x] Harden signing key and CORS defaults.
- [x] Disable PeerJS discovery by default.
- [x] Add Python characterization tests.
- [x] Add frontend/Python CI gates.
- [x] Run full Phase 0 gates.

## Phase 1 — Observability

- [x] Version telemetry schema.
- [x] Expand ASR/MT and WebRTC metrics.
- [x] Add QA telemetry panel disabled by default.
- [x] Update Prometheus/Grafana assets.

## Phase 2 — Low-Latency Audio Pipeline

- [x] Modularize audio config and VAD state.
- [x] Extract pure streaming/backpressure logic.
- [x] Add audio pipeline metrics and tests.

## Phase 3 — TURN and Signaling Reliability

- [x] Validate `VITE_ICE_SERVERS`.
- [x] Add TURN readiness warnings.
- [x] Expand PeerJS runbook and network E2E.

## Phase 4 — OSS ASR/MT

- [x] Formalize ASR/MT backend contracts.
- [x] Keep optional ML dependencies out of normal CI.
- [x] Add deterministic QA A/B and release gate.

## Phase 5 — Commercial UX

- [x] Simplify call onboarding and recovery states.
- [x] Add low-bandwidth mode.
- [x] Add caption accessibility settings.
- [x] Update privacy/legal/product docs.
