// Shared contract for the custom protocol that serves saved recordings to a
// <video> element (file:// is blocked by Chromium web security). Main registers
// the scheme + handler; the renderer builds URLs with toLoomMediaUrl().

export const LOOM_MEDIA_SCHEME = 'loom-media';

/** Absolute file path → a loom-media:// URL the renderer can put in <video src>. */
export const toLoomMediaUrl = (filePath: string): string =>
  `${LOOM_MEDIA_SCHEME}://local/${encodeURIComponent(filePath)}`;

/** loom-media:// URL → the absolute file path (used by the main-process handler). */
export const fromLoomMediaUrl = (url: string): string => {
  const prefix = `${LOOM_MEDIA_SCHEME}://local/`;
  if (!url.startsWith(prefix)) {
    throw new Error(`Not a loom-media URL: ${url}`);
  }
  return decodeURIComponent(url.slice(prefix.length));
};
