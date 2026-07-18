// The Control Bar (route `#/control-bar`): a frameless, transparent,
// always-on-top panel to drive a Recording (stop, pause, elapsed time). It is
// content-protected so it stays visible to the user but is EXCLUDED from the
// Screen Capture and never appears in the Recording. See docs/adr/0001.

import { BrowserWindow } from 'electron';
import path from 'node:path';

import type { Bounds } from '../../shared/domain';
import { loadRoute } from './load-route';

const PRELOAD_FILE = 'preload.js';
const CONTROL_BAR_ROUTE = '/control-bar';
const CONTROL_BAR_WIDTH = 320;
const CONTROL_BAR_HEIGHT = 56;
const EDGE_MARGIN = 24;
const TRANSPARENT_BACKGROUND = '#00000000';
const ALWAYS_ON_TOP_LEVEL = 'screen-saver' as const;
const SHOW_EVENT = 'show';

export const createControlBarWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: CONTROL_BAR_WIDTH,
    height: CONTROL_BAR_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: TRANSPARENT_BACKGROUND,
    webPreferences: {
      preload: path.join(__dirname, PRELOAD_FILE),
    },
  });

  win.setAlwaysOnTop(true, ALWAYS_ON_TOP_LEVEL);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Exclude from Screen Capture; re-assert on show in case it is toggled off.
  win.setContentProtection(true);
  win.on(SHOW_EVENT, () => {
    win.setContentProtection(true);
  });

  loadRoute(win, CONTROL_BAR_ROUTE);

  return win;
};

/** Place the Control Bar at the bottom-center of a display. */
export const placeControlBar = (win: BrowserWindow, displayBounds: Bounds): void => {
  const { width, height } = win.getBounds();

  const x = displayBounds.x + Math.round((displayBounds.width - width) / 2);
  const y = displayBounds.y + displayBounds.height - height - EDGE_MARGIN;

  win.setBounds({ x, y, width, height });
};
