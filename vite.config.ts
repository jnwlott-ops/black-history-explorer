import { defineConfig } from 'vite';

// GitHub Pages serves a project site from /<repo>/, so assets need that
// prefix in production. Locally (npm run dev) we want the plain root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/black-history-explorer/' : '/',
}));
