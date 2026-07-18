import { useEffect, useState } from 'react';
import {
  IDLE_STATUS,
  RECORDING_STATE,
  type RecordingStatus,
} from '../../../shared/recording-state';
import { loom } from '../../lib/loom-api';

type DraggableStyle = React.CSSProperties & {
  WebkitAppRegion?: 'drag' | 'no-drag';
};

const DRAG_STYLE: DraggableStyle = { WebkitAppRegion: 'drag' };
const NO_DRAG_STYLE: DraggableStyle = { WebkitAppRegion: 'no-drag' };

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const PAD_LENGTH = 2;
const PAD_CHAR = '0';
const TICK_INTERVAL_MS = 1000;

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const mm = String(minutes).padStart(PAD_LENGTH, PAD_CHAR);
  const ss = String(seconds).padStart(PAD_LENGTH, PAD_CHAR);
  return `${mm}:${ss}`;
};

export const ControlBar = () => {
  const [status, setStatus] = useState<RecordingStatus>(IDLE_STATUS);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => loom.onRecordingStatus(setStatus), []);

  const isRecording = status.state === RECORDING_STATE.RECORDING;

  useEffect(() => {
    if (!isRecording) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRecording]);

  if (status.state === RECORDING_STATE.COUNTDOWN) {
    return (
      <div
        style={DRAG_STYLE}
        className="flex h-full w-full items-center justify-center rounded-full bg-neutral-900/90 text-4xl font-bold text-white"
      >
        {status.countdownValue}
      </div>
    );
  }

  const isPaused = status.state === RECORDING_STATE.PAUSED;

  if (!isRecording && !isPaused) return null;

  const elapsedMs =
    status.recordingStartedAt === null ? 0 : now - status.recordingStartedAt;

  return (
    <div
      style={DRAG_STYLE}
      className="flex h-full w-full items-center justify-center gap-3 rounded-full bg-neutral-900/90 px-4 text-white"
    >
      <button
        type="button"
        style={NO_DRAG_STYLE}
        onClick={() => loom.stopRecording()}
        aria-label="Stop recording"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 transition-colors hover:bg-red-500"
      >
        <span className="h-3 w-3 rounded-sm bg-white" />
      </button>

      {isRecording ? (
        <button
          type="button"
          style={NO_DRAG_STYLE}
          onClick={() => loom.pauseRecording()}
          aria-label="Pause recording"
          className="rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-white/10"
        >
          Pause
        </button>
      ) : (
        <button
          type="button"
          style={NO_DRAG_STYLE}
          onClick={() => loom.resumeRecording()}
          aria-label="Resume recording"
          className="rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-white/10"
        >
          Resume
        </button>
      )}

      <span className="min-w-[3.5rem] text-center font-mono text-sm tabular-nums">
        {formatElapsed(elapsedMs)}
      </span>
    </div>
  );
};
