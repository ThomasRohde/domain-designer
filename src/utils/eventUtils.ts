import React from 'react';

/**
 * Event handling utilities for canvas interactions
 */

/**
 * Mouse position interface
 */
export interface MousePosition {
  x: number;
  y: number;
}

/**
 * Get mouse position relative to a container element
 */
export const getMousePosition = (
  e: MouseEvent | React.MouseEvent,
  containerRect: DOMRect
): MousePosition => {
  return {
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top
  };
};

/**
 * Get touch position relative to a container element
 */
export const getTouchPosition = (
  e: TouchEvent | React.TouchEvent,
  containerRect: DOMRect,
  touchIndex: number = 0
): MousePosition => {
  const touch = e.touches[touchIndex] || e.changedTouches[touchIndex];
  if (!touch) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: touch.clientX - containerRect.left,
    y: touch.clientY - containerRect.top
  };
};

/**
 * Check if the event is a right-click
 */
export const isRightClick = (e: MouseEvent | React.MouseEvent): boolean => {
  return e.button === 2;
};

/**
 * Check if the event is a middle-click
 */
export const isMiddleClick = (e: MouseEvent | React.MouseEvent): boolean => {
  return e.button === 1;
};

/**
 * Check if the event is a left-click
 */
export const isLeftClick = (e: MouseEvent | React.MouseEvent): boolean => {
  return e.button === 0;
};

/**
 * Check if panning should start based on event and space key state
 */
export const shouldStartPan = (
  e: MouseEvent | React.MouseEvent,
  isSpacePressed: boolean
): boolean => {
  return isMiddleClick(e) || (isLeftClick(e) && isSpacePressed);
};

/**
 * Check if modifier keys are pressed
 */
export const getModifierKeys = (e: MouseEvent | React.MouseEvent | KeyboardEvent) => {
  return {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey
  };
};

/**
 * Prevent default behavior and stop propagation
 */
export const preventEventDefault = (e: Event | React.SyntheticEvent): void => {
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Check if an element is an input element
 */
export const isInputElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

/**
 * Check if an element has contentEditable
 */
export const isContentEditable = (element: Element): boolean => {
  return element.getAttribute('contenteditable') === 'true';
};

/**
 * Check if the event target is editable
 */
export const isEventTargetEditable = (e: Event): boolean => {
  const target = e.target as Element;
  return isInputElement(target) || isContentEditable(target);
};

/**
 * Get the distance between two mouse positions
 */
export const getMouseDistance = (
  pos1: MousePosition,
  pos2: MousePosition
): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if two mouse positions are close enough to be considered the same
 */
export const arePositionsClose = (
  pos1: MousePosition,
  pos2: MousePosition,
  threshold: number = 5
): boolean => {
  return getMouseDistance(pos1, pos2) < threshold;
};

/**
 * Debounce function for event handlers
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function for event handlers
 */
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * Create a cleanup function for event listeners
 */
export const createEventListenerCleanup = (
  element: Element | Window | Document,
  eventType: string,
  handler: (event: Event) => void,
  options?: boolean | { capture?: boolean; once?: boolean; passive?: boolean }
): (() => void) => {
  element.addEventListener(eventType, handler, options);
  
  return () => {
    element.removeEventListener(eventType, handler, options);
  };
};

/**
 * Create multiple event listener cleanups
 */
export const createMultipleEventListenerCleanups = (
  listeners: Array<{
    element: Element | Window | Document;
    eventType: string;
    handler: (event: Event) => void;
    options?: boolean | { capture?: boolean; once?: boolean; passive?: boolean };
  }>
): (() => void) => {
  const cleanups = listeners.map(({ element, eventType, handler, options }) =>
    createEventListenerCleanup(element, eventType, handler, options)
  );
  
  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
};

/**
 * Get normalized wheel delta for consistent scrolling across browsers
 */
export const getNormalizedWheelDelta = (e: WheelEvent): number => {
  // Normalize wheel delta across different browsers and devices
  let delta = 0;
  
  if (e.deltaY !== undefined) {
    delta = e.deltaY;
  } else if ('wheelDelta' in e) {
    delta = -(e as WheelEvent & { wheelDelta: number }).wheelDelta;
  } else if ('detail' in e) {
    delta = (e as WheelEvent & { detail: number }).detail * 40;
  }
  
  // Normalize to a reasonable range
  return Math.max(-1, Math.min(1, delta / 100));
};

/**
 * Check if the event is a double-click within a time threshold
 */
export const isDoubleClick = (
  currentTime: number,
  lastClickTime: number,
  position: MousePosition,
  lastClickPosition: MousePosition,
  timeThreshold: number = 500,
  positionThreshold: number = 5
): boolean => {
  const timeDiff = currentTime - lastClickTime;
  const positionDiff = getMouseDistance(position, lastClickPosition);
  
  return timeDiff < timeThreshold && positionDiff < positionThreshold;
};

/**
 * Format keyboard shortcut for display
 */
export const formatKeyboardShortcut = (shortcut: string): string => {
  return shortcut
    .replace(/Ctrl/g, '⌃')
    .replace(/Alt/g, '⌥')
    .replace(/Shift/g, '⇧')
    .replace(/Meta/g, '⌘');
};

/**
 * Check if a keyboard shortcut matches the current event
 */
export const matchesKeyboardShortcut = (
  e: KeyboardEvent,
  shortcut: string
): boolean => {
  const parts = shortcut.split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  
  // Check if the key matches
  if (e.key !== key && e.code !== key) {
    return false;
  }
  
  // Check if all required modifiers are pressed
  const requiredModifiers = {
    ctrl: modifiers.includes('Ctrl'),
    shift: modifiers.includes('Shift'),
    alt: modifiers.includes('Alt'),
    meta: modifiers.includes('Meta')
  };
  
  const actualModifiers = getModifierKeys(e);
  
  return (
    requiredModifiers.ctrl === actualModifiers.ctrl &&
    requiredModifiers.shift === actualModifiers.shift &&
    requiredModifiers.alt === actualModifiers.alt &&
    requiredModifiers.meta === actualModifiers.meta
  );
};