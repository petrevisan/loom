// Hidden Recorder window engine (route #/capture). Main is the single source of
// truth: it drives the session by sending CaptureCommands, and this hook reacts.
// The camera is NOT recorded here — only the Screen Capture video track plus the
// Mic audio track are muxed. See docs/adr/0001-overlay-window-capture.md.
//
// Handshake this hook implements:
//   ARM   → acquire screen + mic, build MediaRecorder → sendCaptureArmed
//   START → recorder.start(timeslice)                 → sendCaptureStarted
//   PAUSE / RESUME → recorder.pause()/resume()        (idempotent, no signal)
//   STOP  → recorder.stop() → onstop                  → sendCaptureStopped
// Chunks stream out via sendCaptureChunk on every timeslice; any throw reports
// sendCaptureError and tears everything down.

import { useEffect, useRef } from 'react';
import {
  CAPTURE_MAX_HEIGHT,
  CAPTURE_MAX_WIDTH,
  FALLBACK_FORMAT,
  PREFERRED_FORMAT,
  type RecordingFormat,
} from '../../shared/domain';
import type { CaptureCommandPayload } from '../../shared/ipc-contract';
import { CAPTURE_COMMAND } from '../../shared/recording-state';
import { loom } from '../lib/loom-api';

const TIMESLICE_MS = 1000;

export const useScreenRecorder = () => {
  const didInitRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const videoSettingsRef = useRef<MediaTrackSettings | null>(null);

  useEffect(() => {
    // StrictMode double-mount latch: subscribe/acquire exactly once.
    if (didInitRef.current) return;
    didInitRef.current = true;

    const stopStream = (streamRef: React.RefObject<MediaStream | null>) => {
      const stream = streamRef.current;
      if (!stream) return;
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    };

    const stopAllTracks = () => {
      stopStream(combinedStreamRef);
      stopStream(displayStreamRef);
      stopStream(micStreamRef);
    };

    // Silent teardown for unmount and error paths: it detaches onstop so no
    // stray captureStopped is emitted, stops the recorder, then every track.
    const teardown = () => {
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state !== 'inactive') recorder.stop();
        recorderRef.current = null;
      }
      stopAllTracks();
      videoSettingsRef.current = null;
    };

    const emitChunk = async (event: BlobEvent) => {
      if (event.data.size === 0) return;
      loom.sendCaptureChunk(await event.data.arrayBuffer());
    };

    const arm = async () => {
      const format: RecordingFormat = MediaRecorder.isTypeSupported(
        PREFERRED_FORMAT.mimeType,
      )
        ? PREFERRED_FORMAT
        : FALLBACK_FORMAT;

      // Main's handler pins the chosen display, so no source id is passed here.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      displayStreamRef.current = display;

      const [videoTrack] = display.getVideoTracks();
      if (!videoTrack) throw new Error('No screen video track available');
      await videoTrack.applyConstraints({
        width: { ideal: CAPTURE_MAX_WIDTH },
        height: { ideal: CAPTURE_MAX_HEIGHT },
      });

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;

      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...mic.getAudioTracks(),
      ]);
      combinedStreamRef.current = combined;

      const recorder = new MediaRecorder(combined, {
        mimeType: format.mimeType,
      });
      recorder.ondataavailable = (event) => {
        void emitChunk(event);
      };
      recorder.onstop = () => {
        loom.sendCaptureStopped();
        stopAllTracks();
      };
      recorderRef.current = recorder;

      // Keep the negotiated video settings so START can report real dimensions.
      videoSettingsRef.current = videoTrack.getSettings();

      loom.sendCaptureArmed({ format });
    };

    const start = () => {
      const recorder = recorderRef.current;
      if (!recorder) throw new Error('Cannot start: recorder not armed');
      if (recorder.state !== 'inactive') return; // idempotent

      recorder.start(TIMESLICE_MS);

      const settings = videoSettingsRef.current;
      loom.sendCaptureStarted({
        width: settings?.width ?? CAPTURE_MAX_WIDTH,
        height: settings?.height ?? CAPTURE_MAX_HEIGHT,
      });
    };

    const pause = () => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') return; // idempotent
      recorder.pause();
    };

    const resume = () => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'paused') return; // idempotent
      recorder.resume();
    };

    const stop = () => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') return; // idempotent
      recorder.stop();
    };

    const handleCommand = async (payload: CaptureCommandPayload) => {
      try {
        switch (payload.command) {
          case CAPTURE_COMMAND.ARM:
            await arm();
            return;
          case CAPTURE_COMMAND.START:
            start();
            return;
          case CAPTURE_COMMAND.PAUSE:
            pause();
            return;
          case CAPTURE_COMMAND.RESUME:
            resume();
            return;
          case CAPTURE_COMMAND.STOP:
            stop();
            return;
        }
      } catch (err) {
        loom.sendCaptureError({ message: String(err) });
        teardown();
      }
    };

    const unsubscribe = loom.onCaptureCommand((payload) => {
      void handleCommand(payload);
    });

    return () => {
      unsubscribe();
      teardown();
      didInitRef.current = false;
    };
  }, []);
};
