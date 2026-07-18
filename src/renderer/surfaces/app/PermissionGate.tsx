// Guided permission panel shown when camera / mic / screen access isn't all
// granted. Camera & mic can be requested in-app; screen recording must be
// enabled in System Settings and requires a restart of loom to take effect.
import type {
  MediaAccessStatus,
  PermissionKind,
  PermissionStatus,
} from '../../../shared/domain';
import { loom } from '../../lib/loom-api';

type Props = {
  status: PermissionStatus;
  onRecheck: () => void;
};

const GRANTED: MediaAccessStatus = 'granted';

const PERMISSION_LABEL: Record<PermissionKind, string> = {
  camera: 'Camera',
  microphone: 'Microphone',
  screen: 'Screen Recording',
};

const STATUS_LABEL: Record<MediaAccessStatus, string> = {
  'not-determined': 'Not requested',
  granted: 'Granted',
  denied: 'Denied',
  restricted: 'Restricted',
  unknown: 'Unknown',
};

const statusBadgeClass = (value: MediaAccessStatus): string =>
  value === GRANTED
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700';

export const PermissionGate = ({ status, onRecheck }: Props) => {
  const requestAccess = async (kind: 'camera' | 'microphone') => {
    await loom.requestPermission(kind);
    onRecheck();
  };

  const openScreenSettings = async () => {
    await loom.openScreenRecordingSettings();
  };

  return (
    <div className="flex h-full items-center justify-center bg-neutral-50 p-8 text-neutral-900">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          loom needs permission
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Grant access so loom can record your screen, camera, and mic.
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {(Object.keys(PERMISSION_LABEL) as PermissionKind[]).map((kind) => (
            <li
              key={kind}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{PERMISSION_LABEL[kind]}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(status[kind])}`}
                >
                  {STATUS_LABEL[status[kind]]}
                </span>
              </div>
              {kind === 'screen' ? (
                <button
                  type="button"
                  onClick={openScreenSettings}
                  disabled={status[kind] === GRANTED}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                >
                  Open System Settings
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => requestAccess(kind)}
                  disabled={status[kind] === GRANTED}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                >
                  Grant
                </button>
              )}
            </li>
          ))}
        </ul>

        {status.screen !== GRANTED && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            After enabling Screen Recording in System Settings, you must{' '}
            <strong>restart loom</strong> for the change to take effect.
          </p>
        )}

        <button
          type="button"
          onClick={onRecheck}
          className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
        >
          Recheck
        </button>
      </div>
    </div>
  );
};
