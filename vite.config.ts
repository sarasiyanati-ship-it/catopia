import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps all asset URLs relative, so the build works on GitHub Pages
// under any repository sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
});
