// The Camera Bubble (route `#/bubble`): a frameless, transparent, always-on-top
// window showing the webcam. It floats over the screen and IS captured as part
// of the Recording, so it must NOT be content-protected. See docs/adr/0001.

import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

import { BUBBLE_SIZES } from '../../shared/domain';
import type { Bounds, BubbleSize } from '../../shared/domain';
import { loadRoute } from './load-route';

const PRELOAD_FILE = 'preload.js';
const BUBBLE_ROUTE = '/bubble';
const INITIAL_SIZE = BUBBLE_SIZES.medium;
const EDGE_MARGIN = 24;
const TRANSPARENT_BACKGROUND = '#00000000';
const ALWAYS_ON_TOP_LEVEL = 'screen-saver' as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const createBubbleWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: INITIAL_SIZE,
    height: INITIAL_SIZE,
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

  loadRoute(win, BUBBLE_ROUTE);

  return win;
};

/** Resize the Bubble to a square of the given size, clamped onto its display. */
export const setBubbleSize = (win: BrowserWindow, size: BubbleSize): void => {
  const dimension = BUBBLE_SIZES[size];
  const current = win.getBounds();
  const { workArea } = screen.getDisplayMatching(current);

  const x = clamp(current.x, workArea.x, workArea.x + workArea.width - dimension);
  const y = clamp(current.y, workArea.y, workArea.y + workArea.height - dimension);

  win.setBounds({ x, y, width: dimension, height: dimension });
};

/** Place the Bubble near the bottom-right of a display, clamped inside it. */
export const placeBubble = (win: BrowserWindow, displayBounds: Bounds): void => {
  const size = win.getBounds().width;

  const x = clamp(
    displayBounds.x + displayBounds.width - size - EDGE_MARGIN,
    displayBounds.x,
    displayBounds.x + displayBounds.width - size,
  );
  const y = clamp(
    displayBounds.y + displayBounds.height - size - EDGE_MARGIN,
    displayBounds.y,
    displayBounds.y + displayBounds.height - size,
  );

  win.setBounds({ x, y, width: size, height: size });
};
