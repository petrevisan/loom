// Screen-source enumeration and picker-free capture selection for the main process.
// loom captures a full display (see docs/adr/0001); this module lists the
// available displays and pins the one the user chose so getDisplayMedia never
// shows an OS picker. See CONTEXT.md for the vocabulary.

import { desktopCapturer, screen } from 'electron';
import type { Session } from 'electron';

import type { Bounds, ScreenSource } from '../shared/domain';

const SCREEN_SOURCE_TYPE = 'screen';
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 200;
const FIRST_SOURCE_INDEX = 0;

/** The source id the user picked, or null before any choice is made. */
let chosenSourceId: string | null = null;

/** Cache of display bounds keyed by desktopCapturer source id, filled on list. */
const boundsBySourceId = new Map<string, Bounds>();

const toBounds = ({ x, y, width, height }: Bounds): Bounds => ({
  x,
  y,
  width,
  height,
});

const primaryDisplayBounds = (): Bounds =>
  toBounds(screen.getPrimaryDisplay().bounds);

/** Bounds of the Display whose id matches the source, or the primary display. */
const boundsForDisplayId = (displayId: string): Bounds => {
  const match = screen
    .getAllDisplays()
    .find((display) => String(display.id) === displayId);

  return match ? toBounds(match.bounds) : primaryDisplayBounds();
};

/**
 * Enumerate the recordable displays with preview thumbnails, resolving each to
 * its Display bounds. Refreshes the id→bounds cache used by getChosenBounds.
 */
export const listScreenSources = async (): Promise<ScreenSource[]> => {
  const sources = await desktopCapturer.getSources({
    types: [SCREEN_SOURCE_TYPE],
    thumbnailSize: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
  });

  boundsBySourceId.clear();

  return sources.map((source) => {
    const bounds = boundsForDisplayId(source.display_id);
    boundsBySourceId.set(source.id, bounds);

    return {
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL(),
      displayId: source.display_id,
      bounds,
    };
  });
};

/** Pin the display the user picked for the next getDisplayMedia request. */
export const setChosenSourceId = (sourceId: string): void => {
  chosenSourceId = sourceId;
};

/**
 * Bounds of the currently chosen source's display, or null if nothing is chosen
 * or the choice predates the last listScreenSources call. Used to place the
 * Camera Bubble and Control Bar on the recorded display.
 */
export const getChosenBounds = (): Bounds | null => {
  if (chosenSourceId === null) {
    return null;
  }
  return boundsBySourceId.get(chosenSourceId) ?? null;
};

/**
 * Register the persistent, per-session handler that answers getDisplayMedia
 * with the chosen display and no OS picker. Register once per session; the
 * handler re-resolves the live source on every request from the stored id,
 * falling back to the first screen source when nothing is chosen yet. Video
 * only — the Mic is captured separately in the renderer and System Audio is out
 * of scope (docs/adr/0001).
 */
export const registerDisplayMediaHandler = (session: Session): void => {
  session.setDisplayMediaRequestHandler(
    (_request, callback) => {
      void desktopCapturer
        .getSources({ types: [SCREEN_SOURCE_TYPE] })
        .then((sources) => {
          const chosen =
            sources.find((source) => source.id === chosenSourceId) ??
            sources[FIRST_SOURCE_INDEX];

          callback(chosen ? { video: chosen } : {});
        });
    },
    { useSystemPicker: false },
  );
};
