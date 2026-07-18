// The global shortcut that stops a Recording from anywhere — a safety net for
// when the Control Bar is hidden behind a full-screen window. Registered only
// while recording; unregistered on stop and on quit.

import { globalShortcut } from 'electron';

const STOP_ACCELERATOR = 'CommandOrControl+Shift+.';

export const registerStopShortcut = (onStop: () => void): void => {
  globalShortcut.register(STOP_ACCELERATOR, onStop);
};

export const unregisterStopShortcut = (): void => {
  globalShortcut.unregister(STOP_ACCELERATOR);
};
