import React, { useCallback, useRef } from 'react';
import { ExportOptions } from '../types';
import { exportDiagram } from '../utils/exportUtils';
import { 
  getChildren,
  getZIndex,
} from '../utils/layoutUtils';
import { useRectangleManager } from '../hooks/useRectangleManager';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUIState } from '../hooks/useUIState';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import RectangleComponent from './RectangleComponent';
import ColorPalette from './ColorPalette';
import ContextMenu from './ContextMenu';
import Toolbar from './Toolbar';
import ExportModal from './ExportModal';
import GlobalSettings from './GlobalSettings';

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
    setRectangles
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

  // Handle export
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    
    try {
      await exportDiagram(containerRef.current, rectangles, options, gridSize);
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, gridSize]);

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
          <div className="flex-1 p-2 sm:p-4 overflow-hidden">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full w-full canvas-container">
              <div
                ref={containerRef}
                className={`relative bg-gray-50 w-full h-full ${isSpacePressed ? 'cursor-grab' : ''} ${panState ? 'cursor-grabbing' : ''}`}
                style={{ 
                  backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                  backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
                }}
                onClick={() => setSelectedId(null)}
                onMouseDown={handleCanvasMouseDown}
              >
                {rectangles.map(rect => (
                  <RectangleComponent
                    key={rect.id}
                    rectangle={rect} // Pass original rectangle
                    isSelected={selectedId === rect.id}
                    zIndex={getZIndex(rect, rectangles, selectedId, dragState, resizeState)}
                    onMouseDown={handleRectangleMouseDown}
                    onContextMenu={handleContextMenu}
                    onSelect={setSelectedId}
                    onUpdateLabel={updateRectangleLabel}
                    onAddChild={addRectangle}
                    onRemove={removeRectangle}
                    onFitToChildren={fitToChildren}
                    canDrag={!rect.parentId}
                    canResize={!rect.parentId} // Allow resizing for all root nodes (regardless of children)
                    childCount={getChildren(rect.id, rectangles).length}
                    gridSize={gridSize}
                    fontSize={calculateFontSize(rect.id, rectangles)}
                    panOffset={panOffset} // Pass pan offset separately
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          fixed lg:fixed
          top-16 right-0 bottom-0 z-40
          w-80 bg-gray-50 shadow-xl
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}>
          {/* Mobile close button */}
          <div className="lg:hidden p-4 border-b bg-white">
            <button
              onClick={closeSidebar}
              className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900"
            >
              <span className="font-medium">Properties</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {selectedId ? (
              // Node is selected: Show color picker and node details
              <>
                <ColorPalette
                  selectedColor={findRectangle(selectedId)?.color}
                  onColorChange={(color) => updateRectangleColor(selectedId, color)}
                />

                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-2 text-sm lg:text-base">Selected: {selectedId}</h3>
                  <div className="text-xs lg:text-sm text-gray-600 space-y-1">
                    {(() => {
                      const rect = findRectangle(selectedId);
                      if (!rect) return null;
                      const children = getChildren(selectedId, rectangles);
                      return (
                        <div>
                          <div>Position: ({rect.x}, {rect.y})</div>
                          <div>Size: {rect.w} × {rect.h}</div>
                          <div>Children: {children.length}</div>
                          <div>Type: {rect.parentId ? 'Child' : 'Root'}</div>
                          <div>Color: {rect.color}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            ) : (
              // No node selected: Show global settings
              <GlobalSettings
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                leafFixedWidth={leafFixedWidth}
                onLeafFixedWidthChange={handleLeafFixedWidthChange}
                leafFixedHeight={leafFixedHeight}
                onLeafFixedHeightChange={handleLeafFixedHeightChange}
                leafWidth={leafWidth}
                onLeafWidthChange={handleLeafWidthChange}
                leafHeight={leafHeight}
                onLeafHeightChange={handleLeafHeightChange}
                rootFontSize={rootFontSize}
                onRootFontSizeChange={handleRootFontSizeChange}
                dynamicFontSizing={dynamicFontSizing}
                onDynamicFontSizingChange={handleDynamicFontSizingChange}
              />
            )}
          </div>
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={closeSidebar}
          />
        )}
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