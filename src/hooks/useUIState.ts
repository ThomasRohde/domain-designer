import { useState, useCallback, useEffect } from 'react';
import { ContextMenuState, UIStateHook } from '../types';

export interface UIState {
  sidebarOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
}

export interface UIActions {
  // Sidebar actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  // Context menu actions
  showContextMenu: (x: number, y: number, rectangleId: string) => void;
  hideContextMenu: () => void;
  
  // Export modal actions
  openExportModal: () => void;
  closeExportModal: () => void;
}

export interface UseUIStateReturn extends UIState, UIActions {}

/**
 * Custom hook for managing UI state including sidebar, context menu, and export modal
 */
export const useUIState = (): UIStateHook => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

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

  // Handle responsive sidebar behavior - auto-close on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      // Only auto-close sidebar on mobile, don't auto-open on desktop
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Set initial state - closed by default on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
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
    contextMenu,
    exportModalOpen,
    
    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    showContextMenu,
    hideContextMenu,
    openExportModal,
    closeExportModal,
  };
};
