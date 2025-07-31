import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

/**
 * Test Environment Setup
 * 
 * Configures Vitest testing environment with necessary browser API mocks:
 * - localStorage for settings persistence testing
 * - matchMedia for responsive design tests  
 * - ResizeObserver for component size tracking
 * 
 * All mocks are reset before each test to ensure test isolation.
 */

// Mock browser storage API for settings persistence tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia API for responsive design and media query tests
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

// Mock ResizeObserver for component size tracking tests
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Reset all mock states before each test to ensure isolation
beforeEach(() => {
  vi.clearAllMocks();
});