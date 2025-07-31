import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { ExportOptions, Rectangle } from '../types';
import { exportDiagram } from '../utils/exportUtils';
// import { getChildren } from '../utils/layoutUtils'; // MIGRATION: Now using store getters
// MIGRATION: useRectangleManager replaced by Zustand store
// import { useRectangleManager } from '../hooks/useRectangleManager';
// MIGRATION: useAppSettings replaced by Zustand store
// import { useAppSettings } from '../hooks/useAppSettings';
// MIGRATION: useUIState replaced by Zustand store
// import { useUIState } from '../hooks/useUIState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppCore } from '../hooks/useAppCore';
import { useAppStore } from '../stores/useAppStore';
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

  // Memoize the getMargins function to avoid inline object creation
  const getMargins = useCallback(() => ({ 
    margin: settings.margin, 
    labelMargin: settings.labelMargin 
  }), [settings.margin, settings.labelMargin]);
  
  // MIGRATION: rectangleManager is now replaced by Zustand store
  // const rectangleManager = useRectangleManager({
  //   gridSize: appSettings.gridSize,
  //   panOffsetRef,
  //   containerRef,
  //   getFixedDimensions: appSettings.getFixedDimensions,
  //   getMargins,
  //   triggerSave
  // });

  // Initialize app core systems
  const nextId = useAppStore(state => state.nextId);
  
  // Create wrappers to match expected signatures
  const setRectanglesWrapper = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    if (typeof value === 'function') {
      const current = useAppStore.getState().rectangles;
      setRectangles(value(current));
    } else {
      setRectangles(value);
    }
  }, [setRectangles]);

  const setRectanglesWithHistoryWrapper = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    if (typeof value === 'function') {
      const current = useAppStore.getState().rectangles;
      setRectanglesWithHistory(value(current));
    } else {
      setRectanglesWithHistory(value);
    }
  }, [setRectanglesWithHistory]);

  const appCore = useAppCore({
    rectangles,
    setRectangles: setRectanglesWrapper,
    setRectanglesWithHistory: setRectanglesWithHistoryWrapper,
    initializeHistory,
    updateNextId,
    nextId,
    setSelectedId,
    getFixedDimensions: settingsActions.getFixedDimensions,
    getMargins,
    appSettings: {
      ...settings,
      // Ensure required arrays are defined
      availableFonts: settings.availableFonts || [],
      fontsLoading: settings.fontsLoading || false,
      // Add legacy compatibility methods that useAppCore expects
      getFixedDimensions: settingsActions.getFixedDimensions,
      calculateFontSize: settingsActions.calculateFontSize,
      handleLeafFixedWidthChange: settingsActions.handleLeafFixedWidthChange,
      handleLeafFixedHeightChange: settingsActions.handleLeafFixedHeightChange,
      handleLeafWidthChange: settingsActions.handleLeafWidthChange,
      handleLeafHeightChange: settingsActions.handleLeafHeightChange,
      handleRootFontSizeChange: settingsActions.handleRootFontSizeChange,
      handleDynamicFontSizingChange: settingsActions.handleDynamicFontSizingChange,
      handleFontFamilyChange: settingsActions.handleFontFamilyChange,
      handleBorderRadiusChange: settingsActions.handleBorderRadiusChange,
      handleBorderColorChange: settingsActions.handleBorderColorChange,
      handleBorderWidthChange: settingsActions.handleBorderWidthChange,
      handleMarginChange: settingsActions.handleMarginChange,
      handleLabelMarginChange: settingsActions.handleLabelMarginChange,
      handleLayoutAlgorithmChange: settingsActions.handleLayoutAlgorithmChange,
      addCustomColor: settingsActions.addCustomColor,
      updateColorSquare: settingsActions.updateColorSquare,
      handlePredefinedColorsChange: settingsActions.handlePredefinedColorsChange,
      setGridSize: settingsActions.setGridSize,
      handleShowGridChange: settingsActions.handleShowGridChange,
      setRectanglesRef: () => {}, // No-op since store manages this directly
      setFitToChildrenRef: () => {}, // No-op since store manages this directly
      setIsRestoring: settingsActions.setIsRestoring
    }
  });

  // Canvas interactions with proper setSelectedId wrapper
  // MIGRATION: setSelectedIdWrapper no longer needed as we use store directly
  // const setSelectedIdWrapper = useCallback((value: React.SetStateAction<string | null>) => {
  //   if (typeof value === 'function') {
  //     setSelectedId(value(selectedId));
  //   } else {
  //     setSelectedId(value);
  //   }
  // }, [selectedId, setSelectedId]);

  // Canvas interactions now handled directly by the store

  // App settings no longer need refs - they use the store directly
  // React.useEffect(() => {
  //   appSettings.setRectanglesRef(setRectanglesWrapper);
  //   appSettings.setFitToChildrenRef(fitToChildren);
  // }, [setRectanglesWrapper, fitToChildren, appSettings]);

  // Event handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    uiActions.showContextMenu(e.clientX, e.clientY, rectangleId);
  }, [uiActions]);

  const handleAddRectangle = useCallback((parentId: string | null = null) => {
    addRectangle(parentId || undefined);
  }, [addRectangle]);

  // Memoize export settings to avoid recreating object and reduce dependency array
  const exportSettings = useMemo(() => ({
    gridSize: settings.gridSize,
    showGrid: settings.showGrid,
    leafFixedWidth: settings.leafFixedWidth,
    leafFixedHeight: settings.leafFixedHeight,
    leafWidth: settings.leafWidth,
    leafHeight: settings.leafHeight,
    rootFontSize: settings.rootFontSize,
    dynamicFontSizing: settings.dynamicFontSizing,
    fontFamily: settings.fontFamily,
    borderRadius: settings.borderRadius,
    borderColor: settings.borderColor,
    borderWidth: settings.borderWidth,
    predefinedColors: settings.predefinedColors,
    margin: settings.margin,
    labelMargin: settings.labelMargin,
    layoutAlgorithm: settings.layoutAlgorithm
  }), [
    settings.gridSize, settings.showGrid, settings.leafFixedWidth, settings.leafFixedHeight, 
    settings.leafWidth, settings.leafHeight, settings.rootFontSize, 
    settings.dynamicFontSizing, settings.fontFamily, settings.borderRadius, 
    settings.borderColor, settings.borderWidth, settings.predefinedColors, 
    settings.layoutAlgorithm, settings.margin, settings.labelMargin
  ]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    try {
      await exportDiagram(
        containerRef.current, 
        rectangles, 
        options, 
        exportSettings,
        exportSettings.gridSize,
        exportSettings.borderRadius,
        exportSettings.borderColor,
        exportSettings.borderWidth,
        exportSettings.predefinedColors
      );
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, exportSettings]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      removeRectangle(selectedId);
    }
  }, [selectedId, removeRectangle]);

  // Use the app core settings handler
  // Settings are now managed by the store directly
  // const handleSettingsChange = appCore.handleSettingsChange;

  // Use the app core import handler
  const handleImport = appCore.handleImport;

  const handleAboutClick = useCallback(() => {
    setAboutModalOpen(true);
    uiActions.closeLeftMenu();
  }, [uiActions]);

  const handleTemplatesClick = useCallback(() => {
    uiActions.openTemplatePage();
    uiActions.closeLeftMenu();
  }, [uiActions]);

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


  const handleClearSavedData = useCallback(() => {
    setClearDataModalOpen(true);
  }, []);

  const handleConfirmClearAll = useCallback(async () => {
    await autoSaveActions.clearData();
    window.location.reload();
  }, [autoSaveActions]);

  const handleConfirmClearModel = useCallback(async () => {
    // Set manual clear flag to prevent auto-restore
    autoSaveActions.setManualClearInProgress(true);
    
    // Clear only rectangles but preserve settings by setting empty rectangles
    setRectanglesWithHistory([]);
    
    // Save the empty state - the saveData method will detect this is a clear and maintain the flag
    await autoSaveActions.saveData();
    
    // Reload the page - auto-restore will be skipped due to manualClearInProgress flag
    window.location.reload();
  }, [autoSaveActions, setRectanglesWithHistory]);

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
        setRectangles={setRectanglesWithHistoryWrapper}
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