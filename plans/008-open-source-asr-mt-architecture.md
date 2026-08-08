# Phase 4 Plan — Open-Source ASR/MT Architecture

## Scope

- Formalize ASR and MT backend capabilities without loading optional ML models.
- Keep `requirements.txt` lightweight and `requirements-ml.txt` optional.
- Support `ASR_BACKEND=mock|vosk|faster-whisper|auto` and `MT_BACKEND=mock|marian|nllb|auto`.
- Add backend capability and deterministic provider-selection endpoints for QA.
- Add release gate evaluation that can return `PASS`, `FAIL`, or `INSUFFICIENT_DATA`.
- Document capacity-model inputs without inventing benchmark numbers.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `cd services/asr-mt && APP_ENV=test SESSION_SIGNING_KEY=test-session-signing-key .venv/bin/python -m compileall app`
- `cd services/asr-mt && APP_ENV=test SESSION_SIGNING_KEY=test-session-signing-key .venv/bin/python -m pytest -q`
- `cd webrtc/peer-server && npm test && npm audit --audit-level=high`
- `npm audit --audit-level=high`

## Result

- Status: complete.
- Closing commit: `feat(phase-4): implement open-source asr mt architecture`.
- Blockers: optional real-model benchmarks require installed model artifacts and representative target hardware.
