// Library persistence and the streaming recording file sink for the main process.
// A Library is the local folder the user chose to hold all their Recordings.
// See CONTEXT.md for the vocabulary and docs/adr/0001 for how capture works.

import { app, dialog, shell } from 'electron';
import {
  createWriteStream,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type { LibraryConfig, RecordingFormat } from '../shared/domain';

const CONFIG_FILE_NAME = 'config.json';
const CONFIG_ENCODING = 'utf-8';
const TEMP_PREFIX = '.loom-';
const RECORDING_PREFIX = 'loom-';
const TEMP_EXTENSION = 'part';
const STREAM_FINISH_EVENT = 'finish';
const EMPTY_LIBRARY: LibraryConfig = { libraryPath: null };

type StoredConfig = {
  libraryPath: string;
};

/** A streaming sink that persists recorder chunks to disk incrementally. */
export type RecordingWriter = {
  appendChunk: (chunk: ArrayBuffer) => void;
  /** Resolves to the final saved file path. */
  finalize: () => Promise<string>;
  /** Aborts and deletes the temp file. */
  discard: () => Promise<void>;
};

const configFilePath = (): string =>
  join(app.getPath('userData'), CONFIG_FILE_NAME);

const isStoredConfig = (value: unknown): value is StoredConfig => {
  if (typeof value !== 'object' || value === null || !('libraryPath' in value)) {
    return false;
  }
  return typeof value.libraryPath === 'string';
};

/**
 * The active Library, or an empty config when unset or when the stored folder
 * no longer exists on disk.
 */
export const getLibrary = (): LibraryConfig => {
  const path = configFilePath();
  if (!existsSync(path)) {
    return EMPTY_LIBRARY;
  }

  try {
    const raw: unknown = JSON.parse(readFileSync(path, CONFIG_ENCODING));
    if (!isStoredConfig(raw) || !existsSync(raw.libraryPath)) {
      return EMPTY_LIBRARY;
    }
    return { libraryPath: raw.libraryPath };
  } catch {
    return EMPTY_LIBRARY;
  }
};

/** Persist the chosen Library folder to the user-data config file. */
export const setLibrary = (libraryPath: string): void => {
  const stored: StoredConfig = { libraryPath };
  writeFileSync(
    configFilePath(),
    JSON.stringify(stored, null, 2),
    CONFIG_ENCODING,
  );
};

/**
 * Prompt the user to pick a Library folder. Persists and returns the new
 * config on selection, or the existing config when canceled.
 */
export const chooseLibrary = async (): Promise<LibraryConfig> => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  const [chosenPath] = result.filePaths;
  if (result.canceled || chosenPath === undefined) {
    return getLibrary();
  }

  setLibrary(chosenPath);
  return { libraryPath: chosenPath };
};

/** Reveal a saved Recording in the OS file manager. */
export const revealRecording = (filePath: string): void => {
  shell.showItemInFolder(filePath);
};

const filesystemSafeTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Open a streaming sink for a new Recording. Requires an active Library.
 * Writes chunks to a temp `.part` file and renames it into place on finalize.
 */
export const beginRecording = (format: RecordingFormat): RecordingWriter => {
  const { libraryPath } = getLibrary();
  if (libraryPath === null) {
    throw new Error(
      'Cannot begin recording: no Library folder is set. Choose a Library first.',
    );
  }

  const timestamp = filesystemSafeTimestamp();
  const tempPath = join(libraryPath, `${TEMP_PREFIX}${timestamp}.${TEMP_EXTENSION}`);
  const finalPath = join(
    libraryPath,
    `${RECORDING_PREFIX}${timestamp}.${format.extension}`,
  );

  const stream = createWriteStream(tempPath);

  const closeStream = (): Promise<void> =>
    new Promise((resolve, reject) => {
      stream.once(STREAM_FINISH_EVENT, resolve);
      stream.once('error', reject);
      stream.end();
    });

  const appendChunk = (chunk: ArrayBuffer): void => {
    stream.write(Buffer.from(chunk));
  };

  const finalize = async (): Promise<string> => {
    await closeStream();
    await rename(tempPath, finalPath);
    return finalPath;
  };

  const discard = async (): Promise<void> => {
    await closeStream();
    await unlink(tempPath);
  };

  return { appendChunk, finalize, discard };
};
