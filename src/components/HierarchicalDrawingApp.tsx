import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { ExportOptions, Rectangle } from '../types';
import { exportDiagram } from '../utils/exportUtils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppStore } from '../stores/useAppStore';
import { importDiagramFromJSON, processImportedDiagram, ImportedDiagramData } from '../utils/exportUtils';
import { initializeAutoSaveSubscription } from '../stores/useAppStore';
import { setGlobalUpdateNotificationHandler } from '../main';
import RectangleRenderer from './RectangleRenderer';
import ContextMenu from './ContextMenu';
import Toolbar from './Toolbar';
import ExportModal from './ExportModal';
import ActionButtonsOverlay from './ActionButtonsOverlay';
import Canvas from './Canvas';
import Sidebar from './Sidebar';
import PropertyPanel from './PropertyPanel';
import LeftMenu from './LeftMenu';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import LockConfirmationModal from './LockConfirmationModal';
import DescriptionEditModal from './DescriptionEditModal';
import ClearDataConfirmationModal from './ClearDataConfirmationModal';
import TemplatePage from './TemplatePage';
import { UpdateNotification } from './UpdateNotification';

/**
 * Global flag to prevent legacy auto-save system conflicts during migration.
 * Set immediately before React hooks initialization to avoid race conditions
 * between old localStorage-based and new Zustand-based auto-save systems.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__ZUSTAND_AUTO_SAVE_ENABLED__ = true;

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Core rectangle state and operations from centralized Zustand store
  const rectangles = useAppStore(state => state.rectangles);
  const selectedId = useAppStore(state => state.selectedId);
  const { 
    addRectangle, 
    removeRectangle, 
    updateRectangleDescription,
    setSelectedId,
    setSelectedIds,
    clearSelection,
    moveRectangle,
    bulkMove,
    fitToChildren,
    toggleManualPositioning,
    lockAsIs,
    // reparentRectangle, // MIGRATION: Not used directly anymore
    setRectangles,
    setRectanglesWithHistory,
    updateNextId,
    // Multi-select operations
    alignRectangles,
    distributeRectangles,
    bulkUpdateColor,
    bulkDelete
  } = useAppStore(state => state.rectangleActions);
  const { findRectangle /* , canReparent */ } = useAppStore(state => state.getters); // MIGRATION: canReparent not used directly anymore
  const { undo, redo, initializeHistory } = useAppStore(state => state.historyActions);

  // UI state management for modals, menus, and responsive behavior
  const ui = useAppStore(state => state.ui);
  const uiActions = useAppStore(state => state.uiActions);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  
  // IndexedDB-based auto-save system for data persistence across sessions
  const autoSaveState = useAppStore(state => state.autoSave);
  const autoSaveActions = useAppStore(state => state.autoSaveActions);
  
  // Global application settings including layout, fonts, and visual styling
  const settings = useAppStore(state => state.settings);
  const settingsActions = useAppStore(state => state.settingsActions);

  // Rectangle ID counter for generating unique identifiers during import
  const nextId = useAppStore(state => state.nextId);

  /**
   * Wrapper to maintain compatibility with TemplatePage component's setState pattern.
   * Handles both direct state updates and functional updates while ensuring
   * all changes are tracked in the undo/redo history system.
   */
  const setRectanglesWrapper = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    if (typeof value === 'function') {
      const current = useAppStore.getState().rectangles;
      setRectanglesWithHistory(value(current));
    } else {
      setRectanglesWithHistory(value);
    }
  }, [setRectanglesWithHistory]);

  // Event handlers for user interactions
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if right-clicked rectangle is part of multi-selection
    const isMultiSelected = ui.selectedIds && ui.selectedIds.includes(rectangleId) && ui.selectedIds.length > 1;
    
    if (isMultiSelected) {
      // Use multi-select context menu
      uiActions.showMultiSelectContextMenu(e.clientX, e.clientY, ui.selectedIds);
    } else {
      // Use regular single-select context menu
      uiActions.showContextMenu(e.clientX, e.clientY, rectangleId);
    }
  }, [uiActions, ui.selectedIds]);

  const handleAddRectangle = useCallback((parentId: string | null = null) => {
    addRectangle(parentId || undefined);
  }, [addRectangle]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    try {
      await exportDiagram(
        containerRef.current, 
        rectangles, 
        options, 
        settings,
        settings.gridSize,
        settings.borderRadius,
        settings.borderColor,
        settings.borderWidth,
        settings.predefinedColors
      );
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, settings]);

  const handleDeleteSelected = useCallback(() => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk delete
      bulkDelete(selectedIds);
    } else if (selectedId) {
      // Single rectangle delete
      removeRectangle(selectedId);
    }
  }, [selectedId, ui.selectedIds, removeRectangle, bulkDelete]);

  /**
   * Select all sibling rectangles of the currently selected rectangle.
   * Useful for quickly selecting all rectangles at the same hierarchy level.
   */
  const handleSelectAllSiblings = useCallback(() => {
    if (!selectedId) return;
    
    const currentRect = rectangles.find(r => r.id === selectedId);
    if (!currentRect) return;
    
    // Find all siblings (rectangles with same parentId)
    const siblings = rectangles.filter(r => 
      r.parentId === currentRect.parentId && 
      !r.isTextLabel && // Exclude text labels from multi-select
      r.id !== selectedId // Don't include the currently selected rectangle
    );
    
    // Include the current selection and all valid siblings
    const allSiblingIds = [selectedId, ...siblings.map(r => r.id)];
    setSelectedIds(allSiblingIds);
  }, [selectedId, rectangles, setSelectedIds]);

  /**
   * Clear all selections and return to no-selection state.
   * Useful for canceling multi-select operations.
   */
  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Handles JSON file import with comprehensive validation and error recovery.
   * Process: file selection → validation → data processing → store update → auto-save.
   * Includes safeguards against corrupted data and maintains system consistency.
   */
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Temporarily disable auto-save to prevent partial state saves during import
        autoSaveActions.setEnabled(false);
        
        // Parse and validate imported JSON against current schema
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        // Validate and repair data structure, generate new IDs to prevent conflicts
        const { rectangles: processedRectangles, nextId: newNextId } = processImportedDiagram(
          importedData, 
          nextId
        );
        
        // Apply global leaf dimension settings to imported rectangles if configured
        let finalRectangles = processedRectangles;
        if (importedData.globalSettings?.leafFixedWidth || importedData.globalSettings?.leafFixedHeight) {
          finalRectangles = processedRectangles.map(rect => {
            if (rect.type === 'leaf') {
              const updatedRect = { ...rect };
              if (importedData.globalSettings!.leafFixedWidth) {
                updatedRect.w = importedData.globalSettings!.leafWidth;
              }
              if (importedData.globalSettings!.leafFixedHeight) {
                updatedRect.h = importedData.globalSettings!.leafHeight;
              }
              return updatedRect;
            }
            return rect;
          });
        }
        
        // Atomically update all store state with validated imported data
        setRectangles(finalRectangles);
        initializeHistory(finalRectangles);
        updateNextId(newNextId);
        setSelectedId(null);
        
        // Import and apply global settings if present in the imported data
        if (importedData.globalSettings) {
          settingsActions.updateSettings(importedData.globalSettings);
        }
        
        // Re-enable auto-save and persist the successfully imported state
        autoSaveActions.setEnabled(true);
        autoSaveActions.resetAutoRestoreFlag();
        autoSaveActions.saveData();
        
        console.log('✅ Successfully imported diagram');
        
      } catch (error) {
        console.error('❌ Failed to import diagram:', error);
        autoSaveActions.setEnabled(true);
        alert(`Failed to import diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  }, [nextId, setRectangles, initializeHistory, updateNextId, setSelectedId, settingsActions, autoSaveActions]);

  const handleAboutClick = () => {
    setAboutModalOpen(true);
    uiActions.closeLeftMenu();
  };

  const handleTemplatesClick = () => {
    uiActions.openTemplatePage();
    uiActions.closeLeftMenu();
  };

  const handleLockConfirmation = useCallback(() => {
    if (ui.lockConfirmationModal) {
      toggleManualPositioning(ui.lockConfirmationModal.rectangleId);
    }
  }, [ui.lockConfirmationModal, toggleManualPositioning]);

  const handleLockAsIs = useCallback(() => {
    if (ui.lockConfirmationModal) {
      lockAsIs(ui.lockConfirmationModal.rectangleId);
    }
  }, [ui.lockConfirmationModal, lockAsIs]);

  const handleEditDescription = useCallback((rectangleId: string) => {
    const rectangle = findRectangle(rectangleId);
    if (rectangle) {
      uiActions.showDescriptionEditModal(rectangleId, rectangle.label, rectangle.description || '');
    }
  }, [findRectangle, uiActions]);

  // Multi-select context menu handlers
  const handleAlign = useCallback((type: import('../stores/types').AlignmentType) => {
    if (ui.selectedIds && ui.selectedIds.length > 1) {
      try {
        alignRectangles(ui.selectedIds, type);
      } catch (error) {
        console.error('Error during alignment operation:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, alignRectangles, clearSelection]);

  const handleDistribute = useCallback((direction: import('../stores/types').DistributionDirection) => {
    if (ui.selectedIds && ui.selectedIds.length > 2) {
      try {
        distributeRectangles(ui.selectedIds, direction);
      } catch (error) {
        console.error('Error during distribution operation:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, distributeRectangles, clearSelection]);

  const handleBulkUpdateColor = useCallback(() => {
    // For now, just use the first predefined color as an example
    // In a real implementation, this would open a color picker
    if (ui.selectedIds && ui.selectedIds.length > 1) {
      try {
        const color = settings.predefinedColors[0] || '#3B82F6';
        bulkUpdateColor(ui.selectedIds, color);
      } catch (error) {
        console.error('Error updating bulk color:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, bulkUpdateColor, settings.predefinedColors, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    if (ui.selectedIds && ui.selectedIds.length > 1) {
      try {
        // TODO: Add confirmation dialog
        bulkDelete(ui.selectedIds);
      } catch (error) {
        console.error('Error during bulk delete:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, bulkDelete, clearSelection]);

  const handleSaveDescription = useCallback((description: string) => {
    if (ui.descriptionEditModal) {
      updateRectangleDescription(ui.descriptionEditModal.rectangleId, description);
    }
  }, [updateRectangleDescription, ui.descriptionEditModal]);


  /**
   * ZUSTAND MIGRATION: Legacy memoized calculations removed.
   * Components now access store state directly for better performance
   * and to eliminate prop drilling patterns.
   */
  // const selectedRectangle = useMemo(() => 
  //   selectedId ? findRectangle(selectedId) || null : null,
  //   [selectedId, findRectangle]
  // );

  // const selectedChildCount = useMemo(() =>
  //   selectedId ? getChildren(selectedId, rectangles).length : 0,
  //   [selectedId, rectangles]
  // );


  /**
   * Initialize IndexedDB-based auto-save system on app startup.
   * Sets up persistent storage, data validation, and automatic state subscriptions
   * to save rectangle and settings changes across browser sessions.
   */
  useEffect(() => {
    autoSaveActions.initialize();
    // Initialize auto-save subscriptions to track state changes
    const cleanup = initializeAutoSaveSubscription();
    return cleanup;
  }, [autoSaveActions]);


  const handleClearSavedData = () => {
    setClearDataModalOpen(true);
  };

  const handleConfirmClearAll = useCallback(async () => {
    await autoSaveActions.clearData();
    window.location.reload();
  }, [autoSaveActions]);

  const handleConfirmClearModel = useCallback(async () => {
    // Use the Zustand clearModel function which handles all the flags and persistence
    await autoSaveActions.clearModel();
    
    // Reload immediately - the clearModel function sets the localStorage flag to prevent auto-restore
    window.location.reload();
  }, [autoSaveActions]);

  /**
   * Development utility for direct IndexedDB testing and debugging.
   * Creates test database operations to verify IndexedDB availability
   * and basic read/write functionality independent of the auto-save system.
   */
  const testIndexedDB = useCallback(async () => {
    try {
      console.log('Testing IndexedDB directly...');
      const request = indexedDB.open('TestDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('test')) {
          db.createObjectStore('test');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['test'], 'readwrite');
        const store = transaction.objectStore('test');
        
        store.put({ test: 'data', timestamp: Date.now() }, 'testKey');
        
        transaction.oncomplete = () => {
          console.log('Test data saved to IndexedDB');
          
          // Read it back
          const readTransaction = db.transaction(['test'], 'readonly');
          const readStore = readTransaction.objectStore('test');
          const getRequest = readStore.get('testKey');
          
          getRequest.onsuccess = () => {
            console.log('Test data retrieved:', getRequest.result);
          };
        };
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB test failed:', event);
      };
    } catch (error) {
      console.error('IndexedDB not available:', error);
    }
  }, []);

  /**
   * Expose debugging utilities to global window object in development.
   * Allows direct console access to IndexedDB testing and auto-save actions
   * for troubleshooting data persistence issues.
   */
  React.useEffect(() => {
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveActions?: typeof autoSaveActions }).testIndexedDB = testIndexedDB;
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveActions?: typeof autoSaveActions }).autoSaveActions = autoSaveActions;
  }, [testIndexedDB, autoSaveActions]);

  /**
   * Configure Progressive Web App (PWA) update notification system.
   * Connects service worker update events to the UI notification system,
   * allowing users to be prompted when new app versions are available.
   */
  useEffect(() => {
    setGlobalUpdateNotificationHandler(uiActions.showUpdateNotification);
    
    // Cleanup on unmount to prevent memory leaks
    return () => {
      setGlobalUpdateNotificationHandler(() => {});
    };
  }, [uiActions.showUpdateNotification]);

  // Canvas interaction handlers for keyboard shortcuts and global mouse events
  const startKeyboardMovement = useAppStore(state => state.canvasActions.startKeyboardMovement);
  const handleMouseMove = useAppStore(state => state.canvasActions.handleMouseMove);
  const handleMouseUp = useAppStore(state => state.canvasActions.handleMouseUp);
  const handleWheel = useAppStore(state => state.canvasActions.handleWheel);
  const setIsSpacePressed = useAppStore(state => state.canvasActions.setIsSpacePressed);

  /**
   * Keyboard-driven rectangle movement with precise pixel control.
   * Handles both single rectangle and multi-select bulk movement.
   * Movement respects parent boundaries and manual positioning settings.
   */
  const handleMoveUp = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, 0, -deltaPixels);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, 0, -deltaPixels);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveDown = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, 0, deltaPixels);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, 0, deltaPixels);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveLeft = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, -deltaPixels, 0);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, -deltaPixels, 0);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveRight = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, deltaPixels, 0);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, deltaPixels, 0);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  /**
   * Global mouse event handlers for canvas interactions.
   * Manages drag, resize, pan, and zoom operations across the entire document.
   * Uses passive:false for wheel events to enable custom zoom behavior.
   */
  useEffect(() => {
    const mouseMove = (e: MouseEvent) => handleMouseMove(e, containerRef);
    const mouseUp = () => handleMouseUp();
    const wheel = (e: WheelEvent) => handleWheel(e, containerRef);
    
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', wheel, { passive: false });
    }
    
    return () => {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
      if (container) {
        container.removeEventListener('wheel', wheel);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  /**
   * Global keyboard handlers for space-bar canvas panning.
   * Enables space+drag panning behavior while respecting editable elements.
   * Prevents space key interference with input fields and text areas.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        const isEditable = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        );
        
        if (!isEditable) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const isEditable = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        );
        
        if (!isEditable) {
          e.preventDefault();
        }
        setIsSpacePressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [setIsSpacePressed]);

  // Unified keyboard shortcut system with customizable key bindings
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteSelected,
    onCancel: handleClearSelection, // Escape now clears selection
    onSelectAll: handleSelectAllSiblings, // Ctrl+A selects all siblings
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    onMoveLeft: handleMoveLeft,
    onMoveRight: handleMoveRight,
  }), [undo, redo, handleDeleteSelected, handleClearSelection, handleSelectAllSiblings, handleMoveUp, handleMoveDown, handleMoveLeft, handleMoveRight]));

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden select-none">
      <UpdateNotification updateNotification={ui.updateNotification} />
      <Toolbar
        onAddRectangle={handleAddRectangle}
        onExport={uiActions.openExportModal}
        onImport={handleImport}
        selectedId={ui.selectedIds && ui.selectedIds.length === 1 ? ui.selectedIds[0] : selectedId}
        lastSaved={autoSaveState.lastSaved}
        autoSaveEnabled={autoSaveState.enabled}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftMenu
          onAboutClick={handleAboutClick}
          onTemplatesClick={handleTemplatesClick}
          onClearSavedData={handleClearSavedData}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            overlay={
              <ActionButtonsOverlay />
            }
          >
            <RectangleRenderer
              containerRef={containerRef}
              onContextMenu={handleContextMenu}
            />
          </Canvas>
        </div>

        <Sidebar>
          <PropertyPanel />
        </Sidebar>
      </div>

      {ui.contextMenu && (
        <ContextMenu
          x={ui.contextMenu.x}
          y={ui.contextMenu.y}
          rectangleId={ui.contextMenu.rectangleId}
          selectedIds={ui.contextMenu.selectedIds}
          onAddChild={addRectangle}
          onRemove={removeRectangle}
          onEditDescription={handleEditDescription}
          onClose={uiActions.hideContextMenu}
          onAlign={handleAlign}
          onDistribute={handleDistribute}
          onBulkUpdateColor={handleBulkUpdateColor}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <ExportModal
        isOpen={ui.exportModalOpen}
        onClose={uiActions.closeExportModal}
        onExport={handleExport}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <ClearDataConfirmationModal
        isOpen={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onConfirmClearAll={handleConfirmClearAll}
        onConfirmClearModel={handleConfirmClearModel}
      />

      <HelpModal
        isOpen={ui.helpModalOpen}
        onClose={uiActions.closeHelpModal}
      />

      <LockConfirmationModal
        isOpen={!!ui.lockConfirmationModal}
        onClose={uiActions.hideLockConfirmationModal}
        onConfirm={handleLockConfirmation}
        onConfirmLockAsIs={handleLockAsIs}
        rectangleLabel={ui.lockConfirmationModal?.rectangleLabel || ''}
      />

      <DescriptionEditModal
        isOpen={!!ui.descriptionEditModal}
        onClose={uiActions.hideDescriptionEditModal}
        onSave={handleSaveDescription}
        rectangleId={ui.descriptionEditModal?.rectangleId || ''}
        rectangleLabel={ui.descriptionEditModal?.rectangleLabel || ''}
        currentDescription={ui.descriptionEditModal?.currentDescription || ''}
      />

      <TemplatePage
        isOpen={ui.templatePageOpen}
        onClose={uiActions.closeTemplatePage}
        rectangles={rectangles}
        setRectangles={setRectanglesWrapper}
        fitToChildren={fitToChildren}
        predefinedColors={settings.predefinedColors}
        globalSettings={{
          gridSize: settings.gridSize,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight,
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight
        }}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;