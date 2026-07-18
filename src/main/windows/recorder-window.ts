// The hidden Recorder (route `#/capture`): runs the MediaRecorder off-screen.
// It is never shown and keeps `backgroundThrottling: false` so it keeps
// encoding while unfocused/occluded during a Recording. See docs/adr/0001.

import { BrowserWindow } from 'electron';
import path from 'node:path';

import { loadRoute } from './load-route';

const PRELOAD_FILE = 'preload.js';
const CAPTURE_ROUTE = '/capture';

export const createRecorderWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, PRELOAD_FILE),
      backgroundThrottling: false,
    },
  });

  loadRoute(win, CAPTURE_ROUTE);

  return win;
};
