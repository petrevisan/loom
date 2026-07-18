// The recording orchestrator — the keystone. Main is the single source of truth:
// this module runs the state machine (idle → arming → countdown → recording ⇄
// paused → stopping → saving → idle), coordinates the four windows over IPC, and
// guarantees clean teardown. Every window is a pure view driven by the
// RecordingStatus broadcasts emitted here. See docs/adr/0001 for the design.

import { BrowserWindow, screen } from 'electron';

import { CHANNELS } from '../shared/ipc-contract';
import type {
  CaptureArmedPayload,
  CaptureErrorPayload,
  CaptureStartedPayload,
  StartRecordingResponse,
} from '../shared/ipc-contract';
import {
  CAPTURE_COMMAND,
  RECORDING_STATE,
} from '../shared/recording-state';
import type {
  CaptureCommand,
  RecordingState,
  RecordingStatus,
} from '../shared/recording-state';
import type { BubbleSize } from '../shared/domain';

import { beginRecording } from './library';
import type { RecordingWriter } from './library';
import { checkPermissions } from './permissions';
import { getChosenBounds, setChosenSourceId } from './screen-sources';
import { startPreventDisplaySleep, stopPreventDisplaySleep } from './power-save';
import { registerStopShortcut, unregisterStopShortcut } from './recording-shortcut';
import {
  createBubbleWindow,
  placeBubble,
  setBubbleSize,
} from './windows/bubble-window';
import {
  createControlBarWindow,
  placeControlBar,
} from './windows/control-bar-window';
import { createRecorderWindow } from './windows/recorder-window';

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_INTERVAL_MS = 1000;
// Give the freshly-loaded Recorder window a beat to mount React and subscribe to
// capture commands before we ARM it.
// TODO: replace with an explicit "recorder ready" handshake channel.
const RECORDER_ARM_DELAY_MS = 500;
const GRANTED = 'granted';

let state: RecordingState = RECORDING_STATE.IDLE;
let bubbleWindow: BrowserWindow | null = null;
let controlBarWindow: BrowserWindow | null = null;
let recorderWindow: BrowserWindow | null = null;
let writer: RecordingWriter | null = null;
let recordingStartedAt: number | null = null;
let countdownValue: number | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let getMainWindow: () => BrowserWindow | null = () => null;

export const setMainWindowProvider = (
  provider: () => BrowserWindow | null,
): void => {
  getMainWindow = provider;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const sendTo = (win: BrowserWindow | null, channel: string, payload?: unknown): void => {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
};

const broadcastStatus = (): void => {
  const status: RecordingStatus = { state, countdownValue, recordingStartedAt };
  sendTo(getMainWindow(), CHANNELS.recordingStatus, status);
  sendTo(controlBarWindow, CHANNELS.recordingStatus, status);
  sendTo(bubbleWindow, CHANNELS.recordingStatus, status);
};

const sendCommand = (command: CaptureCommand): void => {
  sendTo(recorderWindow, CHANNELS.captureCommand, { command });
};

const clearCountdown = (): void => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdownValue = null;
};

const destroyHelperWindows = (): void => {
  for (const win of [bubbleWindow, controlBarWindow, recorderWindow]) {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
  bubbleWindow = null;
  controlBarWindow = null;
  recorderWindow = null;
};

/** Common cleanup after a recording ends (saved, canceled, or failed). */
const endSession = (): void => {
  clearCountdown();
  destroyHelperWindows();
  stopPreventDisplaySleep();
  unregisterStopShortcut();
  const main = getMainWindow();
  if (main && !main.isDestroyed()) {
    main.show();
  }
  writer = null;
  recordingStartedAt = null;
  state = RECORDING_STATE.IDLE;
  broadcastStatus();
};

const fail = async (message: string): Promise<void> => {
  await writer?.discard().catch(() => undefined);
  endSession();
  sendTo(getMainWindow(), CHANNELS.recordingFailed, { message });
};

const waitForLoad = (win: BrowserWindow): Promise<void> =>
  new Promise((resolve) => {
    if (!win.webContents.isLoading()) {
      resolve();
      return;
    }
    win.webContents.once('did-finish-load', () => resolve());
  });

export const startRecording = async (
  sourceId: string,
): Promise<StartRecordingResponse> => {
  if (state !== RECORDING_STATE.IDLE) {
    return { ok: true };
  }

  const permissions = checkPermissions();
  const ready =
    permissions.camera === GRANTED &&
    permissions.microphone === GRANTED &&
    permissions.screen === GRANTED;
  if (!ready) {
    return { ok: false, needsPermission: permissions };
  }

  setChosenSourceId(sourceId);
  const bounds = getChosenBounds() ?? screen.getPrimaryDisplay().bounds;

  bubbleWindow = createBubbleWindow();
  controlBarWindow = createControlBarWindow();
  recorderWindow = createRecorderWindow();

  placeBubble(bubbleWindow, bounds);
  placeControlBar(controlBarWindow, bounds);

  getMainWindow()?.hide();
  startPreventDisplaySleep();
  registerStopShortcut(() => {
    void stopRecording();
  });

  state = RECORDING_STATE.ARMING;
  countdownValue = null;
  broadcastStatus();

  await waitForLoad(recorderWindow);
  await delay(RECORDER_ARM_DELAY_MS);
  sendCommand(CAPTURE_COMMAND.ARM);

  return { ok: true };
};

const startCountdown = (): void => {
  state = RECORDING_STATE.COUNTDOWN;
  countdownValue = COUNTDOWN_SECONDS;
  broadcastStatus();

  countdownTimer = setInterval(() => {
    if (countdownValue === null) {
      return;
    }
    countdownValue -= 1;
    if (countdownValue <= 0) {
      clearCountdown();
      sendCommand(CAPTURE_COMMAND.START);
      return;
    }
    broadcastStatus();
  }, COUNTDOWN_INTERVAL_MS);
};

export const onCaptureArmed = (payload: CaptureArmedPayload): void => {
  if (state !== RECORDING_STATE.ARMING) {
    return;
  }
  try {
    writer = beginRecording(payload.format);
  } catch (error) {
    void fail(error instanceof Error ? error.message : String(error));
    return;
  }
  startCountdown();
};

export const onCaptureStarted = (_payload: CaptureStartedPayload): void => {
  if (state !== RECORDING_STATE.COUNTDOWN && state !== RECORDING_STATE.ARMING) {
    return;
  }
  recordingStartedAt = Date.now();
  countdownValue = null;
  state = RECORDING_STATE.RECORDING;
  broadcastStatus();
};

export const onCaptureChunk = (chunk: ArrayBuffer): void => {
  writer?.appendChunk(chunk);
};

export const onCaptureStopped = async (): Promise<void> => {
  if (state !== RECORDING_STATE.STOPPING) {
    return;
  }
  state = RECORDING_STATE.SAVING;
  broadcastStatus();

  try {
    const savedPath = writer ? await writer.finalize() : null;
    const main = getMainWindow();
    endSession();
    if (savedPath) {
      sendTo(main, CHANNELS.recordingSaved, { path: savedPath });
    }
  } catch (error) {
    await fail(error instanceof Error ? error.message : String(error));
  }
};

export const onCaptureError = (payload: CaptureErrorPayload): void => {
  void fail(payload.message);
};

export const stopRecording = async (): Promise<void> => {
  if (state === RECORDING_STATE.RECORDING || state === RECORDING_STATE.PAUSED) {
    state = RECORDING_STATE.STOPPING;
    broadcastStatus();
    sendCommand(CAPTURE_COMMAND.STOP);
    return;
  }
  // Stop pressed before capture actually started: cancel and discard.
  if (state === RECORDING_STATE.ARMING || state === RECORDING_STATE.COUNTDOWN) {
    await writer?.discard().catch(() => undefined);
    endSession();
  }
};

export const pauseRecording = (): void => {
  if (state !== RECORDING_STATE.RECORDING) {
    return;
  }
  sendCommand(CAPTURE_COMMAND.PAUSE);
  state = RECORDING_STATE.PAUSED;
  broadcastStatus();
};

export const resumeRecording = (): void => {
  if (state !== RECORDING_STATE.PAUSED) {
    return;
  }
  sendCommand(CAPTURE_COMMAND.RESUME);
  state = RECORDING_STATE.RECORDING;
  broadcastStatus();
};

export const handleSetBubbleSize = (size: BubbleSize): void => {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    setBubbleSize(bubbleWindow, size);
  }
};

/** Best-effort synchronous cleanup for app quit. */
export const cleanupForQuit = (): void => {
  clearCountdown();
  void writer?.discard().catch(() => undefined);
  destroyHelperWindows();
  stopPreventDisplaySleep();
  unregisterStopShortcut();
};
