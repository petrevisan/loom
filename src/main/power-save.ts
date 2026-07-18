// Keeps the display awake for the duration of a Recording by wrapping Electron's
// powerSaveBlocker. Guards against double-start by tracking the blocker id.

import { powerSaveBlocker } from 'electron';

const PREVENT_DISPLAY_SLEEP = 'prevent-display-sleep' as const;

let blockerId: number | null = null;

export const startPreventDisplaySleep = (): void => {
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
    return;
  }
  blockerId = powerSaveBlocker.start(PREVENT_DISPLAY_SLEEP);
};

export const stopPreventDisplaySleep = (): void => {
  if (blockerId === null) {
    return;
  }
  if (powerSaveBlocker.isStarted(blockerId)) {
    powerSaveBlocker.stop(blockerId);
  }
  blockerId = null;
};
