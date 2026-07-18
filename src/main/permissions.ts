import { systemPreferences, shell } from 'electron';
import type {
  MediaAccessStatus,
  PermissionKind,
  PermissionStatus,
} from '../shared/domain';

const DARWIN = 'darwin';

/** Permissions we can request programmatically via askForMediaAccess. */
type RequestableKind = Extract<PermissionKind, 'camera' | 'microphone'>;

const SCREEN_KIND: Extract<PermissionKind, 'screen'> = 'screen';

/** Status assumed for every permission on non-macOS platforms. */
const NON_DARWIN_STATUS: MediaAccessStatus = 'granted';

/** Deep link to the macOS Screen Recording privacy pane in System Settings. */
const SCREEN_RECORDING_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';

const isDarwin = (): boolean => process.platform === DARWIN;

const isRequestableKind = (kind: PermissionKind): kind is RequestableKind =>
  kind !== SCREEN_KIND;

/**
 * Current macOS media-access status for camera, microphone, and screen.
 * On non-macOS platforms every permission is reported as granted.
 */
export const checkPermissions = (): PermissionStatus => {
  if (!isDarwin()) {
    return {
      camera: NON_DARWIN_STATUS,
      microphone: NON_DARWIN_STATUS,
      screen: NON_DARWIN_STATUS,
    };
  }

  return {
    camera: systemPreferences.getMediaAccessStatus('camera'),
    microphone: systemPreferences.getMediaAccessStatus('microphone'),
    screen: systemPreferences.getMediaAccessStatus('screen'),
  };
};

/**
 * Request a single permission and return its fresh status.
 *
 * Camera and microphone show the OS dialog via askForMediaAccess. Screen
 * recording has no programmatic request — access is triggered by attempting
 * capture and, once granted in System Settings, requires an app restart — so
 * its current status is returned unchanged. Non-macOS platforms report granted.
 */
export const requestPermission = async (
  kind: PermissionKind,
): Promise<MediaAccessStatus> => {
  if (!isDarwin()) {
    return NON_DARWIN_STATUS;
  }

  if (isRequestableKind(kind)) {
    await systemPreferences.askForMediaAccess(kind);
  }

  return systemPreferences.getMediaAccessStatus(kind);
};

/**
 * Open the macOS Screen Recording privacy pane in System Settings so the user
 * can grant access manually. No-op on non-macOS platforms.
 */
export const openScreenRecordingSettings = async (): Promise<void> => {
  if (!isDarwin()) {
    return;
  }

  await shell.openExternal(SCREEN_RECORDING_SETTINGS_URL);
};
