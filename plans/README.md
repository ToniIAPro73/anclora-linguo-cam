# Roadmap Plans

| Plan | Phase | Status | Owner | Closing Commit | Date | Gates | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `001-typecheck-baseline-y-saneo-npm.md` | 0 | Complete | codex | `chore(phase-0): harden toolchain ci and security baseline` | 2026-06-12 | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --audit-level=high` | none |
| `002-eliminar-cdns-tailwind-y-fuentes.md` | 0 | Complete | codex | `chore(phase-0): harden toolchain ci and security baseline` | 2026-06-12 | `npm run build`, CDN grep | none |
| `003-endurecer-asr-mt-y-signaling.md` | 0 | Complete | codex | `chore(phase-0): harden toolchain ci and security baseline` | 2026-06-12 | ASR/MT pytest, PeerJS `npm test`, audit | none |
| `004-pytest-y-gate-ci-asr-mt.md` | 0 | Complete | codex | `chore(phase-0): harden toolchain ci and security baseline` | 2026-06-12 | ASR/MT compileall + pytest, CI workflow gates | none |
| `005-observability-contract-and-qa-panel.md` | 1 | Complete | codex | `feat(phase-1): add translation and webrtc observability` | 2026-06-12 | backend telemetry tests, WebRTC stats tests, Prometheus smoke, QA panel default-off E2E | none |
| `006-low-latency-audio-pipeline.md` | 2 | Complete | codex | `feat(phase-2): modularize low latency audio pipeline` | 2026-06-12 | audio pipeline unit tests, typecheck, no active ScriptProcessorNode usage | none |
| `007-turn-signaling-reliability.md` | 3 | Complete | codex | `feat(phase-3): improve turn and signaling reliability` | 2026-06-12 | ICE parser tests, PeerJS syntax test, degraded-network E2E, manual TURN smoke documented | none |
| `008-open-source-asr-mt-architecture.md` | 4 | Complete | codex | `feat(phase-4): implement open-source asr mt architecture` | 2026-06-12 | backend contract tests, release gate tests, full frontend/backend gates | optional real-model benchmarks require target hardware |
| `009-commercial-ux-productization.md` | 5 | Pending | codex | pending | TBD | pending | Phases 1-3 |
