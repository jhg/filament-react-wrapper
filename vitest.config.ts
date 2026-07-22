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
        'resources/js/services/EventSystem.ts',
        'resources/js/services/StatePersistenceService.tsx',
        'resources/js/components/ReactComponentRegistry.tsx',
        'resources/js/components/EnhancedStateManager.tsx',
        'resources/js/components/UniversalReactRenderer.tsx',
        'resources/js/components/adapters/FilamentReactAdapter.tsx',
        'resources/js/services/DevTools.ts',
        'resources/js/services/CodeSplittingService.ts',
        'resources/js/services/ComponentVersioningService.ts',
        'resources/js/utils/globals.ts',
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
        'vitest.config.ts',
      ],
    },
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './resources/js'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
