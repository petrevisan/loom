import { defineConfig } from 'vite';

// https://vitejs.dev/config
// The preload runs in Electron's sandbox, which requires CommonJS (a sandboxed
// preload cannot be an ES module). Emit CJS so `contextBridge`/`ipcRenderer`
// load and `window.loom` is exposed.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: 'cjs',
      },
    },
  },
});
