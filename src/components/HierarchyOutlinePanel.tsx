import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, X, FolderTree } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import HierarchyTreeView from './HierarchyTreeView';
import MobileOverlay from './MobileOverlay';

/**
 * Hierarchy Outline Panel component providing interactive tree navigation
 * and instant search functionality for the rectangle hierarchy.
 * 
 * Features:
 * - Interactive tree view with expand/collapse functionality
 * - Real-time search filtering by label and description
 * - Click-to-select rectangle navigation
 * - Text label prioritization (displayed at top of each level)
 * - Responsive mobile overlay behavior
 * - Multiple dismissal methods (click outside, X button, menu toggle)
 */
const HierarchyOutlinePanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  
  // Store state and actions
  const isOpen = useAppStore(state => state.ui.hierarchyOutlineOpen);
  const rectangles = useAppStore(state => state.rectangles);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
  const gridSize = useAppStore(state => state.settings.gridSize);
  const closePanel = useAppStore(state => state.uiActions.closeHierarchyOutline);
  const setSelectedIds = useAppStore(state => state.rectangleActions.setSelectedIds);
  const jumpToPosition = useAppStore(state => state.canvasActions.jumpToPosition);

  // Handle rectangle selection from tree
  const handleRectangleSelect = useCallback((rectangleId: string) => {
    setSelectedIds([rectangleId]);
    
    // Find the selected rectangle and pan to center it in view
    const rectangle = rectangles.find(rect => rect.id === rectangleId);
    if (rectangle) {
      // Calculate rectangle center position in pixels
      // Convert grid coordinates to pixels and find center point
      const centerX = (rectangle.x + rectangle.w / 2) * gridSize;
      const centerY = (rectangle.y + rectangle.h / 2) * gridSize;
      
      // Jump to position to center the rectangle in viewport
      jumpToPosition(centerX, centerY);
    }
    
    if (window.innerWidth < 1024) {
      closePanel();
    }
  }, [setSelectedIds, rectangles, gridSize, jumpToPosition, closePanel]);

  // Handle search input with debouncing
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearchIndex(0);
  }, []);

  // Stats for the header
  const stats = useMemo(() => {
    const total = rectangles.length;
    const textLabels = rectangles.filter(r => r.isTextLabel).length;
    const roots = rectangles.filter(r => !r.parentId).length;
    return { total, textLabels, roots };
  }, [rectangles]);

  // Filter info for search
  const directSearchMatches = useMemo(() => {
    if (!searchTerm.trim()) return null;
    
    const searchLower = searchTerm.toLowerCase();
    return rectangles
      .filter(rect => 
        rect.label?.toLowerCase().includes(searchLower) ||
        rect.description?.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
  }, [rectangles, searchTerm]);

  const searchStats = useMemo(() => {
    if (!directSearchMatches) return null;
    
    return {
      matches: directSearchMatches.length,
      total: rectangles.length
    };
  }, [rectangles.length, directSearchMatches]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchTerm]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    const matchCount = directSearchMatches?.length ?? 0;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (searchTerm) {
        handleClearSearch();
      } else {
        closePanel();
      }
      return;
    }

    if (matchCount === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSearchIndex(index => (index + 1) % matchCount);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchIndex(index => (index - 1 + matchCount) % matchCount);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = directSearchMatches?.[activeSearchIndex] ?? directSearchMatches?.[0];
      if (match) {
        handleRectangleSelect(match.id);
      }
    }
  }, [activeSearchIndex, closePanel, directSearchMatches, handleClearSearch, handleRectangleSelect, searchTerm]);

  return (
    <>
      {/* Fixed-position panel with slide animation from left edge */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:fixed
        top-16 left-0 bottom-0 z-40
        w-80 bg-gray-50 shadow-xl border-r border-gray-200
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header with title and close button */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderTree size={20} className="text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">Hierarchy Outline</h3>
                <p className="text-xs text-gray-500">
                  {stats.total} items • {stats.textLabels} text • {stats.roots} roots
                </p>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Close hierarchy outline"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search rectangles..."
              className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Search Results Info */}
          {searchStats && (
            <div className="mt-2 text-xs text-gray-600">
              {searchStats.matches} of {searchStats.total} rectangles match "{searchTerm}"
            </div>
          )}

          {directSearchMatches && directSearchMatches.length > 0 && (
            <div className="mt-2 max-h-36 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {directSearchMatches.slice(0, 8).map((match, index) => (
                <button
                  key={match.id}
                  type="button"
                  className={`block w-full truncate px-3 py-1.5 text-left text-xs ${
                    index === activeSearchIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={match.label || match.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleRectangleSelect(match.id)}
                >
                  {match.label || match.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tree View Content */}
        <div className="flex-1 overflow-y-auto">
          {rectangles.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center text-gray-500">
                <FolderTree size={48} className="mx-auto mb-2 text-gray-300" />
                <p className="font-medium">No rectangles yet</p>
                <p className="text-sm">Create rectangles to see the hierarchy</p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <HierarchyTreeView
                rectangles={rectangles}
                selectedId={selectedId}
                onRectangleSelect={handleRectangleSelect}
                searchFilter={searchTerm}
                className="space-y-1"
              />
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Click to select • Text labels shown first</span>
            <span className="hidden sm:inline">ESC to close</span>
          </div>
        </div>
      </div>

      {/* Mobile overlay when panel is open */}
      <MobileOverlay isVisible={isOpen} onClick={closePanel} />
    </>
  );
};

export default React.memo(HierarchyOutlinePanel);
