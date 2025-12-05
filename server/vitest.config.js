import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        // Run all tests in a single worker to avoid DB state collisions.
        singleThread: true
      }
    },
    testTimeout: 10000,
    setupFiles: ['./tests/setup.js']
  }
});
