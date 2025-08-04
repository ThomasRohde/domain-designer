/**
 * Throttle utility functions for performance optimization during drag operations.
 * Consolidates throttling logic to prevent code duplication while providing
 * specialized functions for different interaction types with cancellation support.
 * 
 * Key features:
 * - Generic throttling with timeout-based delay management
 * - Mouse event optimization for high-frequency interactions
 * - Position update throttling with cancellation for drag synchronization fixes
 */

/**
 * Generic throttle function that limits how often a function can be called.
 * Uses a combination of immediate execution for the first call and delayed
 * execution for subsequent calls within the throttle window.
 * 
 * @param func - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds  
 * @returns Throttled version of the function that maintains call timing
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: number | undefined;
  let lastExecTime = 0;

  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
}

/**
 * Specialized throttle for mouse events to prevent excessive operations.
 * Optimized for high-frequency mouse movements during drag operations.
 * Uses 8ms default delay to target 120fps for smooth visual feedback.
 * 
 * @param func - Mouse event handler to throttle
 * @param delay - Throttle delay in milliseconds (default: 8ms for ~120fps)
 * @returns Throttled mouse event handler with consistent timing
 */
export function throttleMouseEvent(
  func: (e: MouseEvent) => void,
  delay: number = 8
): (e: MouseEvent) => void {
  let timeoutId: number | undefined;
  let lastExecTime = 0;

  return (e: MouseEvent) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(e);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        func(e);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Specialized throttle for position updates during drag operations.
 * Critical component for drag synchronization fixes - provides cancellation
 * support to prevent position desync when drag operations end abruptly.
 * 
 * Key synchronization features:
 * - Prevents children from moving after parent drag operations end
 * - Cancels pending position updates on mouse up events
 * - Maintains perfect parent-child coordinate synchronization
 * - Uses 8ms throttling for 120fps smooth visual feedback
 * 
 * @param func - Position update function that moves rectangles
 * @param delay - Update delay in milliseconds (default: 8ms for ~120fps)
 * @returns Object with throttled update function and critical cancel method
 */
export function throttlePositionUpdate(
  func: (deltaX: number, deltaY: number) => void,
  delay: number = 8
): {
  update: (deltaX: number, deltaY: number) => void;
  cancel: () => void;
} {
  let timeoutId: number | undefined;
  let lastExecTime = 0;

  const update = (deltaX: number, deltaY: number) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(deltaX, deltaY);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        func(deltaX, deltaY);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };

  // Critical cancellation method for drag synchronization fixes
  // Prevents position desync by immediately stopping pending updates
  const cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  return { update, cancel };
}