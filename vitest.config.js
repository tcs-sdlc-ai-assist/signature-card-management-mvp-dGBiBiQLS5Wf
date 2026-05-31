import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.js',
        '**/*.config.ts',
        'src/test/',
        'src/main.jsx',
      ],
    },
  },
});