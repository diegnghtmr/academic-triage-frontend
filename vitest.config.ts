import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/app/core'),
      '@features': resolve(__dirname, 'src/app/features'),
      '@shared/ui': resolve(__dirname, 'src/app/shared/ui'),
      '@shared/models': resolve(__dirname, 'src/app/shared/models'),
      '@shared/data-access': resolve(__dirname, 'src/app/shared/data-access'),
      '@shared/pipes': resolve(__dirname, 'src/app/shared/pipes'),
      '@shared': resolve(__dirname, 'src/app/features/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
