import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { ExportOptions } from '../types';
import { exportDiagram } from '../utils/exportUtils';
import { getChildren } from '../utils/layoutUtils';
import { useRectangleManager } from '../hooks/useRectangleManager';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUIState } from '../hooks/useUIState';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppCore } from '../hooks/useAppCore';
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
import TemplatePage from './TemplatePage';

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize hooks
  const uiState = useUIState();
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  
  // Create a ref for triggerSave to avoid circular dependency
  const triggerSaveRef = useRef<(() => void) | null>(null);
  
  // Memoize the pan offset ref to avoid recreating object
  const panOffsetRef = useRef({ x: 0, y: 0 });
  
  // Memoize the triggerSave function
  const triggerSave = useCallback(() => triggerSaveRef.current?.(), []);
  
  // Initialize app settings first  
  const appSettings = useAppSettings();

  // Memoize the getMargins function to avoid inline object creation
  const getMargins = useCallback(() => ({ 
    margin: appSettings.margin, 
    labelMargin: appSettings.labelMargin 
  }), [appSettings.margin, appSettings.labelMargin]);
  
  const rectangleManager = useRectangleManager({
    gridSize: appSettings.gridSize,
    panOffsetRef,
    containerRef,
    getFixedDimensions: appSettings.getFixedDimensions,
    getMargins,
    triggerSave
  });

  // Initialize app core systems
  const appCore = useAppCore({
    rectangles: rectangleManager.rectangles,
    setRectangles: rectangleManager.setRectangles,
    setRectanglesWithHistory: rectangleManager.setRectanglesWithHistory,
    initializeHistory: rectangleManager.initializeHistory,
    updateNextId: rectangleManager.updateNextId,
    nextId: rectangleManager.nextId,
    setSelectedId: rectangleManager.setSelectedId,
    getFixedDimensions: appSettings.getFixedDimensions,
    getMargins,
    appSettings
  });

  // Canvas interactions with proper setSelectedId wrapper
  const setSelectedIdWrapper = useCallback((value: React.SetStateAction<string | null>) => {
    if (typeof value === 'function') {
      rectangleManager.setSelectedId(value(rectangleManager.selectedId));
    } else {
      rectangleManager.setSelectedId(value);
    }
  }, [rectangleManager]);

  const canvasInteractions = useCanvasInteractions({
    rectangles: rectangleManager.rectangles,
    setRectangles: rectangleManager.setRectangles,
    setRectanglesWithHistory: rectangleManager.setRectanglesWithHistory,
    setSelectedId: setSelectedIdWrapper,
    gridSize: appSettings.gridSize,
    leafFixedWidth: appSettings.leafFixedWidth,
    leafFixedHeight: appSettings.leafFixedHeight,
    leafWidth: appSettings.leafWidth,
    leafHeight: appSettings.leafHeight,
    containerRef,
    getFixedDimensions: appSettings.getFixedDimensions,
    getMargins,
    reparentRectangle: rectangleManager.reparentRectangle,
    canReparent: rectangleManager.canReparent,
    saveToHistory: rectangleManager.saveToHistory,
    triggerSave: () => triggerSaveRef.current?.()
  });

  // Connect app settings to rectangle manager
  React.useEffect(() => {
    appSettings.setRectanglesRef(rectangleManager.setRectangles);
    appSettings.setFitToChildrenRef(rectangleManager.fitToChildren);
  }, [rectangleManager.setRectangles, rectangleManager.fitToChildren, appSettings]);

  // Event handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    uiState.showContextMenu(e.clientX, e.clientY, rectangleId);
  }, [uiState]);

  const handleAddRectangle = useCallback((parentId: string | null = null) => {
    rectangleManager.addRectangle(parentId || undefined);
  }, [rectangleManager]);

  // Memoize export settings to avoid recreating object and reduce dependency array
  const exportSettings = useMemo(() => ({
    gridSize: appSettings.gridSize,
    leafFixedWidth: appSettings.leafFixedWidth,
    leafFixedHeight: appSettings.leafFixedHeight,
    leafWidth: appSettings.leafWidth,
    leafHeight: appSettings.leafHeight,
    rootFontSize: appSettings.rootFontSize,
    dynamicFontSizing: appSettings.dynamicFontSizing,
    fontFamily: appSettings.fontFamily,
    borderRadius: appSettings.borderRadius,
    borderColor: appSettings.borderColor,
    borderWidth: appSettings.borderWidth,
    predefinedColors: appSettings.predefinedColors,
    margin: appSettings.margin,
    labelMargin: appSettings.labelMargin,
    layoutAlgorithm: appSettings.layoutAlgorithm
  }), [
    appSettings.gridSize, appSettings.leafFixedWidth, appSettings.leafFixedHeight, 
    appSettings.leafWidth, appSettings.leafHeight, appSettings.rootFontSize, 
    appSettings.dynamicFontSizing, appSettings.fontFamily, appSettings.borderRadius, 
    appSettings.borderColor, appSettings.borderWidth, appSettings.predefinedColors, 
    appSettings.layoutAlgorithm, appSettings.margin, appSettings.labelMargin
  ]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    try {
      await exportDiagram(
        containerRef.current, 
        rectangleManager.rectangles, 
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
  }, [rectangleManager.rectangles, exportSettings]);

  const handleDeleteSelected = useCallback(() => {
    if (rectangleManager.selectedId) {
      rectangleManager.removeRectangle(rectangleManager.selectedId);
    }
  }, [rectangleManager]);

  // Use the app core settings handler
  const handleSettingsChange = appCore.handleSettingsChange;

  // Use the app core import handler
  const handleImport = appCore.handleImport;

  const handleAboutClick = useCallback(() => {
    setAboutModalOpen(true);
    uiState.closeLeftMenu();
  }, [uiState]);

  const handleTemplatesClick = useCallback(() => {
    uiState.openTemplatePage();
    uiState.closeLeftMenu();
  }, [uiState]);

  const handleLockConfirmation = useCallback(() => {
    if (uiState.lockConfirmationModal) {
      rectangleManager.toggleManualPositioning(uiState.lockConfirmationModal.rectangleId);
    }
  }, [uiState.lockConfirmationModal, rectangleManager]);

  const handleLockAsIs = useCallback(() => {
    if (uiState.lockConfirmationModal) {
      rectangleManager.lockAsIs(uiState.lockConfirmationModal.rectangleId);
    }
  }, [uiState.lockConfirmationModal, rectangleManager]);

  const handleEditDescription = useCallback((rectangleId: string) => {
    const rectangle = rectangleManager.findRectangle(rectangleId);
    if (rectangle) {
      uiState.showDescriptionEditModal(rectangleId, rectangle.label, rectangle.description || '');
    }
  }, [rectangleManager, uiState]);

  const handleSaveDescription = useCallback((description: string) => {
    if (uiState.descriptionEditModal) {
      rectangleManager.updateRectangleDescription(uiState.descriptionEditModal.rectangleId, description);
    }
  }, [rectangleManager, uiState.descriptionEditModal]);


  // Memoized calculations
  const selectedRectangle = useMemo(() => 
    rectangleManager.selectedId ? rectangleManager.findRectangle(rectangleManager.selectedId) || null : null,
    [rectangleManager]
  );

  const selectedChildCount = useMemo(() =>
    rectangleManager.selectedId ? getChildren(rectangleManager.selectedId, rectangleManager.rectangles).length : 0,
    [rectangleManager]
  );


  // Use the auto-save system
  const autoSaveManager = appCore.autoSave;
  
  // Set the triggerSave ref
  useEffect(() => {
    triggerSaveRef.current = autoSaveManager.save;
  }, [autoSaveManager.save]);

  const handleClearSavedData = useCallback(async () => {
    if (confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
      await autoSaveManager.clearData();
    }
  }, [autoSaveManager]);

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
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveManager?: typeof autoSaveManager }).testIndexedDB = testIndexedDB;
    (window as Window & typeof globalThis & { testIndexedDB?: typeof testIndexedDB; autoSaveManager?: typeof autoSaveManager }).autoSaveManager = autoSaveManager;
  }, [testIndexedDB, autoSaveManager]);

  // Arrow key movement handlers with pixel-level precision
  const handleMoveUp = useCallback((deltaPixels: number) => {
    if (!rectangleManager.selectedId) return;
    canvasInteractions.startKeyboardMovement();
    rectangleManager.moveRectangle(rectangleManager.selectedId, 0, -deltaPixels);
  }, [rectangleManager, canvasInteractions]);

  const handleMoveDown = useCallback((deltaPixels: number) => {
    if (!rectangleManager.selectedId) return;
    canvasInteractions.startKeyboardMovement();
    rectangleManager.moveRectangle(rectangleManager.selectedId, 0, deltaPixels);
  }, [rectangleManager, canvasInteractions]);

  const handleMoveLeft = useCallback((deltaPixels: number) => {
    if (!rectangleManager.selectedId) return;
    canvasInteractions.startKeyboardMovement();
    rectangleManager.moveRectangle(rectangleManager.selectedId, -deltaPixels, 0);
  }, [rectangleManager, canvasInteractions]);

  const handleMoveRight = useCallback((deltaPixels: number) => {
    if (!rectangleManager.selectedId) return;
    canvasInteractions.startKeyboardMovement();
    rectangleManager.moveRectangle(rectangleManager.selectedId, deltaPixels, 0);
  }, [rectangleManager, canvasInteractions]);

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: rectangleManager.undo,
    onRedo: rectangleManager.redo,
    onDelete: handleDeleteSelected,
    onCancel: canvasInteractions.cancelDrag,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    onMoveLeft: handleMoveLeft,
    onMoveRight: handleMoveRight,
  }), [rectangleManager.undo, rectangleManager.redo, handleDeleteSelected, canvasInteractions.cancelDrag, handleMoveUp, handleMoveDown, handleMoveLeft, handleMoveRight]));

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden select-none">
      <Toolbar
        onAddRectangle={handleAddRectangle}
        onExport={uiState.openExportModal}
        onImport={handleImport}
        selectedId={rectangleManager.selectedId}
        onToggleSidebar={uiState.toggleSidebar}
        sidebarOpen={uiState.sidebarOpen}
        onToggleLeftMenu={uiState.toggleLeftMenu}
        leftMenuOpen={uiState.leftMenuOpen}
        lastSaved={autoSaveManager.lastSaved}
        autoSaveEnabled={autoSaveManager.isAutoSaveEnabled}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftMenu
          isOpen={uiState.leftMenuOpen}
          onClose={uiState.closeLeftMenu}
          onAboutClick={handleAboutClick}
          onTemplatesClick={handleTemplatesClick}
          onHelpClick={uiState.openHelpModal}
          onClearSavedData={handleClearSavedData}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            gridSize={appCore.appSettings.gridSize}
            panOffset={canvasInteractions.panOffset}
            isSpacePressed={canvasInteractions.isSpacePressed}
            panState={canvasInteractions.panState}
            hierarchyDragState={canvasInteractions.hierarchyDragState}
            zoomState={canvasInteractions.zoomState}
            onMouseDown={canvasInteractions.handleCanvasMouseDown}
            onSelect={rectangleManager.setSelectedId}
            overlay={
              <ActionButtonsOverlay
                selectedRectangle={selectedRectangle}
                childCount={selectedChildCount}
                onAddChild={handleAddRectangle}
                onRemove={rectangleManager.removeRectangle}
                onFitToChildren={rectangleManager.fitToChildren}
                onToggleManualPositioning={rectangleManager.toggleManualPositioning}
                onShowLockConfirmation={uiState.showLockConfirmationModal}
                gridSize={appCore.appSettings.gridSize}
                isDragging={canvasInteractions.isDragging}
                isResizing={canvasInteractions.isResizing}
                isHierarchyDragging={canvasInteractions.isHierarchyDragging}
                isKeyboardMoving={canvasInteractions.isKeyboardMoving}
              />
            }
          >
            <RectangleRenderer
              rectangles={rectangleManager.rectangles}
              selectedId={rectangleManager.selectedId}
              dragState={canvasInteractions.dragState}
              resizeState={canvasInteractions.resizeState}
              hierarchyDragState={canvasInteractions.hierarchyDragState}
              resizeConstraintState={canvasInteractions.resizeConstraintState}
              gridSize={appCore.appSettings.gridSize}
              onMouseDown={canvasInteractions.handleRectangleMouseDown}
              onContextMenu={handleContextMenu}
              onSelect={rectangleManager.setSelectedId}
              onUpdateLabel={rectangleManager.updateRectangleLabel}
              onAddChild={rectangleManager.addRectangle}
              onRemove={rectangleManager.removeRectangle}
              onFitToChildren={rectangleManager.fitToChildren}
              calculateFontSize={appCore.appSettings.calculateFontSize}
              fontFamily={appCore.appSettings.fontFamily}
              borderRadius={appCore.appSettings.borderRadius}
              borderColor={appCore.appSettings.borderColor}
              borderWidth={appCore.appSettings.borderWidth}
            />
          </Canvas>
        </div>

        <Sidebar isOpen={uiState.sidebarOpen} onClose={uiState.closeSidebar}>
          <PropertyPanel
            selectedId={rectangleManager.selectedId}
            selectedRectangle={selectedRectangle}
            rectangles={rectangleManager.rectangles}
            onColorChange={rectangleManager.updateRectangleColor}
            onLayoutPreferencesChange={rectangleManager.updateRectangleLayoutPreferences}
            appSettings={appSettings}
            onSettingsChange={(settings) => handleSettingsChange(settings)}
            onUpdateColorSquare={appCore.appSettings.updateColorSquare}
          />
        </Sidebar>
      </div>

      {uiState.contextMenu && (
        <ContextMenu
          x={uiState.contextMenu.x}
          y={uiState.contextMenu.y}
          rectangleId={uiState.contextMenu.rectangleId}
          onAddChild={rectangleManager.addRectangle}
          onRemove={rectangleManager.removeRectangle}
          onEditDescription={handleEditDescription}
          onClose={uiState.hideContextMenu}
        />
      )}

      <ExportModal
        isOpen={uiState.exportModalOpen}
        onClose={uiState.closeExportModal}
        onExport={handleExport}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <HelpModal
        isOpen={uiState.helpModalOpen}
        onClose={uiState.closeHelpModal}
      />

      <LockConfirmationModal
        isOpen={!!uiState.lockConfirmationModal}
        onClose={uiState.hideLockConfirmationModal}
        onConfirm={handleLockConfirmation}
        onConfirmLockAsIs={handleLockAsIs}
        rectangleLabel={uiState.lockConfirmationModal?.rectangleLabel || ''}
      />

      <DescriptionEditModal
        isOpen={!!uiState.descriptionEditModal}
        onClose={uiState.hideDescriptionEditModal}
        onSave={handleSaveDescription}
        rectangleId={uiState.descriptionEditModal?.rectangleId || ''}
        rectangleLabel={uiState.descriptionEditModal?.rectangleLabel || ''}
        currentDescription={uiState.descriptionEditModal?.currentDescription || ''}
      />

      <TemplatePage
        isOpen={uiState.templatePageOpen}
        onClose={uiState.closeTemplatePage}
        rectangles={rectangleManager.rectangles}
        setRectangles={rectangleManager.setRectanglesWithHistory}
        fitToChildren={rectangleManager.fitToChildren}
        predefinedColors={appCore.appSettings.predefinedColors}
        globalSettings={{
          gridSize: appCore.appSettings.gridSize,
          leafWidth: appCore.appSettings.leafWidth,
          leafHeight: appCore.appSettings.leafHeight,
          leafFixedWidth: appCore.appSettings.leafFixedWidth,
          leafFixedHeight: appCore.appSettings.leafFixedHeight
        }}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;