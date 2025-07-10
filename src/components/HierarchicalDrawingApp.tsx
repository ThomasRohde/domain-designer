import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { ExportOptions, AppSettings } from '../types';
import { exportDiagram, importDiagramFromJSON, ImportedDiagramData, processImportedDiagram } from '../utils/exportUtils';
import { getChildren } from '../utils/layoutUtils';
import { useRectangleManager } from '../hooks/useRectangleManager';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUIState } from '../hooks/useUIState';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAutoSaveManager } from '../hooks/useAutoSaveManager';
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
import LockConfirmationModal from './LockConfirmationModal';
import TemplatePage from './TemplatePage';

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize hooks
  const uiState = useUIState();
  const appSettings = useAppSettings();
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  
  // Create a ref for triggerSave to avoid circular dependency
  const triggerSaveRef = useRef<(() => void) | null>(null);
  
  const rectangleManager = useRectangleManager({
    gridSize: appSettings.gridSize,
    panOffsetRef: { current: { x: 0, y: 0 } },
    containerRef,
    getFixedDimensions: appSettings.getFixedDimensions,
    getMargins: () => ({ margin: appSettings.margin, labelMargin: appSettings.labelMargin }),
    triggerSave: () => triggerSaveRef.current?.()
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
    getMargins: () => ({ margin: appSettings.margin, labelMargin: appSettings.labelMargin }),
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

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    try {
      const globalSettings = {
        gridSize: appSettings.gridSize,
        leafFixedWidth: appSettings.leafFixedWidth,
        leafFixedHeight: appSettings.leafFixedHeight,
        leafWidth: appSettings.leafWidth,
        leafHeight: appSettings.leafHeight,
        rootFontSize: appSettings.rootFontSize,
        dynamicFontSizing: appSettings.dynamicFontSizing,
        borderRadius: appSettings.borderRadius,
        borderColor: appSettings.borderColor,
        borderWidth: appSettings.borderWidth,
        predefinedColors: appSettings.predefinedColors,
        margin: appSettings.margin,
        labelMargin: appSettings.labelMargin,
        layoutAlgorithm: appSettings.layoutAlgorithm
      };
      
      await exportDiagram(
        containerRef.current, 
        rectangleManager.rectangles, 
        options, 
        globalSettings,
        appSettings.gridSize,
        appSettings.borderRadius,
        appSettings.borderColor,
        appSettings.borderWidth,
        appSettings.predefinedColors
      );
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangleManager.rectangles, appSettings.gridSize, appSettings.leafFixedWidth, appSettings.leafFixedHeight, appSettings.leafWidth, appSettings.leafHeight, appSettings.rootFontSize, appSettings.dynamicFontSizing, appSettings.borderRadius, appSettings.borderColor, appSettings.borderWidth, appSettings.predefinedColors, appSettings.layoutAlgorithm, appSettings.margin, appSettings.labelMargin]);

  const handleDeleteSelected = useCallback(() => {
    if (rectangleManager.selectedId) {
      rectangleManager.removeRectangle(rectangleManager.selectedId);
    }
  }, [rectangleManager]);

  const handleSettingsChange = useCallback((settings: Partial<AppSettings>) => {
    if (settings.gridSize !== undefined) appSettings.setGridSize(settings.gridSize);
    if (settings.leafFixedWidth !== undefined) appSettings.handleLeafFixedWidthChange(settings.leafFixedWidth);
    if (settings.leafFixedHeight !== undefined) appSettings.handleLeafFixedHeightChange(settings.leafFixedHeight);
    if (settings.leafWidth !== undefined) appSettings.handleLeafWidthChange(settings.leafWidth);
    if (settings.leafHeight !== undefined) appSettings.handleLeafHeightChange(settings.leafHeight);
    if (settings.rootFontSize !== undefined) appSettings.handleRootFontSizeChange(settings.rootFontSize);
    if (settings.dynamicFontSizing !== undefined) appSettings.handleDynamicFontSizingChange(settings.dynamicFontSizing);
    if (settings.borderRadius !== undefined) appSettings.handleBorderRadiusChange(settings.borderRadius);
    if (settings.borderColor !== undefined) appSettings.handleBorderColorChange(settings.borderColor);
    if (settings.borderWidth !== undefined) appSettings.handleBorderWidthChange(settings.borderWidth);
    if (settings.predefinedColors !== undefined) appSettings.handlePredefinedColorsChange(settings.predefinedColors);
    if (settings.margin !== undefined) appSettings.handleMarginChange(settings.margin);
    if (settings.labelMargin !== undefined) appSettings.handleLabelMarginChange(settings.labelMargin);
    if (settings.layoutAlgorithm !== undefined) appSettings.handleLayoutAlgorithmChange(settings.layoutAlgorithm);
  }, [appSettings]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        // Process imported data with comprehensive validation and fixing
        const { rectangles: processedRectangles, nextId: newNextId } = processImportedDiagram(
          importedData, 
          rectangleManager.nextId
        );
        
        // Update rectangles with processed data
        rectangleManager.setRectanglesWithHistory(processedRectangles);
        
        // Update the nextId counter to prevent ID conflicts
        rectangleManager.updateNextId(newNextId);
        
        // Update global settings if available
        if (importedData.globalSettings) {
          handleSettingsChange(importedData.globalSettings);
        }
        
        // Clear selection
        rectangleManager.setSelectedId(null);
        
        console.log('Successfully imported diagram from JSON');
      } catch (error) {
        console.error('Failed to import diagram:', error);
        alert(`Failed to import diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  }, [rectangleManager, handleSettingsChange]);

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


  // Memoized calculations
  const selectedRectangle = useMemo(() => 
    rectangleManager.selectedId ? rectangleManager.findRectangle(rectangleManager.selectedId) || null : null,
    [rectangleManager]
  );

  const selectedChildCount = useMemo(() =>
    rectangleManager.selectedId ? getChildren(rectangleManager.selectedId, rectangleManager.rectangles).length : 0,
    [rectangleManager]
  );

  const appSettingsObject = useMemo(() => ({
    gridSize: appSettings.gridSize,
    leafFixedWidth: appSettings.leafFixedWidth,
    leafFixedHeight: appSettings.leafFixedHeight,
    leafWidth: appSettings.leafWidth,
    leafHeight: appSettings.leafHeight,
    rootFontSize: appSettings.rootFontSize,
    dynamicFontSizing: appSettings.dynamicFontSizing,
    borderRadius: appSettings.borderRadius,
    borderColor: appSettings.borderColor,
    borderWidth: appSettings.borderWidth,
    predefinedColors: appSettings.predefinedColors,
    margin: appSettings.margin,
    labelMargin: appSettings.labelMargin,
    layoutAlgorithm: appSettings.layoutAlgorithm,
  }), [appSettings]);

  // Auto-save manager
  const autoSaveManager = useAutoSaveManager({
    rectangles: rectangleManager.rectangles,
    appSettings: appSettingsObject,
    onRestore: useCallback((rectangles, settings) => {
      console.log('Restoring', rectangles.length, 'rectangles');
      // Clear selection first to avoid issues
      rectangleManager.setSelectedId(null);
      // Replace all rectangles with restored data
      rectangleManager.setRectangles(rectangles);
      handleSettingsChange(settings);
    }, [rectangleManager, handleSettingsChange])
  });
  
  // Set the triggerSave ref
  useEffect(() => {
    triggerSaveRef.current = autoSaveManager.triggerSave;
  }, [autoSaveManager.triggerSave]);

  const handleClearSavedData = useCallback(async () => {
    if (confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
      await autoSaveManager.clearSavedState();
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

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: rectangleManager.undo,
    onRedo: rectangleManager.redo,
    onDelete: handleDeleteSelected,
    onCancel: canvasInteractions.cancelDrag,
  }), [rectangleManager.undo, rectangleManager.redo, handleDeleteSelected, canvasInteractions.cancelDrag]));

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
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
        autoSaveEnabled={autoSaveManager.autoSaveEnabled}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftMenu
          isOpen={uiState.leftMenuOpen}
          onClose={uiState.closeLeftMenu}
          onAboutClick={handleAboutClick}
          onTemplatesClick={handleTemplatesClick}
          onClearSavedData={handleClearSavedData}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            gridSize={appSettings.gridSize}
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
                gridSize={appSettings.gridSize}
                isDragging={canvasInteractions.isDragging}
                isResizing={canvasInteractions.isResizing}
                isHierarchyDragging={canvasInteractions.isHierarchyDragging}
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
              gridSize={appSettings.gridSize}
              onMouseDown={canvasInteractions.handleRectangleMouseDown}
              onContextMenu={handleContextMenu}
              onSelect={rectangleManager.setSelectedId}
              onUpdateLabel={rectangleManager.updateRectangleLabel}
              onAddChild={rectangleManager.addRectangle}
              onRemove={rectangleManager.removeRectangle}
              onFitToChildren={rectangleManager.fitToChildren}
              calculateFontSize={appSettings.calculateFontSize}
              borderRadius={appSettings.borderRadius}
              borderColor={appSettings.borderColor}
              borderWidth={appSettings.borderWidth}
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
            appSettings={appSettingsObject}
            onSettingsChange={handleSettingsChange}
            onAddCustomColor={appSettings.addCustomColor}
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

      <LockConfirmationModal
        isOpen={!!uiState.lockConfirmationModal}
        onClose={uiState.hideLockConfirmationModal}
        onConfirm={handleLockConfirmation}
        rectangleLabel={uiState.lockConfirmationModal?.rectangleLabel || ''}
      />

      <TemplatePage
        isOpen={uiState.templatePageOpen}
        onClose={uiState.closeTemplatePage}
        rectangles={rectangleManager.rectangles}
        setRectangles={rectangleManager.setRectanglesWithHistory}
        fitToChildren={rectangleManager.fitToChildren}
        predefinedColors={appSettings.predefinedColors}
        globalSettings={{
          gridSize: appSettings.gridSize,
          leafWidth: appSettings.leafWidth,
          leafHeight: appSettings.leafHeight,
          leafFixedWidth: appSettings.leafFixedWidth,
          leafFixedHeight: appSettings.leafFixedHeight
        }}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;