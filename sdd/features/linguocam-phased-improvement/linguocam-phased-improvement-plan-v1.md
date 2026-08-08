# Plan — linguocam-phased-improvement (v1)

## Current State
The repository already contains domain specs marked implemented for security, reliability, translation governance, UX, technical quality, and observability. The codebase still has measurable gaps: missing `typecheck`, CDN runtime dependencies, incomplete Python test coverage, unauthenticated ASR/MT WebSocket access, and CI gaps.

## Scope
Execute the roadmap in one feature branch with phase-level commits and traceable gates.

## Out of Scope
Do not deploy TURN, create paid provider consumption, or merge to permanent branches.

## Steps
1. Establish Phase 0 baseline and security/toolchain hardening.
2. Add versioned telemetry contracts and QA diagnostics.
3. Refactor and test the audio streaming pipeline.
4. Harden ICE/TURN/signaling and degraded network recovery.
5. Add optional OSS ASR/MT backends and release gates without model downloads in CI.
6. Productize the commercial UX with privacy/accessibility review.

## Tests First
Tests are added before or alongside each implementation slice where feasible. Heavy ML paths use mocks and optional `ml` markers.

## Verify
Run the relevant gates per phase and record pass/fail/blockers in `plans/README.md` and the final roadmap report.

## Done Criteria
The final branch includes six phase commits, current docs, passing lightweight gates or documented blockers, and a PR against `development`.

## Rollback
Revert the relevant phase commit. External infrastructure is not changed by this branch.

## STOP Conditions
- Secret detected in Git.
- Required canonical contract contradicts this plan.
- A phase requires paid services or infrastructure activation without approval.
- Quality gates fail and no bounded fix is available in the phase.
