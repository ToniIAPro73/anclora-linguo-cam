# Phase 2 Plan — Low-Latency Audio Pipeline

## Scope
- Extract pure audio pipeline helpers for VAD worklet options, language config, backpressure and segment-end subtitle stabilization.
- Keep `AudioWorkletNode` as the active capture path.
- Add unit coverage for audio config, backpressure transitions and subtitle commit decisions.
- Improve cleanup if AudioWorklet startup fails.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `rg "ScriptProcessorNode|createScriptProcessor"` excluding docs and generated folders.

## Result
- Status: complete.
- Closing commit: `feat(phase-2): modularize low latency audio pipeline`.
- Blockers: none.
