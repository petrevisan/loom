// The primary app window (route `#/`): first-run setup, the Library, and the
// recording controls before a Recording starts. A normal, framed window.

import { BrowserWindow } from 'electron';
import path from 'node:path';

import { loadRoute } from './load-route';

const PRELOAD_FILE = 'preload.js';
const MAIN_ROUTE = '/';
const MAIN_WIDTH = 900;
const MAIN_HEIGHT = 640;

export const createMainWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, PRELOAD_FILE),
    },
  });

  loadRoute(win, MAIN_ROUTE);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  }

  return win;
};
