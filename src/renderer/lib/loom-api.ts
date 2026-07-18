// Typed accessor for the preload bridge. Import `loom` anywhere in the renderer
// instead of touching `window.loom` directly.
import type { LoomApi } from '../../shared/api';

declare global {
  interface Window {
    loom: LoomApi;
  }
}

export const loom: LoomApi = window.loom;
