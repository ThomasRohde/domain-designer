import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Application state types for managing complex operations
 * Prevents layout updates during sensitive operations like import/restore
 */
export type AppState = 
  | { type: 'IDLE' }
  | { type: 'IMPORTING', stage: 'loading' | 'processing' | 'applying' }
  | { type: 'RESTORING', stage: 'loading' | 'applying' }
  | { type: 'LAYOUT_LOCKED', reason: 'import' | 'restore' };

/**
 * State transition events for controlling application flow
 */
export type StateEvent = 
  | { type: 'START_IMPORT' }
  | { type: 'IMPORT_PROCESSING' }
  | { type: 'IMPORT_APPLYING' }
  | { type: 'START_RESTORE' }
  | { type: 'RESTORE_APPLYING' }
  | { type: 'LOCK_LAYOUT', reason: 'import' | 'restore' }
  | { type: 'COMPLETE' }
  | { type: 'ERROR' };

/**
 * Return interface for useAppStateMachine hook
 * Provides state machine functionality for application flow control
 */
export interface UseAppStateMachineReturn {
  state: AppState;
  transition: (event: StateEvent) => void;
  isImporting: boolean;
  isRestoring: boolean;
  isLayoutLocked: boolean;
  canLayoutUpdate: boolean;
  reset: () => void;
}

export const useAppStateMachine = (): UseAppStateMachineReturn => {
  const [state, setState] = useState<AppState>({ type: 'IDLE' });
  const timeoutRef = useRef<number | null>(null);

  /**
   * Cleanup: prevents memory leaks from pending timeout operations
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const transition = useCallback((event: StateEvent) => {
    setState(currentState => {
      // Cancel pending transitions to prevent race conditions
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      switch (currentState.type) {
        case 'IDLE':
          switch (event.type) {
            case 'START_IMPORT':
              return { type: 'IMPORTING', stage: 'loading' };
            case 'START_RESTORE':
              return { type: 'RESTORING', stage: 'loading' };
            case 'LOCK_LAYOUT':
              return { type: 'LAYOUT_LOCKED', reason: event.reason };
            default:
              return currentState;
          }

        case 'IMPORTING':
          switch (event.type) {
            case 'IMPORT_PROCESSING':
              if (currentState.stage === 'loading') {
                return { type: 'IMPORTING', stage: 'processing' };
              }
              return currentState;
            case 'IMPORT_APPLYING':
              if (currentState.stage === 'processing') {
                return { type: 'IMPORTING', stage: 'applying' };
              }
              return currentState;
            case 'COMPLETE':
              // Delayed transition ensures all import effects settle before unlocking
              timeoutRef.current = window.setTimeout(() => {
                setState({ type: 'IDLE' });
              }, 100);
              return { type: 'LAYOUT_LOCKED', reason: 'import' };
            case 'ERROR':
              return { type: 'IDLE' };
            default:
              return currentState;
          }

        case 'RESTORING':
          switch (event.type) {
            case 'RESTORE_APPLYING':
              if (currentState.stage === 'loading') {
                return { type: 'RESTORING', stage: 'applying' };
              }
              return currentState;
            case 'COMPLETE':
              // Longer delay for restore operations to ensure stability
              timeoutRef.current = window.setTimeout(() => {
                setState({ type: 'IDLE' });
              }, 200);
              return { type: 'LAYOUT_LOCKED', reason: 'restore' };
            case 'ERROR':
              return { type: 'IDLE' };
            default:
              return currentState;
          }

        case 'LAYOUT_LOCKED':
          switch (event.type) {
            case 'COMPLETE':
              return { type: 'IDLE' };
            case 'ERROR':
              return { type: 'IDLE' };
            default:
              return currentState;
          }

        default:
          return currentState;
      }
    });
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({ type: 'IDLE' });
  }, []);

  /**
   * Computed state flags for convenient component consumption
   * Avoids complex state checking in components
   */
  const isImporting = state.type === 'IMPORTING';
  const isRestoring = state.type === 'RESTORING';
  const isLayoutLocked = state.type === 'LAYOUT_LOCKED';
  const canLayoutUpdate = state.type === 'IDLE';

  return {
    state,
    transition,
    isImporting,
    isRestoring,
    isLayoutLocked,
    canLayoutUpdate,
    reset
  };
};