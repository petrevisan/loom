// Main window recorder UI. On first run (no Library) it renders Setup inline;
// otherwise it shows the screen-source picker, the Record button, and — once a
// Recording is saved — a Saved panel with Reveal + Play.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type {
  MediaAccessStatus,
  PermissionStatus,
} from '../../../shared/domain';
import { toLoomMediaUrl } from '../../../shared/media-url';
import { loom } from '../../lib/loom-api';
import { useLibrary, useSources } from '../../hooks/use-loom-queries';
import { Setup } from './Setup';
import { PermissionGate } from './PermissionGate';

const GRANTED: MediaAccessStatus = 'granted';

const allGranted = (status: PermissionStatus): boolean =>
  status.camera === GRANTED &&
  status.microphone === GRANTED &&
  status.screen === GRANTED;

const Recorder = () => {
  const sources = useSources();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gateStatus, setGateStatus] = useState<PermissionStatus | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsubSaved = loom.onRecordingSaved(({ path }) => {
      setSavedPath(path);
      setError(null);
    });
    const unsubFailed = loom.onRecordingFailed(({ message }) => {
      setError(message);
    });
    return () => {
      unsubSaved();
      unsubFailed();
    };
  }, []);

  const recheckPermissions = async () => {
    const perms = await loom.checkPermissions();
    setGateStatus(allGranted(perms) ? null : perms);
  };

  const startRecording = async () => {
    if (selectedId === null) return;
    setStarting(true);
    setError(null);
    try {
      const perms = await loom.checkPermissions();
      if (!allGranted(perms)) {
        setGateStatus(perms);
        return;
      }
      const res = await loom.startRecording(selectedId);
      if (!res.ok) {
        setGateStatus(res.needsPermission);
      }
    } finally {
      setStarting(false);
    }
  };

  if (gateStatus !== null) {
    return <PermissionGate status={gateStatus} onRecheck={recheckPermissions} />;
  }

  if (savedPath !== null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-neutral-50 p-8 text-neutral-900">
        <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-emerald-600">Saved ✓</span>
          </div>
          <p className="mt-1 truncate text-xs text-neutral-500">{savedPath}</p>
          <video
            src={toLoomMediaUrl(savedPath)}
            controls
            className="mt-4 w-full rounded-lg bg-black"
          />
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => loom.revealRecording(savedPath)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Reveal in Finder
            </button>
            <button
              type="button"
              onClick={() => setSavedPath(null)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              Record another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 bg-neutral-50 p-8 text-neutral-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">loom</h1>
        <Link
          to="/settings"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Settings
        </Link>
      </div>

      <div className="flex-1">
        <h2 className="text-sm font-semibold text-neutral-700">
          Choose a display to record
        </h2>
        {sources.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No displays found.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => {
              const isSelected = source.id === selectedId;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedId(source.id)}
                  className={`group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition ${
                    isSelected
                      ? 'border-neutral-900 ring-2 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <img
                    src={source.thumbnailDataUrl}
                    alt={source.name}
                    className="aspect-video w-full bg-neutral-100 object-cover"
                  />
                  <p className="truncate px-3 py-2 text-sm font-medium">
                    {source.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error !== null && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={startRecording}
          disabled={selectedId === null || starting}
          className="rounded-full bg-red-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {starting ? 'Starting…' : 'Record'}
        </button>
      </div>
    </div>
  );
};

export const Home = () => {
  const library = useLibrary();

  if (library.libraryPath === null) {
    return <Setup />;
  }

  return <Recorder />;
};
