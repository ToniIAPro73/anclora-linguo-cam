# Roadmap Implementation Baseline

- Date: 2026-06-12
- Base commit: `2293004`
- Branch: `feat/codex-linguocam-phased-improvement`

## Commands and Results
- `pwd`: `/home/toni/projects/anclora-linguo-cam`
- `git status --short`: user-owned untracked docs plus roadmap `plans/` files at start.
- `git branch --show-current`: `feat/codex-linguocam-phased-improvement`
- `node --version`: `v22.22.1`
- `npm --version`: `10.9.4`
- `python --version`: not available as `python`; `python3 --version`: `Python 3.10.12`
- `npm ci`: PASS; reported 12 vulnerabilities before dependency changes.
- `npm run lint`: PASS.
- `npm run test`: PASS, 17 Vitest tests.
- `npm run build`: PASS.
- `npm run typecheck`: missing script before Phase 0.
- `cd services/asr-mt && python3 -m venv .venv && . .venv/bin/activate && python -m pip install -r requirements.txt && python -m compileall app && pytest`: compile PASS; `pytest` missing before Phase 0.
- `npx tsc --noEmit`: FAIL before Phase 0 due missing Vite env types, `React.RefObject` namespace import, and `Object.entries` inference.

## Phase Matrix
| Phase | Status | Baseline Notes |
| --- | --- | --- |
| 0 | partial | Core app builds, but typecheck/Python tests/CDN/security gaps existed. |
| 1 | partial | Telemetry endpoints and summaries exist, but schema is not fully versioned and QA panel is absent. |
| 2 | partial | AudioWorklet exists; VAD/config separation and pure streaming tests remain incomplete. |
| 3 | partial | PeerJS/TURN configuration exists; TURN validation and hardened defaults were incomplete. |
| 4 | partial | Mock, Vosk, Faster Whisper, and Transformers adapters exist; optional OSS architecture needs stronger contracts/gates. |
| 5 | partial | Room links, pre-check, captions, chat, recording consent exist; low-bandwidth/accessibility productization remains incomplete. |

## Existing Functionality to Preserve
- 1:1 room-link call setup.
- PeerJS signaling and WebRTC media.
- ASR/MT WebSocket mock flow for local/E2E.
- Chat translation through backend.
- Recording consent gate.
- Telemetry ingestion, summary, SLO, and Prometheus metrics.
- Transcript export and caption preview controls.

## Debts and Risks
- Runtime Tailwind/Google Fonts CDN before Phase 0.
- Missing frontend typecheck gate before Phase 0.
- Missing Python pytest gate before Phase 0.
- ASR/MT WebSocket accepted unauthenticated connections before Phase 0.
- `SESSION_SIGNING_KEY` allowed placeholder/default before Phase 0.
- PeerJS discovery defaulted to enabled before Phase 0.
- Real TURN deployment is not present in this repo.
- Real ML model benchmarks require representative hardware and model artifacts.

## Documentation vs Code Differences
- Several existing SDD specs were marked implemented, while current code still had security/toolchain gaps.
- `.anclora/global` is a file pointer to `/home/toni/projects/.anclora-agents`, not a directory/symlink.
- `README.md` described CI broadly but did not include typecheck/Python checks before Phase 0.

## Predictable Affected Files
- Frontend: `package.json`, `package-lock.json`, `index.html`, `index.css`, `index.tsx`, `vite.config.ts`, `vite-env.d.ts`, `constants.ts`, hooks/components.
- Backend: `services/asr-mt/app/main.py`, `services/asr-mt/tests/`, `services/asr-mt/requirements.txt`.
- Signaling: `webrtc/peer-server/server.js`, `webrtc/peer-server/README.md`.
- CI/docs/SDD: `.github/workflows/*.yml`, `docs/`, `sdd/features/`, `plans/README.md`.

## Regression Risks
- Tailwind build-time migration can miss dynamically generated classes.
- Authenticated ASR/MT WebSocket can break E2E if frontend session timing is wrong.
- Stronger signing key validation can break non-local environments that rely on placeholders.
- Python tests mutate module-level in-memory state and must reset it between cases.

## External Dependencies and Infrastructure Tasks
- TURN/coturn production deployment requires real host, DNS, TLS, firewall, and secret rotation.
- OSS ASR/MT real benchmarks require model downloads and representative CPU/GPU hardware.
- Hermes Copy Curator gate depends on external tool availability.
