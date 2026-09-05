import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
    // Dynamic store import under 16 parallel workers can exceed the 5s
    // default on constrained machines (import-bound, not a hang).
    testTimeout: 15000,
  },
});
