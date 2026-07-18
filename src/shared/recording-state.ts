// The recording state machine. Main is the single source of truth; every window
// is a pure view that reacts to RecordingStatus broadcasts.
//
//   idle → arming → countdown → recording ⇄ paused → stopping → saving → idle
//
// - arming:    overlays shown; recorder acquires screen + mic streams
// - countdown: 3-2-1 shown on the Control Bar
// - recording: MediaRecorder running, chunks streaming to disk
// - paused:    MediaRecorder paused
// - stopping:  stop requested; awaiting MediaRecorder onstop
// - saving:    finalizing the file (rename temp → final)

export const RECORDING_STATE = {
  IDLE: 'idle',
  ARMING: 'arming',
  COUNTDOWN: 'countdown',
  RECORDING: 'recording',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  SAVING: 'saving',
} as const;

export type RecordingState =
  (typeof RECORDING_STATE)[keyof typeof RECORDING_STATE];

/** Broadcast to all windows on every transition. */
export type RecordingStatus = {
  state: RecordingState;
  /** 3 → 2 → 1 during countdown, otherwise null. */
  countdownValue: number | null;
  /** epoch ms when MediaRecorder started, for the Control Bar's elapsed timer. */
  recordingStartedAt: number | null;
};

export const IDLE_STATUS: RecordingStatus = {
  state: RECORDING_STATE.IDLE,
  countdownValue: null,
  recordingStartedAt: null,
};

/** Commands main sends to the hidden recorder window. */
export const CAPTURE_COMMAND = {
  ARM: 'arm',
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  STOP: 'stop',
} as const;

export type CaptureCommand =
  (typeof CAPTURE_COMMAND)[keyof typeof CAPTURE_COMMAND];
