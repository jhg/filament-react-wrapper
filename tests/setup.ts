import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.localStorage.setItem('react-wrapper-debug', 'false');

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset DOM
  document.body.innerHTML = '';
  window.localStorage.setItem('react-wrapper-debug', 'false');

  // Reset window.ReactWrapper if it exists
  if (typeof window !== 'undefined') {
    delete (window as Record<string, unknown>).ReactWrapper;
    delete (window as Record<string, unknown>).ReactComponentRegistry;
  }
});
