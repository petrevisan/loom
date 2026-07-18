# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

loom is a macOS-first Electron desktop app that records the screen with a live, draggable webcam **Camera Bubble** + mic, saving one shareable video to a user-chosen **Library** folder. Stack: Electron 40, React 19, React Router 7 (HashRouter), Tailwind 4, electron-forge + Vite. TypeScript is pinned to 5.9 (see gotchas). There is no test suite yet.

## Commands

```bash
pnpm install
pnpm start        # launch the app (electron-forge + Vite dev servers)
pnpm typecheck    # tsc --noEmit — run after any change; the primary correctness gate
pnpm lint         # eslint (src only)
pnpm make         # package + build installers (unsigned by default)
```

Signing/notarization is opt-in via env: `LOOM_SIGN=1 APPLE_ID=… APPLE_PASSWORD=… APPLE_TEAM_ID=… pnpm make`.

There is no GUI-free way to fully verify a change; after edits, run `pnpm typecheck` + `pnpm lint`, and for renderer changes also `./node_modules/.bin/vite build -c vite.renderer.config.mts` (catches import/bundle errors, then `rm -rf dist`). Actual recording behavior must be tested by running the app.

## Architecture (read `docs/adr/0001-overlay-window-capture.md` and `CONTEXT.md` first)

**Overlay-window capture — the core idea.** loom records the *whole screen*; the webcam appears in the video because the Camera Bubble is a real always-on-top window physically floating over the screen. The recorder therefore muxes only **screen video + mic audio** — the camera is *never* composited by loom. Don't "fix" this into canvas compositing; it's deliberate.

**Four windows, one renderer bundle, different hash routes.** A single Vite renderer entry (`src/renderer/main.tsx`, `HashRouter`) serves all windows; the main process opens each `BrowserWindow` at a different route via `src/main/windows/load-route.ts`:

| Window | Route | Notes |
|---|---|---|
| Main | `#/` | app UI; **hidden during recording** so it isn't captured |
| Camera Bubble | `#/bubble` | frameless/transparent/always-on-top; **is** recorded (never content-protected) |
| Control Bar | `#/control-bar` | `setContentProtection(true)` → visible to user, **excluded** from capture |
| Recorder | `#/capture` | hidden, `backgroundThrottling:false`; owns the `MediaRecorder` |

**Main is the single source of truth.** `src/main/recording-session.ts` runs the state machine (`idle → arming → countdown → recording ⇄ paused → stopping → saving → idle`) and broadcasts `RecordingStatus` to every window; windows are pure views. The keystone flow: Main `startRecording` → show Bubble+Control Bar on the chosen display, hide Main → send `ARM` to the recorder → recorder acquires streams, replies `captureArmed{format}` → 3-2-1 countdown → `START` → chunks stream to a temp `.part` file via `library.ts` → `STOP`/`onstop` → rename to final, reshow Main, emit `recordingSaved{path}`.

**The IPC contract in `src/shared/` is the glue.** `ipc-contract.ts` (channel names + payloads), `recording-state.ts` (state machine + capture commands), `domain.ts` (types + format/size constants), `api.ts` (the `window.loom` surface), `media-url.ts` (`loom-media://` helpers). Everything else depends on these; keep them the source of truth and import them (relative paths — no path alias).

**Display selection is picker-free.** `screen-sources.ts` stores the chosen source and answers `session.setDisplayMediaRequestHandler` with it (video-only, no OS picker, no system audio). The renderer's `getDisplayMedia({video:true})` gets the pinned display automatically.

### Adding an IPC channel (touches multiple files, in order)
1. `src/shared/ipc-contract.ts` — add the channel name + payload type.
2. `src/shared/api.ts` — add the method to `LoomApi`.
3. `src/preload.ts` — implement it (`invoke` for request/response, `send` for one-way, `subscribe` for events).
4. `src/main/ipc.ts` — register the handler, delegating to a module (`library.ts` / `permissions.ts` / `recording-session.ts` / …).
Renderer calls it via `import { loom } from '../../lib/loom-api'` (relative — there is no path alias).

## Conventions

- Strict TS, **no `any`, avoid `as`** (`as const` is fine). Named exports only. `type` over `interface`. Early returns. No magic strings/numbers — extract named constants. Unused params prefixed `_`.
- File naming: **PascalCase** for React component files (`Home.tsx`), **kebab-case** for other modules (`use-camera.ts`, `recording-session.ts`).
- React 19: async reads use React Query `useSuspenseQuery` behind the shell's Suspense + error boundary (`src/renderer/main.tsx`) — no `isLoading`, no fetching in `useEffect`. Use `useEffect` only for imperative media/IPC lifecycle, with a ref latch to survive StrictMode double-mount.

## Non-obvious gotchas (bootstrap bugs that typecheck/lint do NOT catch)

- **`package.json` `main` must match the forge bundle name.** The vite-forge main output is named after the entry basename: entry `src/main/index.ts` → `.vite/build/index.js`, so `main` is `.vite/build/index.js` (not `main.js`).
- **The preload must be CommonJS.** Electron's sandboxed preload can't be an ES module; `vite.preload.config.mts` sets `output.format: 'cjs'`. If `window.loom` is `undefined` at runtime, the preload failed to load — check this first.
- **`vite.renderer.config.mts` needs `base: './'`** or packaged builds serve assets from filesystem root and show a blank window.
- **macOS Info.plist usage strings are mandatory** (`NSCameraUsageDescription`/`NSMicrophoneUsageDescription` in `forge.config.ts`) — `systemPreferences.askForMediaAccess` *crashes* without them.
- **Screen Recording permission requires an app restart** to take effect and has no programmatic request API (unlike camera/mic). In **dev**, the permission attaches to the terminal/IDE that launched Electron, not to loom — black/empty capture in dev is almost always this, not a code bug.
- **Saved-file preview uses the `loom-media://` protocol**, not `file://` (blocked in the renderer). The scheme is registered privileged *before* app ready in `src/main/index.ts`.

## Design docs

- `CONTEXT.md` — domain glossary (Recording, Camera Bubble, Control Bar, Library, Screen Capture, Mic). Keep terminology consistent with it.
- `docs/adr/0001-overlay-window-capture.md` — why capture works the way it does, and the rejected alternatives.
