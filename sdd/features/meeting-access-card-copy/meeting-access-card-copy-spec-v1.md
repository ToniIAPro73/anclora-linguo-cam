# Meeting Access Card Copy Spec v1

## Goal

The secure access card must use meeting-oriented wording instead of workspace-oriented wording.

## Scope

- Login/access card copy in `App.tsx`.
- E2E selectors that click the access CTA.

## Acceptance Criteria

- Spanish CTA reads `Unirse a la reunión`.
- English CTA reads `Join meeting`.
- Card fields avoid workspace terminology in user-facing access copy.
- Existing authentication behavior remains unchanged.

## Non-goals

- No authentication flow change.
- No backend API change.
- No visual redesign.
