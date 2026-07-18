# loom

A macOS-first desktop app for recording your screen together with a live, draggable webcam **Camera Bubble** and mic narration — producing one shareable video, auto-saved to a folder you choose.

Built with Electron 40, React 19, React Router 7, Tailwind 4, and electron-forge (Vite).

## How it works

loom records the **whole screen**; the webcam appears in the video because it physically floats on top of the screen as a separate always-on-top window (the Camera Bubble). The recording is therefore just *screen capture + mic* — the camera is never composited by loom. See [`docs/adr/0001-overlay-window-capture.md`](docs/adr/0001-overlay-window-capture.md) and [`CONTEXT.md`](CONTEXT.md).

Four windows share one renderer bundle at different hash routes:

| Window | Route | Role |
|---|---|---|
| Main | `#/` | Library setup, display picker, Record, saved-recording preview, Settings |
| Camera Bubble | `#/bubble` | Floating webcam — **is** recorded |
| Control Bar | `#/control-bar` | Countdown + stop/pause/timer — content-protected, **not** recorded |
| Recorder | `#/capture` | Hidden; owns the `MediaRecorder` (screen + mic) |

The **main process is the single source of truth**, driving a recording state machine (`idle → arming → countdown → recording ⇄ paused → stopping → saving → idle`) and broadcasting status to every window. The shared contract lives in [`src/shared/`](src/shared).

## Develop

```bash
pnpm install
pnpm start        # launch the app (electron-forge + Vite)
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
```

### ⚠️ macOS permissions in development

Screen Recording, Camera, and Microphone permissions in dev attach to the **terminal / IDE that launched Electron**, not to loom itself — because the dev binary isn't the signed loom app. Consequences:

- The first recording triggers the OS Screen Recording prompt against your terminal. Grant it, then **fully restart** the terminal *and* `pnpm start` — macOS only reads the grant at process launch.
- If capture is **black/empty** in dev, this is almost always the cause — not a code bug.
- These permissions can reset when Electron is upgraded.

A packaged, signed build asks for permissions as "loom" itself and behaves normally.

## Recordings & the Library

On first launch loom asks you to choose a **Library** — a local folder (à la Obsidian) where every recording is saved as `loom-<timestamp>.<ext>`. Change it anytime in Settings. Format is **MP4** when the platform's `MediaRecorder` supports it, otherwise **WebM**. Saved files preview in-app via the internal `loom-media://` protocol (Chromium blocks `file://` in the renderer).

## Packaging & signing

`pnpm make` / `pnpm package` work unsigned for local use. Signing + notarization are opt-in via env vars (see [`forge.config.ts`](forge.config.ts) and [`build/entitlements.mac.plist`](build/entitlements.mac.plist)):

```bash
LOOM_SIGN=1 APPLE_ID=… APPLE_PASSWORD=… APPLE_TEAM_ID=… pnpm make
```

## Manual verification checklist

- First run → Setup prompts for a Library; the choice persists across restarts.
- With Screen Recording revoked, Record shows the guided permission panel + "Open System Settings" + restart note.
- Pick a display → Record → 3-2-1 countdown → the Bubble is visible and draggable, the Control Bar is visible.
- Stop via the Control Bar **and** via the global shortcut (`Cmd+Shift+.`).
- The saved file plays; the Camera Bubble appears in it; the Control Bar does **not**; mic audio is present.
- Multi-monitor: choosing the external display records that display with the Bubble on it.
- Quitting mid-recording finalizes/discards cleanly (no stuck windows, shortcut unregistered).
