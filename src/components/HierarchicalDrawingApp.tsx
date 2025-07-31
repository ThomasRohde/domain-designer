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

// Set global flag immediately to prevent old auto-save system conflicts
// This must be done before any hooks run to prevent race conditions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__ZUSTAND_AUTO_SAVE_ENABLED__ = true;

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get rectangle data and actions from Zustand store
  const rectangles = useAppStore(state => state.rectangles);
  const selectedId = useAppStore(state => state.selectedId);
  const { 
    addRectangle, 
    removeRectangle, 
    updateRectangleDescription,
    setSelectedId,
    moveRectangle,
    fitToChildren,
    toggleManualPositioning,
    lockAsIs,
    // reparentRectangle, // MIGRATION: Not used directly anymore
    setRectangles,
    setRectanglesWithHistory,
    updateNextId
  } = useAppStore(state => state.rectangleActions);
  const { findRectangle /* , canReparent */ } = useAppStore(state => state.getters); // MIGRATION: canReparent not used directly anymore
  const { undo, redo, initializeHistory } = useAppStore(state => state.historyActions);

  // Get UI state and actions from Zustand store
  const ui = useAppStore(state => state.ui);
  const uiActions = useAppStore(state => state.uiActions);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  
  // Auto-save state from store
  const autoSaveState = useAppStore(state => state.autoSave);
  const autoSaveActions = useAppStore(state => state.autoSaveActions);
  
  // Get settings from Zustand store
  const settings = useAppStore(state => state.settings);
  const settingsActions = useAppStore(state => state.settingsActions);

  // Get store state for import functionality
  const nextId = useAppStore(state => state.nextId);

  // Create wrapper for TemplatePage compatibility
  const setRectanglesWrapper = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    if (typeof value === 'function') {
      const current = useAppStore.getState().rectangles;
      setRectanglesWithHistory(value(current));
    } else {
      setRectanglesWithHistory(value);
    }
  }, [setRectanglesWithHistory]);

  // Canvas interactions now handled directly by the store

  // Direct store access eliminates need for refs

  // Event handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    uiActions.showContextMenu(e.clientX, e.clientY, rectangleId);
  }, [uiActions]);

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
    if (selectedId) {
      removeRectangle(selectedId);
    }
  }, [selectedId, removeRectangle]);

  // Simplified import handler using direct store access
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Disable auto-save during import
        autoSaveActions.setEnabled(false);
        
        // Import and validate the data
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        // Process imported data with comprehensive validation and fixing
        const { rectangles: processedRectangles, nextId: newNextId } = processImportedDiagram(
          importedData, 
          nextId
        );
        
        // Apply fixed dimensions if needed
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
        
        // Update store state
        setRectangles(finalRectangles);
        initializeHistory(finalRectangles);
        updateNextId(newNextId);
        setSelectedId(null);
        
        // Update global settings if available
        if (importedData.globalSettings) {
          settingsActions.updateSettings(importedData.globalSettings);
        }
        
        // Re-enable auto-save and save the imported state
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

  const handleSaveDescription = useCallback((description: string) => {
    if (ui.descriptionEditModal) {
      updateRectangleDescription(ui.descriptionEditModal.rectangleId, description);
    }
  }, [updateRectangleDescription, ui.descriptionEditModal]);


  // MIGRATION: These memoized calculations no longer needed as components use store directly
  // const selectedRectangle = useMemo(() => 
  //   selectedId ? findRectangle(selectedId) || null : null,
  //   [selectedId, findRectangle]
  // );

  // const selectedChildCount = useMemo(() =>
  //   selectedId ? getChildren(selectedId, rectangles).length : 0,
  //   [selectedId, rectangles]
  // );


  // Initialize auto-save system
  useEffect(() => {
    autoSaveActions.initialize();
    // Initialize auto-save subscriptions
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

  // Debug function for testing IndexedDB directly
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

  // Add this to window for debugging
  React.useEffect(() => {
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveActions?: typeof autoSaveActions }).testIndexedDB = testIndexedDB;
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveActions?: typeof autoSaveActions }).autoSaveActions = autoSaveActions;
  }, [testIndexedDB, autoSaveActions]);

  // Set up PWA update notification handler
  useEffect(() => {
    setGlobalUpdateNotificationHandler(uiActions.showUpdateNotification);
    
    // Cleanup on unmount
    return () => {
      setGlobalUpdateNotificationHandler(() => {});
    };
  }, [uiActions.showUpdateNotification]);

  // Get canvas actions from store for keyboard shortcuts and mouse handling
  const cancelDrag = useAppStore(state => state.canvasActions.cancelDrag);
  const startKeyboardMovement = useAppStore(state => state.canvasActions.startKeyboardMovement);
  const handleMouseMove = useAppStore(state => state.canvasActions.handleMouseMove);
  const handleMouseUp = useAppStore(state => state.canvasActions.handleMouseUp);
  const handleWheel = useAppStore(state => state.canvasActions.handleWheel);
  const setIsSpacePressed = useAppStore(state => state.canvasActions.setIsSpacePressed);

  // Arrow key movement handlers with pixel-level precision
  const handleMoveUp = useCallback((deltaPixels: number) => {
    if (!selectedId) return;
    startKeyboardMovement();
    moveRectangle(selectedId, 0, -deltaPixels);
  }, [selectedId, moveRectangle, startKeyboardMovement]);

  const handleMoveDown = useCallback((deltaPixels: number) => {
    if (!selectedId) return;
    startKeyboardMovement();
    moveRectangle(selectedId, 0, deltaPixels);
  }, [selectedId, moveRectangle, startKeyboardMovement]);

  const handleMoveLeft = useCallback((deltaPixels: number) => {
    if (!selectedId) return;
    startKeyboardMovement();
    moveRectangle(selectedId, -deltaPixels, 0);
  }, [selectedId, moveRectangle, startKeyboardMovement]);

  const handleMoveRight = useCallback((deltaPixels: number) => {
    if (!selectedId) return;
    startKeyboardMovement();
    moveRectangle(selectedId, deltaPixels, 0);
  }, [selectedId, moveRectangle, startKeyboardMovement]);

  // Global mouse event handlers for canvas interactions
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

  // Global keyboard event handlers for space key panning
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

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteSelected,
    onCancel: cancelDrag,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    onMoveLeft: handleMoveLeft,
    onMoveRight: handleMoveRight,
  }), [undo, redo, handleDeleteSelected, cancelDrag, handleMoveUp, handleMoveDown, handleMoveLeft, handleMoveRight]));

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden select-none">
      <UpdateNotification updateNotification={ui.updateNotification} />
      <Toolbar
        onAddRectangle={handleAddRectangle}
        onExport={uiActions.openExportModal}
        onImport={handleImport}
        selectedId={selectedId}
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
          <PropertyPanel
            // PropertyPanel now uses store directly - no props needed
          />
        </Sidebar>
      </div>

      {ui.contextMenu && (
        <ContextMenu
          x={ui.contextMenu.x}
          y={ui.contextMenu.y}
          rectangleId={ui.contextMenu.rectangleId}
          onAddChild={addRectangle}
          onRemove={removeRectangle}
          onEditDescription={handleEditDescription}
          onClose={uiActions.hideContextMenu}
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