import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

/**
 * macOS code signing / notarization is opt-in via environment variables, so a
 * default `pnpm start` / `pnpm package` on a dev machine with no certificates is
 * completely unaffected (osxSign/osxNotarize stay undefined).
 *
 * Env vars:
 * - LOOM_SIGN        Set to any truthy value to enable hardened-runtime code
 *                    signing with build/entitlements.mac.plist.
 * - APPLE_ID         Apple Developer account email (enables notarization).
 * - APPLE_PASSWORD   App-specific password for that Apple ID.
 * - APPLE_TEAM_ID    Apple Developer Team ID.
 *
 * Notarization only runs when LOOM_SIGN is set AND all three APPLE_* vars are
 * present. Note: screen-recording is NOT an entitlement — the user must still
 * grant loom Screen Recording access in System Settings > Privacy & Security
 * and restart the app for it to take effect.
 */
const shouldSign = Boolean(process.env.LOOM_SIGN);
const canNotarize =
  shouldSign &&
  Boolean(process.env.APPLE_ID) &&
  Boolean(process.env.APPLE_PASSWORD) &&
  Boolean(process.env.APPLE_TEAM_ID);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.loom.app',
    // Required on macOS: without these, systemPreferences.askForMediaAccess crashes.
    extendInfo: {
      NSCameraUsageDescription:
        'loom uses your camera to show a live webcam bubble while you record.',
      NSMicrophoneUsageDescription:
        'loom uses your microphone to record narration over your screen.',
    },
    ...(shouldSign
      ? {
          osxSign: {
            optionsForFile: () => ({
              entitlements: 'build/entitlements.mac.plist',
              hardenedRuntime: true,
            }),
          },
        }
      : {}),
    ...(canNotarize
      ? {
          osxNotarize: {
            appleId: process.env.APPLE_ID!,
            appleIdPassword: process.env.APPLE_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
        }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
