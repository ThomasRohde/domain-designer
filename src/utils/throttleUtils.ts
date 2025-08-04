/**
 * Throttle utility functions for performance optimization
 * Consolidates throttling logic to prevent code duplication
 */

/**
 * Generic throttle function that limits how often a function can be called
 * @param func - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled version of the function
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
 * Specialized throttle for mouse events to prevent excessive operations
 * Optimized for high-frequency mouse movements during drag operations
 * 
 * @param func - Mouse event handler to throttle
 * @param delay - Throttle delay in milliseconds (default: 8ms for ~120fps)
 * @returns Throttled mouse event handler
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
 * Specialized throttle for position updates during drag operations
 * Uses optimized timing for smooth visual feedback
 * 
 * @param func - Position update function
 * @param delay - Update delay in milliseconds (default: 8ms for ~120fps)
 * @returns Throttled position update function
 */
export function throttlePositionUpdate(
  func: (deltaX: number, deltaY: number) => void,
  delay: number = 8
): (deltaX: number, deltaY: number) => void {
  let timeoutId: number | undefined;
  let lastExecTime = 0;

  return (deltaX: number, deltaY: number) => {
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
}