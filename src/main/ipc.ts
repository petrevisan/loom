// Wires the typed IPC contract to the main-process modules. All channel names
// come from the shared contract; each handler is a thin delegation.

import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import { CHANNELS } from '../shared/ipc-contract';
import type {
  CaptureArmedPayload,
  CaptureErrorPayload,
  CaptureStartedPayload,
  StartRecordingRequest,
} from '../shared/ipc-contract';
import type { BubbleSize, PermissionKind } from '../shared/domain';

import { chooseLibrary, getLibrary, revealRecording } from './library';
import {
  checkPermissions,
  openScreenRecordingSettings,
  requestPermission,
} from './permissions';
import { listScreenSources } from './screen-sources';
import {
  handleSetBubbleSize,
  onCaptureArmed,
  onCaptureChunk,
  onCaptureError,
  onCaptureStarted,
  onCaptureStopped,
  pauseRecording,
  resumeRecording,
  startRecording,
  stopRecording,
} from './recording-session';

export const registerIpcHandlers = (): void => {
  // Library
  ipcMain.handle(CHANNELS.libraryGet, () => getLibrary());
  ipcMain.handle(CHANNELS.libraryChoose, () => chooseLibrary());
  ipcMain.handle(CHANNELS.recordingReveal, (_event, filePath: string) =>
    revealRecording(filePath),
  );

  // Permissions
  ipcMain.handle(CHANNELS.permissionsCheck, () => checkPermissions());
  ipcMain.handle(
    CHANNELS.permissionsRequest,
    (_event, kind: PermissionKind) => requestPermission(kind),
  );
  ipcMain.handle(CHANNELS.permissionsOpenScreenSettings, () =>
    openScreenRecordingSettings(),
  );

  // Screen sources
  ipcMain.handle(CHANNELS.sourcesList, () => listScreenSources());

  // Recording control
  ipcMain.handle(
    CHANNELS.recordingStart,
    (_event: IpcMainInvokeEvent, request: StartRecordingRequest) =>
      startRecording(request.sourceId),
  );
  ipcMain.handle(CHANNELS.recordingStop, () => stopRecording());
  ipcMain.handle(CHANNELS.recordingPause, () => pauseRecording());
  ipcMain.handle(CHANNELS.recordingResume, () => resumeRecording());
  ipcMain.handle(CHANNELS.bubbleSetSize, (_event, size: BubbleSize) =>
    handleSetBubbleSize(size),
  );

  // Recorder window → main (one-way)
  ipcMain.on(CHANNELS.captureArmed, (_event, payload: CaptureArmedPayload) =>
    onCaptureArmed(payload),
  );
  ipcMain.on(CHANNELS.captureStarted, (_event, payload: CaptureStartedPayload) =>
    onCaptureStarted(payload),
  );
  ipcMain.on(CHANNELS.captureChunk, (_event, chunk: ArrayBuffer) =>
    onCaptureChunk(chunk),
  );
  ipcMain.on(CHANNELS.captureStopped, () => {
    void onCaptureStopped();
  });
  ipcMain.on(CHANNELS.captureError, (_event, payload: CaptureErrorPayload) =>
    onCaptureError(payload),
  );
};
