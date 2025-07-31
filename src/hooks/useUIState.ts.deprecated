import { useState, useCallback, useEffect } from 'react';
import { ContextMenuState, UIStateHook, LockConfirmationModalState, DescriptionEditModalState, UpdateNotificationState } from '../types';

export interface UIState {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  lockConfirmationModal: LockConfirmationModalState | null;
  descriptionEditModal: DescriptionEditModalState | null;
  templatePageOpen: boolean;
  helpModalOpen: boolean;
  updateNotification: UpdateNotificationState;
}

export interface UIActions {
  // Sidebar actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  // Left menu actions
  toggleLeftMenu: () => void;
  openLeftMenu: () => void;
  closeLeftMenu: () => void;
  
  // Context menu actions
  showContextMenu: (x: number, y: number, rectangleId: string) => void;
  hideContextMenu: () => void;
  
  // Export modal actions
  openExportModal: () => void;
  closeExportModal: () => void;
  
  // Lock confirmation modal actions
  showLockConfirmationModal: (rectangleId: string, rectangleLabel: string) => void;
  hideLockConfirmationModal: () => void;
  
  // Description edit modal actions
  showDescriptionEditModal: (rectangleId: string, rectangleLabel: string, currentDescription: string) => void;
  hideDescriptionEditModal: () => void;
  
  // Template page actions
  openTemplatePage: () => void;
  closeTemplatePage: () => void;
  
  // Help modal actions
  openHelpModal: () => void;
  closeHelpModal: () => void;
  
  // Update notification actions
  showUpdateNotification: (updateServiceWorker: () => void) => void;
  hideUpdateNotification: () => void;
}

export interface UseUIStateReturn extends UIState, UIActions {}

/**
 * Custom hook for managing UI state including sidebar, context menu, and export modal
 */
export const useUIState = (): UIStateHook => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [lockConfirmationModal, setLockConfirmationModal] = useState<LockConfirmationModalState | null>(null);
  const [descriptionEditModal, setDescriptionEditModal] = useState<DescriptionEditModalState | null>(null);
  const [templatePageOpen, setTemplatePageOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [updateNotification, setUpdateNotification] = useState<UpdateNotificationState>({
    isUpdateAvailable: false,
    isUpdating: false,
  });

  // Sidebar actions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Left menu actions
  const toggleLeftMenu = useCallback(() => {
    setLeftMenuOpen(prev => !prev);
  }, []);

  const openLeftMenu = useCallback(() => {
    setLeftMenuOpen(true);
  }, []);

  const closeLeftMenu = useCallback(() => {
    setLeftMenuOpen(false);
  }, []);

  // Context menu actions
  const showContextMenu = useCallback((x: number, y: number, rectangleId: string) => {
    setContextMenu({ x, y, rectangleId });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Export modal actions
  const openExportModal = useCallback(() => {
    setExportModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setExportModalOpen(false);
  }, []);

  // Lock confirmation modal actions
  const showLockConfirmationModal = useCallback((rectangleId: string, rectangleLabel: string) => {
    setLockConfirmationModal({ rectangleId, rectangleLabel });
  }, []);

  const hideLockConfirmationModal = useCallback(() => {
    setLockConfirmationModal(null);
  }, []);

  // Description edit modal actions
  const showDescriptionEditModal = useCallback((rectangleId: string, rectangleLabel: string, currentDescription: string) => {
    setDescriptionEditModal({ rectangleId, rectangleLabel, currentDescription });
  }, []);

  const hideDescriptionEditModal = useCallback(() => {
    setDescriptionEditModal(null);
  }, []);

  // Template page actions
  const openTemplatePage = useCallback(() => {
    setTemplatePageOpen(true);
  }, []);

  const closeTemplatePage = useCallback(() => {
    setTemplatePageOpen(false);
  }, []);

  // Help modal actions
  const openHelpModal = useCallback(() => {
    setHelpModalOpen(true);
  }, []);

  const closeHelpModal = useCallback(() => {
    setHelpModalOpen(false);
  }, []);

  // Update notification actions
  const showUpdateNotification = useCallback((updateServiceWorker: () => void) => {
    setUpdateNotification({
      isUpdateAvailable: true,
      isUpdating: false,
      updateServiceWorker,
      dismiss: () => setUpdateNotification(prev => ({ ...prev, isUpdateAvailable: false })),
    });
  }, []);

  const hideUpdateNotification = useCallback(() => {
    setUpdateNotification({
      isUpdateAvailable: false,
      isUpdating: false,
    });
  }, []);

  // Handle responsive sidebar and left menu behavior - auto-close on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      // Only auto-close sidebar and left menu on mobile, don't auto-open on desktop
      if (window.innerWidth < 768) {
        if (sidebarOpen) setSidebarOpen(false);
        if (leftMenuOpen) setLeftMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, leftMenuOpen]);

  // Set initial state - closed by default on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
      setLeftMenuOpen(false);
    }
  }, []);

  // Handle context menu click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Check if the click is outside the context menu
      const target = e.target as Element;
      if (!target.closest('[data-context-menu]')) {
        setContextMenu(null);
      }
    };
    
    if (contextMenu) {
      // Add a small delay to prevent the right-click event from immediately closing the menu
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClick, true);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClick, true);
      };
    }
  }, [contextMenu]);

  return {
    // State
    sidebarOpen,
    leftMenuOpen,
    contextMenu,
    exportModalOpen,
    lockConfirmationModal,
    descriptionEditModal,
    templatePageOpen,
    helpModalOpen,
    updateNotification,
    
    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    toggleLeftMenu,
    openLeftMenu,
    closeLeftMenu,
    showContextMenu,
    hideContextMenu,
    openExportModal,
    closeExportModal,
    showLockConfirmationModal,
    hideLockConfirmationModal,
    showDescriptionEditModal,
    hideDescriptionEditModal,
    openTemplatePage,
    closeTemplatePage,
    openHelpModal,
    closeHelpModal,
    showUpdateNotification,
    hideUpdateNotification,
  };
};
