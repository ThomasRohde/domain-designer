import { useState, useCallback, useRef, useEffect } from 'react';

// Application state types
export type AppState = 
  | { type: 'IDLE' }
  | { type: 'IMPORTING', stage: 'loading' | 'processing' | 'applying' }
  | { type: 'RESTORING', stage: 'loading' | 'applying' }
  | { type: 'LAYOUT_LOCKED', reason: 'import' | 'restore' };

// State transition events
export type StateEvent = 
  | { type: 'START_IMPORT' }
  | { type: 'IMPORT_PROCESSING' }
  | { type: 'IMPORT_APPLYING' }
  | { type: 'START_RESTORE' }
  | { type: 'RESTORE_APPLYING' }
  | { type: 'LOCK_LAYOUT', reason: 'import' | 'restore' }
  | { type: 'COMPLETE' }
  | { type: 'ERROR' };

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

  // Clear any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const transition = useCallback((event: StateEvent) => {
    setState(currentState => {
      // Clear any existing timeout
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
              // Auto-transition to IDLE after a brief delay to ensure all effects settle
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
              // Auto-transition to IDLE after a brief delay to ensure all effects settle
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

  // Computed properties for easy consumption
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