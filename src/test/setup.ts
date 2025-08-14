import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import { enableMapSet } from 'immer';

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

// Enable Immer Map/Set support for tests that use Map in state (e.g., virtual drag positions)
enableMapSet();

// Mock canvas getContext to avoid JSDOM not-implemented errors during font detection
// Always override to a harmless 2D context stub
const canvasProto = (globalThis as unknown as { HTMLCanvasElement?: { prototype?: unknown } }).HTMLCanvasElement?.prototype as
  | (HTMLCanvasElement & { prototype?: unknown })
  | undefined;

if (canvasProto) {
  // Provide a minimal CanvasRenderingContext2D stub used by fontDetection.ts
  // measureText is the only method we rely on; font property is set/read
  vi.spyOn(canvasProto as unknown as HTMLCanvasElement, 'getContext').mockImplementation(() => {
    let _font = '';
    const ctx = {
      get font() {
        return _font;
      },
      set font(v: string) {
        _font = v;
      },
  measureText: (_text: string) => ({ width: 100 }),
    } as unknown as CanvasRenderingContext2D;
    return ctx;
  });
}