import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'resources/js/utils/state.ts',
        'resources/js/services/StateManagerService.ts',
        'resources/js/services/EventSystem.ts',
        'resources/js/services/StatePersistenceService.tsx',
        'resources/js/components/StateManager.tsx',
        'resources/js/components/ReactComponentRegistry.tsx',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        'vite.config.js',
        'vitest.config.ts'
      ]
    },
    globals: true,
    clearMocks: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './resources/js'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});
