// Loads one of the app's hash routes into a window. The four windows share a
// single renderer bundle (main `#/`, Camera Bubble `#/bubble`, Control Bar
// `#/control-bar`, hidden Recorder `#/capture`); this centralizes the dev vs.
// prod URL/file logic so every window loads its route the same way.

import type { BrowserWindow } from 'electron';
import path from 'node:path';

const HASH_PREFIX = '#';
const RENDERER_ENTRY = 'index.html';

export const loadRoute = (win: BrowserWindow, route: string): void => {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${HASH_PREFIX}${route}`);
    return;
  }

  win.loadFile(
    path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/${RENDERER_ENTRY}`),
    { hash: route },
  );
};
