import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.d1.test.ts'],
    setupFiles: ['src/test/setupAuthMock.ts'],
    testTimeout: 30000,
  },
});
