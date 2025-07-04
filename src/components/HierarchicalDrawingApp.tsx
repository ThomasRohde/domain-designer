import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Rectangle, DragState, ResizeState, ExportOptions } from '../types';
import { GRID_SIZE, MIN_WIDTH, MIN_HEIGHT, DEFAULT_COLORS, DEFAULT_RECTANGLE_SIZE } from '../utils/constants';
import { exportDiagram } from '../utils/exportUtils';
import { 
  updateChildrenLayout, 
  calculateNewRectangleLayout,
  getAllDescendants,
  getChildren,
  isLeaf,
  getZIndex
} from '../utils/layoutUtils';
import RectangleComponent from './RectangleComponent';
import ColorPalette from './ColorPalette';
import ContextMenu from './ContextMenu';
import Toolbar from './Toolbar';
import ExportModal from './ExportModal';
import GlobalSettings from './GlobalSettings';

const HierarchicalDrawingApp = () => {
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rectangleId: string } | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [leafFixedWidth, setLeafFixedWidth] = useState(false);
  const [leafFixedHeight, setLeafFixedHeight] = useState(false);
  const [leafWidth, setLeafWidth] = useState(DEFAULT_RECTANGLE_SIZE.leaf.w);
  const [leafHeight, setLeafHeight] = useState(DEFAULT_RECTANGLE_SIZE.leaf.h);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to get fixed dimensions settings
  const getFixedDimensions = useCallback(() => ({
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight
  }), [leafFixedWidth, leafFixedHeight, leafWidth, leafHeight]);

  // Generate a unique ID for new rectangles
  const generateId = useCallback(() => {
    const id = `rect-${nextId}`;
    setNextId(prev => prev + 1);
    return id;
  }, [nextId]);

  // Find rectangle by ID
  const findRectangle = useCallback((id: string) => {
    return rectangles.find(rect => rect.id === id);
  }, [rectangles]);

  // Add a new rectangle
  const addRectangle = useCallback((parentId: string | null = null) => {
    const id = generateId();
    
    const { x, y, w, h } = calculateNewRectangleLayout(parentId, rectangles, DEFAULT_RECTANGLE_SIZE);
    
    let color = DEFAULT_COLORS.root; // Default color
    let finalW = w;
    let finalH = h;

    if (parentId) {
      color = DEFAULT_COLORS.leaf;
      // A new rectangle with a parent is always initially a leaf
      const rectType = 'leaf';
      
      // Apply fixed dimensions for leaf nodes if enabled
      if (rectType === 'leaf') {
        if (leafFixedWidth) {
          finalW = leafWidth;
        }
        if (leafFixedHeight) {
          finalH = leafHeight;
        }
      }
    }

    const newRect: Rectangle = {
      id,
      parentId: parentId || undefined,
      x,
      y,
      w: finalW,
      h: finalH,
      label: `Rectangle ${id}`,
      color,
      type: parentId ? 'leaf' : 'root',
    };

    setRectangles(prev => {
      const updated = [...prev, newRect];
      
      // Update parent type if it was a leaf and now has children
      if (parentId) {
        const parentIndex = updated.findIndex(r => r.id === parentId);
        if (parentIndex !== -1) {
          const parent = updated[parentIndex];
          if (parent.type === 'leaf') {
            updated[parentIndex] = { ...parent, type: 'parent' };
          }
        }
      }
      
      return updated;
    });
    setSelectedId(id);
    
    if (parentId) {
      setTimeout(() => {
        setRectangles(prev => updateChildrenLayout(prev, getFixedDimensions()));
      }, 10);
    }
  }, [generateId, rectangles, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight]);

  // Get all descendants of a rectangle (recursive)
  const getAllDescendantsWrapper = useCallback((parentId: string): string[] => {
    return getAllDescendants(parentId, rectangles);
  }, [rectangles]);

  // Remove a rectangle and its children
  const removeRectangle = useCallback((id: string) => {
    const toRemove = [id, ...getAllDescendantsWrapper(id)];
    setRectangles(prev => {
      const updated = prev.filter(rect => !toRemove.includes(rect.id));
      return updated;
    });
    setSelectedId(null);
  }, [getAllDescendantsWrapper]);

  // Update rectangle label
  const updateRectangleLabel = useCallback((id: string, label: string) => {
    setRectangles(prev => 
      prev.map(rect => 
        rect.id === id ? { ...rect, label } : rect
      )
    );
  }, []);

  // Update rectangle color
  const updateRectangleColor = useCallback((id: string, color: string) => {
    setRectangles(prev => {
      const updated = prev.map(rect => 
        rect.id === id ? { 
          ...rect, 
          color
        } : rect
      );
      return updated;
    });
  }, []);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' = 'drag') => {
    e.preventDefault();
    e.stopPropagation();

    if (rect.parentId && action === 'drag') {
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;

    if (action === 'drag') {
      setDragState({
        id: rect.id,
        startX,
        startY,
        initialX: rect.x * gridSize,
        initialY: rect.y * gridSize
      });
    } else if (action === 'resize') {
      setResizeState({
        id: rect.id,
        startX,
        startY,
        initialW: rect.w,
        initialH: rect.h
      });
    }
  }, [gridSize]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState && !resizeState) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    if (dragState) {
      const deltaX = currentX - dragState.startX;
      const deltaY = currentY - dragState.startY;
      const newX = Math.max(0, Math.round((dragState.initialX + deltaX) / gridSize));
      const newY = Math.max(0, Math.round((dragState.initialY + deltaY) / gridSize));

      setRectangles(prev => prev.map(rect => 
        rect.id === dragState.id ? { ...rect, x: newX, y: newY } : rect
      ));
    } else if (resizeState) {
      const deltaX = currentX - resizeState.startX;
      const deltaY = currentY - resizeState.startY;
      const newW = Math.max(MIN_WIDTH, Math.round(resizeState.initialW + deltaX / gridSize));
      const newH = Math.max(MIN_HEIGHT, Math.round(resizeState.initialH + deltaY / gridSize));

      setRectangles(prev => prev.map(rect => 
        rect.id === resizeState.id ? { ...rect, w: newW, h: newH } : rect
      ));
    }
  }, [dragState, resizeState, gridSize]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    const wasDragging = dragState;
    const wasResizing = resizeState;
    
    setDragState(null);
    setResizeState(null);
    
    if ((wasDragging || wasResizing)) {
      const rectId = wasDragging?.id || wasResizing?.id;
      if (rectId) {
        const rect = rectangles.find(r => r.id === rectId);
        if (rect) {
          const hasDescendants = getAllDescendants(rect.id, rectangles).length > 0;
          if (hasDescendants) {
            setTimeout(() => {
              setRectangles(prev => updateChildrenLayout(prev, getFixedDimensions()));
            }, 10);
          }
        }
      }
    }
  }, [dragState, resizeState, rectangles, updateChildrenLayout, getAllDescendants, getFixedDimensions]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rectangleId
    });
  }, []);

  // Handle export
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    
    try {
      await exportDiagram(containerRef.current, rectangles, options, gridSize);
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, gridSize]);

  // Update leaf nodes when settings change
  const handleLeafFixedWidthChange = useCallback((enabled: boolean) => {
    setLeafFixedWidth(enabled);
    if (enabled) {
      // Apply fixed width to all existing leaf nodes
      setRectangles(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, w: leafWidth } : rect
        )
      );
    }
    // Trigger layout update for all children
    setTimeout(() => {
      setRectangles(prev => updateChildrenLayout(prev, {
        leafFixedWidth: enabled,
        leafFixedHeight,
        leafWidth,
        leafHeight
      }));
    }, 10);
  }, [leafWidth, leafFixedHeight, leafHeight]);

  const handleLeafFixedHeightChange = useCallback((enabled: boolean) => {
    setLeafFixedHeight(enabled);
    if (enabled) {
      // Apply fixed height to all existing leaf nodes
      setRectangles(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, h: leafHeight } : rect
        )
      );
    }
    // Trigger layout update for all children
    setTimeout(() => {
      setRectangles(prev => updateChildrenLayout(prev, {
        leafFixedWidth,
        leafFixedHeight: enabled,
        leafWidth,
        leafHeight
      }));
    }, 10);
  }, [leafHeight, leafFixedWidth, leafWidth]);

  const handleLeafWidthChange = useCallback((width: number) => {
    setLeafWidth(width);
    if (leafFixedWidth) {
      // Apply new width to all existing leaf nodes
      setRectangles(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, w: width } : rect
        )
      );
      // Trigger layout update for all children
      setTimeout(() => {
        setRectangles(prev => updateChildrenLayout(prev, {
          leafFixedWidth,
          leafFixedHeight,
          leafWidth: width,
          leafHeight
        }));
      }, 10);
    }
  }, [leafFixedWidth, leafFixedHeight, leafHeight]);

  const handleLeafHeightChange = useCallback((height: number) => {
    setLeafHeight(height);
    if (leafFixedHeight) {
      // Apply new height to all existing leaf nodes
      setRectangles(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, h: height } : rect
        )
      );
      // Trigger layout update for all children
      setTimeout(() => {
        setRectangles(prev => updateChildrenLayout(prev, {
          leafFixedWidth,
          leafFixedHeight,
          leafWidth,
          leafHeight: height
        }));
      }, 10);
    }
  }, [leafFixedHeight, leafFixedWidth, leafWidth]);

  // Add global mouse event listeners
  React.useEffect(() => {
    if (dragState || resizeState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, resizeState, handleMouseMove, handleMouseUp]);

  // Handle responsive sidebar behavior
  React.useEffect(() => {
    const handleResize = () => {
      // Only auto-close sidebar on mobile, don't auto-open on desktop
      if (window.innerWidth < 1024) { // below lg breakpoint
        setSidebarOpen(false);
      }
    };

    // Set initial state - closed by default
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle clicks outside to close context menu
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Calculate canvas size based on viewport and content
  const canvasSize = useMemo(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    const availableWidth = viewportWidth - 32; // Account for padding
    const availableHeight = viewportHeight - 120; // Account for toolbar and padding
    
    if (rectangles.length === 0) {
      return { 
        width: Math.max(availableWidth, 800), 
        height: Math.max(availableHeight, 600) 
      };
    }
    
    const maxX = Math.max(...rectangles.map(r => r.x + r.w));
    const maxY = Math.max(...rectangles.map(r => r.y + r.h));
    
    return {
      width: Math.max(availableWidth, (maxX + 5) * gridSize),
      height: Math.max(availableHeight, (maxY + 5) * gridSize)
    };
  }, [rectangles, gridSize]);

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Toolbar
        onAddRectangle={addRectangle}
        onExport={() => setExportModalOpen(true)}
        selectedId={selectedId}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-2 sm:p-4 overflow-hidden">
            <div className="bg-white rounded-lg shadow-lg overflow-auto h-full w-full canvas-container">
              <div
                ref={containerRef}
                className="relative bg-gray-50 min-w-full min-h-full"
                style={{ 
                  width: canvasSize.width, 
                  height: canvasSize.height,
                  backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
                  backgroundSize: `${gridSize}px ${gridSize}px`
                }}
                onClick={() => setSelectedId(null)}
              >
                {rectangles.map(rect => (
                  <RectangleComponent
                    key={rect.id}
                    rectangle={rect}
                    isSelected={selectedId === rect.id}
                    zIndex={getZIndex(rect, rectangles, selectedId, dragState, resizeState)}
                    onMouseDown={handleMouseDown}
                    onContextMenu={handleContextMenu}
                    onSelect={setSelectedId}
                    onUpdateLabel={updateRectangleLabel}
                    onAddChild={addRectangle}
                    onRemove={removeRectangle}
                    canDrag={!rect.parentId}
                    canResize={!isLeaf(rect.id, rectangles) && !rect.parentId}
                    childCount={getChildren(rect.id, rectangles).length}
                    gridSize={gridSize}
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
              onClick={() => setSidebarOpen(false)}
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
              />
            )}
          </div>
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
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
          onClose={() => setContextMenu(null)}
        />
      )}

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;