import React, { useCallback, useRef, useMemo } from 'react';
import { ExportOptions, AppSettings } from '../types';
import { exportDiagram } from '../utils/exportUtils';
import { 
  getChildren,
} from '../utils/layoutUtils';
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

const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the UI state hook
  const {
    sidebarOpen,
    contextMenu,
    exportModalOpen,
    toggleSidebar,
    closeSidebar,
    showContextMenu,
    hideContextMenu,
    openExportModal,
    closeExportModal,
  } = useUIState();

  // Use the app settings hook
  const {
    gridSize,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    rootFontSize,
    dynamicFontSizing,
    getFixedDimensions,
    calculateFontSize,
    handleLeafFixedWidthChange,
    handleLeafFixedHeightChange,
    handleLeafWidthChange,
    handleLeafHeightChange,
    handleRootFontSizeChange,
    handleDynamicFontSizingChange,
    setGridSize,
    setRectanglesRef
  } = useAppSettings();

  // Use the rectangle manager hook first
  const {
    rectangles,
    selectedId,
    setSelectedId,
    findRectangle,
    addRectangle: addRectangleHook,
    removeRectangle,
    updateRectangleLabel,
    updateRectangleColor,
    fitToChildren,
    setRectangles,
    setRectanglesWithHistory,
    undo,
    redo
  } = useRectangleManager({
    gridSize,
    panOffsetRef: { current: { x: 0, y: 0 } }, // Will be updated by canvas interactions
    containerRef,
    getFixedDimensions
  });

  // Create a wrapper for setSelectedId to match React Dispatch signature
  const setSelectedIdWrapper = useCallback((value: React.SetStateAction<string | null>) => {
    if (typeof value === 'function') {
      setSelectedId(value(selectedId));
    } else {
      setSelectedId(value);
    }
  }, [setSelectedId, selectedId]);

  // Use the coordinated canvas interactions hook
  const {
    panOffset,
    panOffsetRef,
    isSpacePressed,
    dragState,
    resizeState,
    panState,
    handleCanvasMouseDown,
    handleRectangleMouseDown,
  } = useCanvasInteractions({
    rectangles,
    setRectangles,
    setRectanglesWithHistory,
    setSelectedId: setSelectedIdWrapper,
    gridSize,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    containerRef,
    getFixedDimensions
  });

  // Update the rectangle manager with the actual panOffsetRef
  React.useEffect(() => {
    // This is a workaround to update the panOffsetRef used by useRectangleManager
    // In a future refactor, we should pass panOffsetRef directly
  }, [panOffsetRef]);

  // Connect the app settings hook to the rectangle manager's setRectangles
  React.useEffect(() => {
    setRectanglesRef(setRectangles);
  }, [setRectangles, setRectanglesRef]);

  // Wrapper function to match Toolbar's expected signature
  const addRectangle = useCallback((parentId: string | null = null) => {
    addRectangleHook(parentId || undefined);
  }, [addRectangleHook]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, rectangleId);
  }, [showContextMenu]);

  // Handle settings changes for PropertyPanel
  const handleSettingsChange = useCallback((settings: Partial<AppSettings>) => {
    if (settings.gridSize !== undefined) {
      setGridSize(settings.gridSize);
    }
    if (settings.leafFixedWidth !== undefined) {
      handleLeafFixedWidthChange(settings.leafFixedWidth);
    }
    if (settings.leafFixedHeight !== undefined) {
      handleLeafFixedHeightChange(settings.leafFixedHeight);
    }
    if (settings.leafWidth !== undefined) {
      handleLeafWidthChange(settings.leafWidth);
    }
    if (settings.leafHeight !== undefined) {
      handleLeafHeightChange(settings.leafHeight);
    }
    if (settings.rootFontSize !== undefined) {
      handleRootFontSizeChange(settings.rootFontSize);
    }
    if (settings.dynamicFontSizing !== undefined) {
      handleDynamicFontSizingChange(settings.dynamicFontSizing);
    }
  }, [
    setGridSize,
    handleLeafFixedWidthChange,
    handleLeafFixedHeightChange,
    handleLeafWidthChange,
    handleLeafHeightChange,
    handleRootFontSizeChange,
    handleDynamicFontSizingChange,
  ]);

  // Handle export
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    
    try {
      await exportDiagram(containerRef.current, rectangles, options, gridSize);
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, gridSize]);

  // Handle delete selected rectangle
  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      removeRectangle(selectedId);
    }
  }, [selectedId, removeRectangle]);

  // Setup keyboard shortcuts (memoized to prevent re-creating the object on every render)
  const keyboardShortcuts = useMemo(() => ({
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteSelected,
    // TODO: Implement other shortcuts like save/load/copy/paste
  }), [undo, redo, handleDeleteSelected]);

  useKeyboardShortcuts(keyboardShortcuts);

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Toolbar
        onAddRectangle={addRectangle}
        onExport={openExportModal}
        selectedId={selectedId}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            gridSize={gridSize}
            panOffset={panOffset}
            isSpacePressed={isSpacePressed}
            panState={panState}
            onMouseDown={handleCanvasMouseDown}
            onSelect={setSelectedId}
            overlay={
              <ActionButtonsOverlay
                selectedRectangle={selectedId ? findRectangle(selectedId) || null : null}
                childCount={selectedId ? getChildren(selectedId, rectangles).length : 0}
                onAddChild={addRectangle}
                onRemove={removeRectangle}
                onFitToChildren={fitToChildren}
                gridSize={gridSize}
                panOffset={panOffset}
              />
            }
          >
            <RectangleRenderer
              rectangles={rectangles}
              selectedId={selectedId}
              dragState={dragState}
              resizeState={resizeState}
              gridSize={gridSize}
              panOffset={panOffset}
              onMouseDown={handleRectangleMouseDown}
              onContextMenu={handleContextMenu}
              onSelect={setSelectedId}
              onUpdateLabel={updateRectangleLabel}
              onAddChild={addRectangle}
              onRemove={removeRectangle}
              onFitToChildren={fitToChildren}
              calculateFontSize={calculateFontSize}
            />
          </Canvas>
        </div>

        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar}>
          <PropertyPanel
            selectedId={selectedId}
            selectedRectangle={selectedId ? findRectangle(selectedId) || null : null}
            rectangles={rectangles}
            onColorChange={updateRectangleColor}
            appSettings={{
              gridSize,
              leafFixedWidth,
              leafFixedHeight,
              leafWidth,
              leafHeight,
              rootFontSize,
              dynamicFontSizing,
            }}
            onSettingsChange={handleSettingsChange}
          />
        </Sidebar>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          rectangleId={contextMenu.rectangleId}
          onAddChild={addRectangle}
          onRemove={removeRectangle}
          onClose={hideContextMenu}
        />
      )}

      <ExportModal
        isOpen={exportModalOpen}
        onClose={closeExportModal}
        onExport={handleExport}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;