import type { SliceCreator, UIState, UIActions } from '../types';

/**
 * UI state slice interface
 */
export interface UISlice {
  ui: UIState;
  uiActions: UIActions;
}

/**
 * Creates the UI slice for the store
 */
export const createUISlice: SliceCreator<UISlice> = (set, get) => {
  // Handle responsive sidebar and left menu behavior - auto-close on mobile when clicking outside
  const handleResize = () => {
    // Only auto-close sidebar and left menu on mobile, don't auto-open on desktop
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const currentState = get();
      if (currentState.ui.sidebarOpen || currentState.ui.leftMenuOpen) {
        set(state => ({
          ui: {
            ...state.ui,
            sidebarOpen: false,
            leftMenuOpen: false
          }
        }));
      }
    }
  };

  // Handle context menu click outside to close
  let contextMenuListener: ((e: MouseEvent) => void) | null = null;
  let contextMenuTimeoutId: number | null = null;

  const setupContextMenuListener = () => {
    const handleClick = (e: MouseEvent) => {
      // Check if the click is outside the context menu
      const target = e.target as Element;
      if (!target.closest('[data-context-menu]')) {
        get().uiActions.hideContextMenu();
      }
    };

    if (contextMenuListener) {
      document.removeEventListener('mousedown', contextMenuListener, true);
    }

    contextMenuListener = handleClick;
    
    // Add a small delay to prevent the right-click event from immediately closing the menu
    contextMenuTimeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClick, true);
    }, 10);
  };

  const cleanupContextMenuListener = () => {
    if (contextMenuTimeoutId) {
      clearTimeout(contextMenuTimeoutId);
      contextMenuTimeoutId = null;
    }
    if (contextMenuListener) {
      document.removeEventListener('mousedown', contextMenuListener, true);
      contextMenuListener = null;
    }
  };

  // Set up window resize listener
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }

  return {
    // Initial state
    ui: {
      sidebarOpen: false,
      leftMenuOpen: false,
      contextMenu: null,
      exportModalOpen: false,
      lockConfirmationModal: null,
      descriptionEditModal: null,
      templatePageOpen: false,
      helpModalOpen: false,
      updateNotification: {
        isUpdateAvailable: false,
        isUpdating: false,
      }
    },

  // Actions
  uiActions: {
    // Sidebar actions
    toggleSidebar: () => {
      set(state => ({
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen
        }
      }));
    },

    openSidebar: () => {
      set(state => ({
        ui: {
          ...state.ui,
          sidebarOpen: true
        }
      }));
    },

    closeSidebar: () => {
      set(state => ({
        ui: {
          ...state.ui,
          sidebarOpen: false
        }
      }));
    },

    // Left menu actions
    toggleLeftMenu: () => {
      set(state => ({
        ui: {
          ...state.ui,
          leftMenuOpen: !state.ui.leftMenuOpen
        }
      }));
    },

    openLeftMenu: () => {
      set(state => ({
        ui: {
          ...state.ui,
          leftMenuOpen: true
        }
      }));
    },

    closeLeftMenu: () => {
      set(state => ({
        ui: {
          ...state.ui,
          leftMenuOpen: false
        }
      }));
    },

    // Context menu actions
    showContextMenu: (x: number, y: number, rectangleId: string) => {
      set(state => ({
        ui: {
          ...state.ui,
          contextMenu: { x, y, rectangleId }
        }
      }));
      // Set up click-outside listener when context menu is shown
      setupContextMenuListener();
    },

    hideContextMenu: () => {
      set(state => ({
        ui: {
          ...state.ui,
          contextMenu: null
        }
      }));
      // Clean up click-outside listener when context menu is hidden
      cleanupContextMenuListener();
    },

    // Export modal actions
    openExportModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          exportModalOpen: true
        }
      }));
    },

    closeExportModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          exportModalOpen: false
        }
      }));
    },

    // Lock confirmation modal actions
    showLockConfirmationModal: (rectangleId: string, rectangleLabel: string) => {
      set(state => ({
        ui: {
          ...state.ui,
          lockConfirmationModal: { rectangleId, rectangleLabel }
        }
      }));
    },

    hideLockConfirmationModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          lockConfirmationModal: null
        }
      }));
    },

    // Description edit modal actions
    showDescriptionEditModal: (rectangleId: string, rectangleLabel: string, currentDescription: string) => {
      set(state => ({
        ui: {
          ...state.ui,
          descriptionEditModal: { rectangleId, rectangleLabel, currentDescription }
        }
      }));
    },

    hideDescriptionEditModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          descriptionEditModal: null
        }
      }));
    },

    // Template page actions
    openTemplatePage: () => {
      set(state => ({
        ui: {
          ...state.ui,
          templatePageOpen: true
        }
      }));
    },

    closeTemplatePage: () => {
      set(state => ({
        ui: {
          ...state.ui,
          templatePageOpen: false
        }
      }));
    },

    // Help modal actions
    openHelpModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          helpModalOpen: true
        }
      }));
    },

    closeHelpModal: () => {
      set(state => ({
        ui: {
          ...state.ui,
          helpModalOpen: false
        }
      }));
    },

    // Update notification actions
    showUpdateNotification: (updateServiceWorker: () => void) => {
      set(state => ({
        ui: {
          ...state.ui,
          updateNotification: {
            isUpdateAvailable: true,
            isUpdating: false,
            updateServiceWorker,
            dismiss: () => {
              set(state => ({
                ui: {
                  ...state.ui,
                  updateNotification: {
                    ...state.ui.updateNotification,
                    isUpdateAvailable: false
                  }
                }
              }));
            },
          }
        }
      }));
    },

    hideUpdateNotification: () => {
      set(state => ({
        ui: {
          ...state.ui,
          updateNotification: {
            isUpdateAvailable: false,
            isUpdating: false,
          }
        }
      }));
    },

    // Internal methods for UI management
    _handleResize: handleResize,
    _cleanupContextMenuListener: cleanupContextMenuListener
  }
};
};