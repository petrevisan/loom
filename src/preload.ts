// Preload bridge: the ONLY channel between the sandboxed renderer and main.
// Exposes a typed `window.loom` (see src/shared/api.ts) over contextBridge.
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { CHANNELS } from './shared/ipc-contract';
import type {
  CaptureArmedPayload,
  CaptureCommandPayload,
  CaptureErrorPayload,
  CaptureStartedPayload,
  RecordingFailedPayload,
  RecordingSavedPayload,
} from './shared/ipc-contract';
import type { LoomApi, Unsubscribe } from './shared/api';
import type { RecordingStatus } from './shared/recording-state';

const subscribe = <Payload>(
  channel: string,
  callback: (payload: Payload) => void,
): Unsubscribe => {
  const listener = (_event: IpcRendererEvent, payload: Payload) =>
    callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

const loom: LoomApi = {
  getLibrary: () => ipcRenderer.invoke(CHANNELS.libraryGet),
  chooseLibrary: () => ipcRenderer.invoke(CHANNELS.libraryChoose),

  checkPermissions: () => ipcRenderer.invoke(CHANNELS.permissionsCheck),
  requestPermission: (kind) =>
    ipcRenderer.invoke(CHANNELS.permissionsRequest, kind),
  openScreenRecordingSettings: () =>
    ipcRenderer.invoke(CHANNELS.permissionsOpenScreenSettings),

  listSources: () => ipcRenderer.invoke(CHANNELS.sourcesList),

  startRecording: (sourceId) =>
    ipcRenderer.invoke(CHANNELS.recordingStart, { sourceId }),
  stopRecording: () => ipcRenderer.invoke(CHANNELS.recordingStop),
  pauseRecording: () => ipcRenderer.invoke(CHANNELS.recordingPause),
  resumeRecording: () => ipcRenderer.invoke(CHANNELS.recordingResume),
  revealRecording: (filePath) =>
    ipcRenderer.invoke(CHANNELS.recordingReveal, filePath),
  setBubbleSize: (size) => ipcRenderer.invoke(CHANNELS.bubbleSetSize, size),

  sendCaptureArmed: (payload: CaptureArmedPayload) =>
    ipcRenderer.send(CHANNELS.captureArmed, payload),
  sendCaptureStarted: (payload: CaptureStartedPayload) =>
    ipcRenderer.send(CHANNELS.captureStarted, payload),
  sendCaptureChunk: (chunk: ArrayBuffer) =>
    ipcRenderer.send(CHANNELS.captureChunk, chunk),
  sendCaptureStopped: () => ipcRenderer.send(CHANNELS.captureStopped),
  sendCaptureError: (payload: CaptureErrorPayload) =>
    ipcRenderer.send(CHANNELS.captureError, payload),

  onRecordingStatus: (cb) =>
    subscribe<RecordingStatus>(CHANNELS.recordingStatus, cb),
  onCaptureCommand: (cb) =>
    subscribe<CaptureCommandPayload>(CHANNELS.captureCommand, cb),
  onRecordingSaved: (cb) =>
    subscribe<RecordingSavedPayload>(CHANNELS.recordingSaved, cb),
  onRecordingFailed: (cb) =>
    subscribe<RecordingFailedPayload>(CHANNELS.recordingFailed, cb),
};

contextBridge.exposeInMainWorld('loom', loom);
