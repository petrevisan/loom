// The hidden Recorder window (route #/capture). Headless: it owns the screen +
// mic MediaRecorder and reacts to CaptureCommands from main via the hook.
import { useScreenRecorder } from '../../hooks/use-screen-recorder';

export const CaptureEngine = () => {
  useScreenRecorder();
  return null;
};
