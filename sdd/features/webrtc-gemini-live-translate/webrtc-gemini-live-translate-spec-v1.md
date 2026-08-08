# WebRTC Gemini Live Translate Spec v1

## Problem

Users joining a meeting from a shared invite link can appear to join the same room while no
P2P media or data connection is established. The invite URL only carries a room code, so the
guest cannot directly identify the host PeerJS endpoint when the host is passively waiting
for an incoming call.

The streaming translation layer also needs a production-safe Gemini Live Translate path that
uses ephemeral tokens and sends only raw PCM audio to the model.

## Scope

- Include the host PeerJS ID in generated invite links.
- Resolve `hostPeerId` from invite URLs and let the guest initiate a direct PeerJS call to
  the host while keeping room-resolution fallback for legacy links.
- Keep PeerJS instance lifetime stable across React state changes.
- Add a Gemini Live Translate streaming mode using `gemini-3.5-live-translate-preview`.
- Add a backend endpoint that creates constrained ephemeral Gemini Live tokens.

## Acceptance Criteria

- A copied invite URL includes both `room` and `hostPeerId`.
- A guest opening that URL can call the host directly; the host answers through the existing
  `peer.on("call")` listener.
- Legacy room-only links still use the existing room register/resolve path.
- Gemini Live mode sends `audio/pcm;rate=16000` chunks and setup uses audio response,
  input transcription, output transcription, translation target and echo target language.
- The browser never receives `GEMINI_API_KEY`; it receives only an ephemeral token.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`, and backend pytest
  pass.
