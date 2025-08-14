import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/scripts/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
        'src/scripts/main.ts' // Entry point, tested via integration
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    include: ['tests/**/*.{test,spec}.ts'],
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/public/**', '**/static/**']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@scripts': resolve(__dirname, './src/scripts'),
      '@styles': resolve(__dirname, './src/styles'),
      '@components': resolve(__dirname, './src/scripts/components')
    }
  }
});
