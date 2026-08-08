# SPEC — linguocam-phased-improvement (v1)

## 0. Meta
- Feature: linguocam-phased-improvement
- Version: v1
- Status: active
- Owner: codex
- Base branch: development
- Work branch: feat/codex-linguocam-phased-improvement

## 1. Objective
Deliver the six-phase roadmap for Anclora Linguo CAM while preserving call reliability, translation comprehension, privacy-by-default, low latency, open-source cost governance, and operational reversibility.

## 2. Scope
This umbrella spec coordinates exactly six implementation phases:
1. Phase 0: toolchain, CI, and security baseline.
2. Phase 1: translation and WebRTC observability.
3. Phase 2: low-latency audio pipeline hardening.
4. Phase 3: TURN/signaling and call reliability.
5. Phase 4: optional open-source ASR/MT architecture.
6. Phase 5: commercial call UX, accessibility, and productization.

## 3. Out of Scope
- Deploying external infrastructure without human approval.
- Activating paid providers or paid inference without human approval.
- Storing transcripts, audio, video, or sensitive data by default.
- Claiming TURN, ML model capacity, or legal compliance that has not been verified.
- Editing immutable closed specs; complementary specs must be added instead.

## 4. Security and Privacy
- No provider API key may be exposed to browser code.
- WebSocket ASR/MT access must use signed session tokens.
- Telemetry must not contain audio, video, transcripts, names, emails, or full message content.
- Session and consent logs must not contain secrets.
- Production/staging must fail fast on placeholder signing keys and unsafe wildcard CORS.

## 5. SLOs
- TTFC p95 <= 1500 ms.
- Caption lag p95 <= 1800 ms.
- Dropped hypothesis rate <= 25%.
- Call reliability changes must preserve the 1:1 call flow before improving diagnostics or UI.

## 6. Dependencies
- Phase 1 depends on the Phase 0 security and CI baseline.
- Phase 2 depends on Phase 1 telemetry contracts for audio and caption metrics.
- Phase 3 depends on Phase 1 WebRTC metrics and Phase 0 signaling hardening.
- Phase 4 depends on Phase 0 backend tests and Phase 1 telemetry.
- Phase 5 depends on Phases 1-3 to expose reliable call and network states.

## 7. Feature Flags and Rollback
- Diagnostics remain disabled by default.
- Experimental E2EE, SFU, local MT, and future OSS backends remain behind environment flags.
- Any provider migration must keep a mock/light backend path for CI and rollback.
- Rollback for each phase is a single phase commit revert unless a later phase explicitly depends on it.

## 8. Acceptance
- Each phase has a closing commit.
- Quality gates are run and recorded.
- Documentation reflects the current implementation, not aspirational behavior.
- A final PR targets `development`; no merge or promotion is performed by the agent.
