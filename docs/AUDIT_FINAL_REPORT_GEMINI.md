# LinguoCam (Gemini variant) — Final Audit Report (Reconstructed)

**Repo:** anclora-linguo-cam-gemini
**Date:** 2026-08-09
**Note:** Original report was lost/truncated in UI. This is a reconstruction from repo evidence (git state, diffs, re-run validations) plus the fragment of the original verdict the user retained. Any figure not re-derivable from current evidence is marked `NOT RECOVERABLE FROM CURRENT EVIDENCE`.

---

## Executive Verdict

**PASS WITH FIXES**

---

## Product Reconstruction

LinguoCam: real-time translingual video call app. Peer-to-peer WebRTC call (via PeerJS) between two users, each speaking own language; audio streamed to a translation backend (local ASR-MT service or Gemini Live) which returns live captions/subtitles in target language. Core flow: `CallSetup` (peer ID, join) → WebRTC connection established (`App.tsx` orchestrates peer connection, media streams, SFU fallback via `SfuRoomEmbed`) → `useStreamingTranslation` hook opens WS session to translation backend, streams mic audio, receives partial/final subtitle events → `ControlBar`/`VideoGrid`/`ChatSidebar` render call UI, mute, captions, transcript. Also supports SFU room embed mode and E2EE utilities (`utils/e2ee.ts`).

`App.tsx` is the central orchestrator (2796 lines): peer lifecycle, camera/screen streams, bitrate limiting, translation wiring, UI state — this is the god-component debt noted below.

---

## Gemini Improvements

| Change | Classification |
|---|---|
| Gemini Live integration via ephemeral server-issued token (`fetchGeminiEphemeralToken` → `POST geminiTokenUrl`, token passed as WS query param) — no client-side Gemini API key embedded | GOOD |
| `stopMediaStream` cleanup added on unmount for camera/screen/remote streams (`App.tsx` cleanup effect) — plugs a stream-leak on component teardown | GOOD |
| `aria-label`/`title` added to icon-only buttons (copy peer ID, mute remote audio, end call) | GOOD |
| `sandbox` attribute added to `SfuRoomEmbed` iframe (`allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`) | GOOD WITH CAVEATS — `allow-scripts allow-same-origin` together on a same-origin-controlled SFU is standard but worth confirming the embedded SFU origin is fully trusted, since that combo can defeat sandboxing if the framed origin is attacker-influenced |
| README logo references switched `.png` → `.webp` across all locales | GOOD — fixes a dead image reference (`.png` no longer exists in `public/brand/`), but see Assets section — underlying `.webp` is a placeholder pending restoration |
| `GEMINI_MODEL = 'gemini-3.5-live-translate-preview'` (constants.ts) | NEEDS VERIFICATION — preview/unstable model naming; confirm availability and stability with Google before relying on it in production |

No regressions identified in the diff.

---

## Problems Found

| Severity | Problem | Evidence | Impact | Status |
|---|---|---|---|---|
| Low | God component: `App.tsx` at 2796 lines owns peer lifecycle, media, translation wiring, UI state | `wc -l App.tsx` = 2796 | Maintainability/testability drag, higher regression risk on future changes | ACCEPTABLE DEBT |
| Low | TypeScript not in `strict` mode | `tsconfig.json` has no `"strict"` key | Weaker type safety net (looser null-checks etc.) | ACCEPTABLE DEBT |
| Medium | No test coverage for `hooks/useStreamingTranslation.ts` (638 lines, core translation/WS/reconnect/backpressure logic) | No `useStreamingTranslation.test.ts` exists; `utils/*.test.ts` covers audio pipeline pieces but not the hook itself | Reconnect logic, backpressure, and Gemini vs asr-mt provider branching are unverified by automated tests | REMAINING |
| Low | Brand asset `public/brand/anclora-linguo-cam.png` no longer present; only a `.webp` (Google AI Studio–generated placeholder) exists | `find` shows single file `public/brand/anclora-linguo-cam.webp`; all 6 README locales previously referenced the missing `.png` | Broken image in README docs (now fixed by webp swap), but underlying artwork is a placeholder, not final brand asset | ACCEPTABLE DEBT (known, scheduled for restoration from original LinguoCam repo per user) |
| Info | `package-lock.json` (root and `webrtc/peer-server/`) untracked | `git status` | Reproducible-install risk if never committed; not a code defect | NEEDS DECISION |
| Info | Preview/unstable Gemini model id in use | `constants.ts:21` | Preview models can change/break without notice | NEEDS DECISION |

---

## Changes Applied During Audit

All of these are **uncommitted working-tree changes**, presumed applied during the prior (lost) audit session — attributed here based on the nature of the diff (defensive fixes, not feature work) and the git evidence, since this session has no retained memory of applying them itself:

- `App.tsx` — added `stopMediaStream` calls for `cameraStreamRef`, `screenStreamRef`, `remoteStreamRef` in the unmount cleanup effect (+6 lines).
- `components/CallSetup.tsx` — added `aria-label`/`title="Copy Peer ID"` to copy button (+2 lines).
- `components/ControlBar.tsx` — added `aria-label` to mute-toggle button (dynamic mute/unmute text) and `aria-label`/`title="End call"` to end-call button (+3 lines).
- `components/SfuRoomEmbed.tsx` — added `sandbox` attribute to iframe (+1 line).
- `README.md`, `README.en.md`, `README.de.md`, `README.fr.md`, `README.it.md`, `README.ru.md` — logo image reference `.png` → `.webp` (1 line each).

**Not distinguishable with certainty:** whether these were authored entirely by this audit process versus partially pre-existing from the Gemini variant itself — `NOT RECOVERABLE FROM CURRENT EVIDENCE` (no prior commit boundary separates "Gemini's own changes" from "audit changes"; both initial commits predate all of this working-tree diff, so everything unstaged is, by elimination, audit-applied).

No other files were touched. No commits were made. No push was made.

---

## Validation Results

Re-run this session to confirm the retained verdict fragment:

| Check | Result | Detail |
|---|---|---|
| install | PASS (assumed — `node_modules` already present and consistent; not reinstalled from scratch this pass) | `package-lock.json` untracked — see Problems |
| build | **PASS** | `vite build` → 72 modules transformed, built in 1.28s, `dist/` output produced |
| typecheck | **PASS** | `tsc --noEmit` — 0 errors |
| lint | **PASS** | `eslint .` — 0 errors |
| unit tests | **PASS** | `vitest run` — 10 test files, **30/30 tests passed** |
| integration tests | NOT RECOVERABLE FROM CURRENT EVIDENCE — no dedicated integration suite identified beyond unit tests | — |
| E2E | NOT RECOVERABLE FROM CURRENT EVIDENCE — Playwright installed (chromium 1234 present) but not re-executed this pass; `e2e/call-captions.e2e.ts` and network-profile variant require a running signaling/SFU backend and are out of scope for a "don't repeat full audit" pass | — |
| security/secrets scan | **PASS** | grep for API-key-shaped literals across `.ts`/`.tsx`/`.env*` — none found; `.env` correctly gitignored; only `.env.example` present |
| dependency audit | **PASS** | `npm audit` — 0 vulnerabilities |

---

## Architecture Assessment

- **Structure:** feature-organized (`components/`, `hooks/`, `utils/`, `e2e/`), reasonable for app size except the root orchestrator.
- **Separation of responsibilities:** good at the utils/hooks layer (`audioPipeline`, `webrtcStats`, `iceServers`, `e2ee`, `transcript` are cleanly isolated and tested); weak at the top: `App.tsx` centralizes too much.
- **God components:** `App.tsx` (2796 lines) — confirmed, non-blocking debt.
- **State:** local component state + refs for streams/peer objects; no external state library — appropriate for this app's scope.
- **Hooks:** `useStreamingTranslation` is the core untested hook (see Problems); otherwise hook boundaries look sensible.
- **Services:** translation backend abstracted behind WS URL config (`asr-mt` local or Gemini Live), provider-switchable.
- **TypeScript:** compiles clean but non-strict — real but non-blocking gap.
- **Maintainability:** fundamentally sound, matured enough for internal use; the two structural debts (god component, non-strict TS) are the main long-term risks, not current defects.

---

## AI / Translation Assessment

- **Gemini integration:** via `hooks/useStreamingTranslation.ts` — WS-based Gemini Live path (`GEMINI_PROVIDER = 'gemini-live'`), model `models/gemini-3.5-live-translate-preview`, `GEMINI_INPUT_MIME_TYPE = 'audio/pcm;rate=16000'`, 24kHz output.
- **API keys:** **not exposed client-side.** Client fetches a short-lived token from `VITE_GEMINI_LIVE_TOKEN_URL` (default `${ASR_MT_HTTP_URL}/api/gemini/live-token`) and appends it as `access_token` query param to the WS URL — key stays server-side. This is the correct pattern.
- **Client vs server:** client only holds ephemeral token + WS endpoint; actual Gemini credential lives server-side (`asr-mt` service, not in this repo's client bundle).
- **Prompts:** N/A — this is a live audio-translation stream, not a text-prompt completion API; no prompt-injection surface visible in client code.
- **Error handling:** reconnect logic present (`MAX_RECONNECT_ATTEMPTS = 5`, `RECONNECT_BASE_DELAY_MS = 500`, backoff), explicit errors thrown when `geminiTokenUrl`/`geminiLiveWsUrl` unconfigured — but this path is exactly what's untested (see Problems: no hook test file).
- **Invalid responses:** handling logic exists in the hook (VAD/backpressure helpers imported from `utils/audioPipeline`, which *is* unit-tested), but the WS message-handling/reconnect state machine itself is not directly covered by tests.
- **Cost/rate limits:** preview model (`gemini-3.5-live-translate-preview`) — no explicit rate-limit handling visible in this file; cost governance appears to live in `sdd/features/translation-architecture-and-cost-governance/` (design docs present, not verified against runtime behavior this pass) — NOT RECOVERABLE FROM CURRENT EVIDENCE beyond confirming the docs exist.

---

## Camera / Multimedia Assessment

- **Permissions:** camera/mic requested through standard `getUserMedia`-style flow in `App.tsx` (peer/media setup section).
- **MediaStream lifecycle:** camera, screen-share, and remote streams tracked via refs (`cameraStreamRef`, `screenStreamRef`, `remoteStreamRef`).
- **Cleanup:** **fixed during audit** — unmount effect now calls `stopMediaStream` on all three refs and nulls them (previously leaked tracks on unmount; confirmed via diff at `App.tsx` cleanup effect, ~line 1901). Same `stopMediaStream` pattern also already existed elsewhere in the file (~line 2248), so the fix brings unmount in line with the existing end-call teardown path.
- **Mobile:** no mobile-specific defect surfaced in this pass; not independently re-verified on-device — NOT RECOVERABLE FROM CURRENT EVIDENCE.
- **Errors:** getUserMedia/permission-denial error handling exists in `App.tsx`; not exercised by an automated test this pass.

---

## UX / Accessibility

- **UX:** call setup → in-call controls → captions/transcript sidebar flow reads as complete and coherent from code structure.
- **Responsive:** Tailwind utility classes with `md:` breakpoints throughout `ControlBar`/`CallSetup` (e.g. `w-12 h-12 md:w-16 md:h-16`) — responsive intent present, not visually re-verified this pass.
- **States:** mute/unmute, connecting/connected/reconnecting/error states modeled explicitly (`WsConnectionState` type in the translation hook).
- **Accessibility:** **improved during audit** — `aria-label`/`title` added to previously unlabeled icon-only buttons (copy peer ID, mute toggle, end call). Remaining icon-only controls not covered by this diff were not exhaustively audited — NOT RECOVERABLE FROM CURRENT EVIDENCE (would require a fresh accessibility pass across all components).
- **Main debt:** accessibility labeling was ad hoc/partial before this pass; no automated a11y test (e.g. axe) in the test suite.

---

## Assets

Known pending restoration from the original LinguoCam repository:

- `public/brand/anclora-linguo-cam.webp` — current brand logo is a Google AI Studio–generated placeholder; needs replacing with the original asset. Referenced from `App.tsx:2431`, `components/AncloraMark.tsx:11`, and all 6 README files.
- The old `public/brand/anclora-linguo-cam.png` no longer exists in the repo; README references to it were dead until this audit's `.webp` swap (a working stopgap, not the final asset).
- Favicons/touch-icons (`public/favicon-*.png`, `public/apple-touch-icon.png`, `public/linguocam_*`) exist and are referenced correctly — no evidence these are affected by the same placeholder issue, but not independently confirmed as "final" brand assets either — NOT RECOVERABLE FROM CURRENT EVIDENCE.

Not reconstructing/regenerating these assets now, per instruction — restoration to happen from the original LinguoCam repo separately.

---

## Git State

- **Branch:** `main`, up to date with `origin/main`
- **HEAD:** `6a48372` — "feat(agent): initialize workspace governance rules" (parent: `9d03e6c` "Initial commit")
- **Working tree:** dirty — 10 modified files, 2 untracked files, nothing staged
- **Modified:** `App.tsx`, `README.md`, `README.de.md`, `README.en.md`, `README.fr.md`, `README.it.md`, `README.ru.md`, `components/CallSetup.tsx`, `components/ControlBar.tsx`, `components/SfuRoomEmbed.tsx`
- **Untracked:** `package-lock.json`, `webrtc/peer-server/package-lock.json`
- **No commits made. No push made. No further modifications made after this report's evidence-gathering validation runs (typecheck/lint/test/build/audit — all read-only w.r.t. source).**

---

## Remaining Technical Debt

**Should fix before adopting:**
- Add test coverage for `hooks/useStreamingTranslation.ts` (reconnect, backpressure, provider switch, error paths) — it's the core translation hook and currently has zero direct tests.
- Decide on committing the two untracked `package-lock.json` files (root + `webrtc/peer-server/`) for reproducible installs, or confirm they're intentionally excluded.

**Can defer:**
- Restore final brand assets from original LinguoCam repo (`public/brand/anclora-linguo-cam.webp` → real logo) — known, tracked, non-blocking.
- Confirm `gemini-3.5-live-translate-preview` model stability/availability with Google, or pin a non-preview alternative if one exists.

**Future improvement:**
- Break up `App.tsx` (2796 lines) into smaller components/hooks — god-component debt, non-blocking but will compound.
- Enable TypeScript `strict` mode incrementally.
- Broader accessibility pass beyond the 3 controls touched this session (systematic audit of all icon-only interactive elements).

---

## Final Recommendation

**READY AFTER MINOR WORK**

## Next Action

Before commit/push:
1. Add at least a minimal test file for `hooks/useStreamingTranslation.ts` covering reconnect/backoff and the Gemini-token-fetch error path (the one concrete test gap blocking full confidence).
2. Decide package-lock.json tracking policy (commit both, or add to `.gitignore` deliberately) and act on it.
3. Review the `SfuRoomEmbed` iframe `sandbox` value (`allow-scripts allow-same-origin` combo) against the actual trust level of the embedded SFU origin.
4. Then: `git add` the reviewed files, commit with a message describing the accessibility/cleanup/security fixes, and push — all still pending explicit user action, not done by this audit.

Brand asset restoration (`.webp` placeholder) can happen on its own timeline post-merge; it is not a blocker.
