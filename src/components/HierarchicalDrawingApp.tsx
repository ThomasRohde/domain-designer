import React, { useCallback, useRef, useMemo, useState } from 'react';
import { ExportOptions, AppSettings } from '../types';
import { exportDiagram, importDiagramFromJSON, ImportedDiagramData } from '../utils/exportUtils';
import { getChildren } from '../utils/layoutUtils';
import { useRectangleManager } from '../hooks/useRectangleManager';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUIState } from '../hooks/useUIState';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
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

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize hooks
  const uiState = useUIState();
  const appSettings = useAppSettings();
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const rectangleManager = useRectangleManager({
    gridSize: appSettings.gridSize,
    panOffsetRef: { current: { x: 0, y: 0 } },
    containerRef,
    getFixedDimensions: appSettings.getFixedDimensions
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
    reparentRectangle: rectangleManager.reparentRectangle,
    canReparent: rectangleManager.canReparent
  });

  // Connect app settings to rectangle manager
  React.useEffect(() => {
    appSettings.setRectanglesRef(rectangleManager.setRectangles);
  }, [rectangleManager.setRectangles, appSettings]);

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
        borderWidth: appSettings.borderWidth
      };
      
      await exportDiagram(
        containerRef.current, 
        rectangleManager.rectangles, 
        options, 
        globalSettings,
        appSettings.gridSize,
        appSettings.borderRadius,
        appSettings.borderColor,
        appSettings.borderWidth
      );
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangleManager.rectangles, appSettings.gridSize, appSettings.leafFixedWidth, appSettings.leafFixedHeight, appSettings.leafWidth, appSettings.leafHeight, appSettings.rootFontSize, appSettings.dynamicFontSizing, appSettings.borderRadius, appSettings.borderColor, appSettings.borderWidth]);

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
        
        // Update rectangles
        rectangleManager.setRectangles(importedData.rectangles);
        
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
  }), [appSettings]);

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: rectangleManager.undo,
    onRedo: rectangleManager.redo,
    onDelete: handleDeleteSelected,
  }), [rectangleManager.undo, rectangleManager.redo, handleDeleteSelected]));

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
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftMenu
          isOpen={uiState.leftMenuOpen}
          onClose={uiState.closeLeftMenu}
          onAboutClick={handleAboutClick}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            gridSize={appSettings.gridSize}
            panOffset={canvasInteractions.panOffset}
            isSpacePressed={canvasInteractions.isSpacePressed}
            panState={canvasInteractions.panState}
            hierarchyDragState={canvasInteractions.hierarchyDragState}
            onMouseDown={canvasInteractions.handleCanvasMouseDown}
            onSelect={rectangleManager.setSelectedId}
            overlay={
              <ActionButtonsOverlay
                selectedRectangle={selectedRectangle}
                childCount={selectedChildCount}
                onAddChild={handleAddRectangle}
                onRemove={rectangleManager.removeRectangle}
                onFitToChildren={rectangleManager.fitToChildren}
                gridSize={appSettings.gridSize}
                panOffset={canvasInteractions.panOffset}
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
              gridSize={appSettings.gridSize}
              panOffset={canvasInteractions.panOffset}
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
            appSettings={appSettingsObject}
            onSettingsChange={handleSettingsChange}
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
    </div>
  );
};

export default HierarchicalDrawingApp;