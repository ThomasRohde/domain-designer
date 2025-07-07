import { useState, useCallback, useEffect } from 'react';
import { ContextMenuState, UIStateHook, LockConfirmationModalState } from '../types';

export interface UIState {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  lockConfirmationModal: LockConfirmationModalState | null;
  templatePageOpen: boolean;
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
  
  // Template page actions
  openTemplatePage: () => void;
  closeTemplatePage: () => void;
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
  const [templatePageOpen, setTemplatePageOpen] = useState(false);

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

  // Template page actions
  const openTemplatePage = useCallback(() => {
    setTemplatePageOpen(true);
  }, []);

  const closeTemplatePage = useCallback(() => {
    setTemplatePageOpen(false);
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
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return {
    // State
    sidebarOpen,
    leftMenuOpen,
    contextMenu,
    exportModalOpen,
    lockConfirmationModal,
    templatePageOpen,
    
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
    openTemplatePage,
    closeTemplatePage,
  };
};
