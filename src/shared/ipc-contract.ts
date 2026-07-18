// The single source of truth for the process boundary. Main, preload, and the
// renderer all import these channel names and payload types so the IPC surface
// is end-to-end type-safe. No magic strings anywhere else.

import type {
  BubbleSize,
  LibraryConfig,
  MediaAccessStatus,
  PermissionKind,
  PermissionStatus,
  RecordingFormat,
  ScreenSource,
} from './domain';
import type { CaptureCommand, RecordingStatus } from './recording-state';

export const CHANNELS = {
  // renderer → main (invoke / request-response)
  libraryGet: 'library:get',
  libraryChoose: 'library:choose',
  permissionsCheck: 'permissions:check',
  permissionsRequest: 'permissions:request',
  permissionsOpenScreenSettings: 'permissions:open-screen-settings',
  sourcesList: 'sources:list',
  recordingStart: 'recording:start',
  recordingStop: 'recording:stop',
  recordingPause: 'recording:pause',
  recordingResume: 'recording:resume',
  recordingReveal: 'recording:reveal',
  bubbleSetSize: 'bubble:set-size',

  // recorder window → main (one-way)
  captureArmed: 'capture:armed',
  captureStarted: 'capture:started',
  captureChunk: 'capture:chunk',
  captureStopped: 'capture:stopped',
  captureError: 'capture:error',

  // main → renderer (broadcast / one-way)
  recordingStatus: 'recording:status',
  captureCommand: 'capture:command',
  recordingSaved: 'recording:saved',
  recordingFailed: 'recording:failed',
} as const;

// ---------------------------------------------------------------------------
// renderer → main invoke payloads: [request, response]
// ---------------------------------------------------------------------------

export type StartRecordingRequest = { sourceId: string };
export type StartRecordingResponse =
  | { ok: true }
  | { ok: false; needsPermission: PermissionStatus };

export type InvokeChannels = {
  [CHANNELS.libraryGet]: [void, LibraryConfig];
  [CHANNELS.libraryChoose]: [void, LibraryConfig];
  [CHANNELS.permissionsCheck]: [void, PermissionStatus];
  [CHANNELS.permissionsRequest]: [PermissionKind, MediaAccessStatus];
  [CHANNELS.permissionsOpenScreenSettings]: [void, void];
  [CHANNELS.sourcesList]: [void, ScreenSource[]];
  [CHANNELS.recordingStart]: [StartRecordingRequest, StartRecordingResponse];
  [CHANNELS.recordingStop]: [void, void];
  [CHANNELS.recordingPause]: [void, void];
  [CHANNELS.recordingResume]: [void, void];
  [CHANNELS.recordingReveal]: [string, void];
  [CHANNELS.bubbleSetSize]: [BubbleSize, void];
};

// ---------------------------------------------------------------------------
// recorder window → main one-way payloads
// ---------------------------------------------------------------------------

export type CaptureArmedPayload = { format: RecordingFormat };
export type CaptureStartedPayload = { width: number; height: number };
export type CaptureErrorPayload = { message: string };

export type RecorderToMainChannels = {
  [CHANNELS.captureArmed]: CaptureArmedPayload;
  [CHANNELS.captureStarted]: CaptureStartedPayload;
  /** Raw recording bytes for one timeslice. */
  [CHANNELS.captureChunk]: ArrayBuffer;
  [CHANNELS.captureStopped]: void;
  [CHANNELS.captureError]: CaptureErrorPayload;
};

// ---------------------------------------------------------------------------
// main → renderer one-way payloads
// ---------------------------------------------------------------------------

export type CaptureCommandPayload = {
  command: CaptureCommand;
  /** Present on ARM: the display to capture. */
  source?: ScreenSource;
};
export type RecordingSavedPayload = { path: string };
export type RecordingFailedPayload = { message: string };

export type MainToRendererChannels = {
  [CHANNELS.recordingStatus]: RecordingStatus;
  [CHANNELS.captureCommand]: CaptureCommandPayload;
  [CHANNELS.recordingSaved]: RecordingSavedPayload;
  [CHANNELS.recordingFailed]: RecordingFailedPayload;
};
