// Domain types shared across the main, preload, and renderer processes.
// See CONTEXT.md for the vocabulary these types encode.

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** A display that can be recorded, as surfaced by the screen-source picker. */
export type ScreenSource = {
  /** desktopCapturer source id (e.g. "screen:1:0"). */
  id: string;
  name: string;
  /** PNG data URL preview of the display. */
  thumbnailDataUrl: string;
  /** Electron Display id, used to match the source to a display and place the Bubble. */
  displayId: string;
  bounds: Bounds;
};

export type PermissionKind = 'camera' | 'microphone' | 'screen';

/** Mirrors Electron's systemPreferences.getMediaAccessStatus return values. */
export type MediaAccessStatus =
  | 'not-determined'
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'unknown';

export type PermissionStatus = Record<PermissionKind, MediaAccessStatus>;

/** The active Library folder, or null before first-run setup. */
export type LibraryConfig = {
  libraryPath: string | null;
};

export type RecordingExtension = 'mp4' | 'webm';

export type RecordingFormat = {
  /** Full MediaRecorder mime type incl. codecs. */
  mimeType: string;
  extension: RecordingExtension;
};

/** Preferred format when the platform supports it, and the universal fallback. */
export const PREFERRED_FORMAT: RecordingFormat = {
  mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2',
  extension: 'mp4',
};

export const FALLBACK_FORMAT: RecordingFormat = {
  mimeType: 'video/webm;codecs=vp9,opus',
  extension: 'webm',
};

/** Target capture resolution — constrained for lighter files/CPU (see plan). */
export const CAPTURE_MAX_WIDTH = 1920;
export const CAPTURE_MAX_HEIGHT = 1080;

export type BubbleSize = 'small' | 'medium' | 'large';

export const BUBBLE_SIZES: Record<BubbleSize, number> = {
  small: 140,
  medium: 200,
  large: 280,
};
