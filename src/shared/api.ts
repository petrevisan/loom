// The typed surface exposed on `window.loom` by the preload bridge.
// Implemented in src/preload.ts, consumed via src/renderer/lib/loom-api.ts.

import type {
  BubbleSize,
  LibraryConfig,
  MediaAccessStatus,
  PermissionKind,
  PermissionStatus,
  ScreenSource,
} from './domain';
import type {
  CaptureArmedPayload,
  CaptureCommandPayload,
  CaptureErrorPayload,
  CaptureStartedPayload,
  RecordingFailedPayload,
  RecordingSavedPayload,
  StartRecordingResponse,
} from './ipc-contract';
import type { RecordingStatus } from './recording-state';

export type Unsubscribe = () => void;

export type LoomApi = {
  // Library
  getLibrary: () => Promise<LibraryConfig>;
  chooseLibrary: () => Promise<LibraryConfig>;

  // Permissions
  checkPermissions: () => Promise<PermissionStatus>;
  requestPermission: (kind: PermissionKind) => Promise<MediaAccessStatus>;
  openScreenRecordingSettings: () => Promise<void>;

  // Screen sources
  listSources: () => Promise<ScreenSource[]>;

  // Recording control (main window + Control Bar)
  startRecording: (sourceId: string) => Promise<StartRecordingResponse>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  revealRecording: (filePath: string) => Promise<void>;
  setBubbleSize: (size: BubbleSize) => Promise<void>;

  // Recorder window → main (one-way)
  sendCaptureArmed: (payload: CaptureArmedPayload) => void;
  sendCaptureStarted: (payload: CaptureStartedPayload) => void;
  sendCaptureChunk: (chunk: ArrayBuffer) => void;
  sendCaptureStopped: () => void;
  sendCaptureError: (payload: CaptureErrorPayload) => void;

  // Subscriptions (main → renderer); each returns an unsubscribe fn.
  onRecordingStatus: (cb: (status: RecordingStatus) => void) => Unsubscribe;
  onCaptureCommand: (cb: (payload: CaptureCommandPayload) => void) => Unsubscribe;
  onRecordingSaved: (cb: (payload: RecordingSavedPayload) => void) => Unsubscribe;
  onRecordingFailed: (cb: (payload: RecordingFailedPayload) => void) => Unsubscribe;
};
