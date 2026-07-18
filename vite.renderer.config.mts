import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
// `base: './'` makes asset URLs relative so the packaged app resolves them
// over the file:// protocol instead of 404-ing against the filesystem root.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
