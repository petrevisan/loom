import { app, BrowserWindow, session } from 'electron';
import started from 'electron-squirrel-startup';

import { createMainWindow } from './windows/main-window';
import { registerIpcHandlers } from './ipc';
import { registerDisplayMediaHandler } from './screen-sources';
import {
  registerLoomMediaProtocol,
  registerLoomMediaScheme,
} from './media-protocol';
import { cleanupForQuit, setMainWindowProvider } from './recording-session';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Keep the hidden Recorder window encoding at full tilt while unfocused/occluded.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Privileged scheme registration MUST happen before the app is ready.
registerLoomMediaScheme();

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
setMainWindowProvider(() => mainWindow);

const MEDIA_PERMISSION = 'media';

const createWindow = () => {
  mainWindow = createMainWindow();
};

app.on('second-instance', () => {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
});

app.whenReady().then(() => {
  // Allow camera/mic getUserMedia; screen capture goes through the separate
  // display-media request handler below.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === MEDIA_PERMISSION);
    },
  );

  registerLoomMediaProtocol();
  registerDisplayMediaHandler(session.defaultSession);
  registerIpcHandlers();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanupForQuit();
});
