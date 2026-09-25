import {defineConfig} from 'vite';

// Development preview only. The hand-authored dist/ remains the Site's static source.
export default defineConfig({
  root: 'dist',
  server: {host: '0.0.0.0', allowedHosts: ['terminal.local']},
});
