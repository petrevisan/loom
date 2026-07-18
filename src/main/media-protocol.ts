// Custom `loom-media://` protocol that serves saved Recordings to a <video>
// element (file:// is blocked by Chromium web security). The scheme must be
// registered as privileged BEFORE app ready; the handler AFTER app ready.
// See src/shared/media-url.ts for the URL contract.

import { protocol } from 'electron';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { LOOM_MEDIA_SCHEME, fromLoomMediaUrl } from '../shared/media-url';

const CONTENT_TYPE_HEADER = 'Content-Type';
const NOT_FOUND_STATUS = 404;
const MP4_EXTENSION = '.mp4';
const WEBM_EXTENSION = '.webm';
const MP4_CONTENT_TYPE = 'video/mp4';
const WEBM_CONTENT_TYPE = 'video/webm';
const FALLBACK_CONTENT_TYPE = 'application/octet-stream';

const contentTypeFor = (filePath: string): string => {
  const extension = extname(filePath).toLowerCase();
  if (extension === MP4_EXTENSION) {
    return MP4_CONTENT_TYPE;
  }
  if (extension === WEBM_EXTENSION) {
    return WEBM_CONTENT_TYPE;
  }
  return FALLBACK_CONTENT_TYPE;
};

/** Register the privileged scheme. Must run BEFORE app `ready`. */
export const registerLoomMediaScheme = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LOOM_MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        bypassCSP: true,
      },
    },
  ]);
};

/** Install the request handler. Must run AFTER app `ready`. */
export const registerLoomMediaProtocol = (): void => {
  protocol.handle(LOOM_MEDIA_SCHEME, async (request) => {
    const filePath = fromLoomMediaUrl(request.url);

    if (!existsSync(filePath)) {
      return new Response(null, { status: NOT_FOUND_STATUS });
    }

    // TODO: range requests for seeking (stream the file instead of buffering it)
    const bytes = await readFile(filePath);

    return new Response(bytes, {
      headers: { [CONTENT_TYPE_HEADER]: contentTypeFor(filePath) },
    });
  });
};
