import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/index.js', 'src/**/*.test.js'],
    },
    poolOptions: {
      threads: { singleThread: true }, // RobotJS n'est pas thread-safe
    },
  },
});