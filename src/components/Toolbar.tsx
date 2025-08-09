import React from 'react';
import { Plus, Menu, Download, Upload, Settings, Map, Thermometer } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import OfflineIndicator from './OfflineIndicator';

interface ToolbarProps {
  /** Handler for creating new rectangles (null parentId = root rectangle) */
  onAddRectangle: (parentId: string | null) => void;
  /** Export functionality trigger */
  onExport: () => void;
  /** Import functionality trigger */
  onImport: () => void;
  /** Currently selected rectangle ID (enables "Add Child" button) */
  selectedId: string | null;
  /** Timestamp of last auto-save operation for offline indicator */
  lastSaved?: number | null;
  /** Whether auto-save is currently enabled */
  autoSaveEnabled?: boolean;
  /** Navigation minimap toggle functionality */
  onToggleMinimap?: () => void;
  /** Current minimap visibility state for button styling */
  minimapVisible?: boolean;
}

/**
 * Main application toolbar with responsive design and context-aware controls.
 * Features mobile-first layout with progressive enhancement for larger screens.
 * Includes auto-save status indicator and adaptive button groupings.
 */
const Toolbar: React.FC<ToolbarProps> = ({
  onAddRectangle,
  onExport,
  onImport,
  selectedId,
  lastSaved,
  autoSaveEnabled,
  onToggleMinimap,
  minimapVisible
}) => {
  const sidebarOpen = useAppStore(state => state.ui.sidebarOpen);
  const leftMenuOpen = useAppStore(state => state.ui.leftMenuOpen);
  const onToggleSidebar = useAppStore(state => state.uiActions.toggleSidebar);
  const onToggleLeftMenu = useAppStore(state => state.uiActions.toggleLeftMenu);
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const setHeatmapEnabled = useAppStore(state => state.heatmapActions.setEnabled);
  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left section: Navigation and branding */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleLeftMenu}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
            title={leftMenuOpen ? "Close Menu" : "Open Menu"}
          >
            <Menu size={20} className="sm:w-6 sm:h-6" />
          </button>
          {/* Responsive title with different text lengths for different screen sizes */}
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 hidden sm:block">Domain Modeling Tool</h1>
          <h1 className="text-sm font-bold text-gray-800 sm:hidden">Domain Tool</h1>
          {/* Auto-save indicator hidden on mobile to preserve space */}
          <div className="hidden sm:block">
            <OfflineIndicator lastSaved={lastSaved} autoSaveEnabled={autoSaveEnabled} />
          </div>
        </div>
        
        {/* Right section: Action buttons with responsive grouping */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Primary action buttons - always visible with context-aware enablement */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onAddRectangle(null)}
              className="px-2 py-2 sm:px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-1 text-xs sm:text-sm font-medium"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Root</span>
            </button>
            
            {/* Conditional child button - only shown when rectangle is selected */}
            {selectedId && (
              <button
                onClick={() => onAddRectangle(selectedId)}
                className="px-2 py-2 sm:px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-1 text-xs sm:text-sm font-medium"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Child</span>
              </button>
            )}
          </div>
          
          {/* Visual separator for desktop */}
          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
          
          {/* Secondary actions - hidden on mobile to prioritize primary functions */}
          <div className="hidden sm:flex items-center space-x-1">
            {/* Heatmap visibility toggle */}
            <button
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
              className={`px-3 py-2 text-sm font-medium rounded-md border flex items-center space-x-1 ${
                heatmapEnabled
                  ? 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              }`}
              title={`${heatmapEnabled ? 'Hide' : 'Show'} heatmap (H)`}
            >
              <Thermometer size={16} />
              <span>Heatmap</span>
            </button>
            <button
              onClick={onImport}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center space-x-1"
              title="Import diagram from JSON"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
            <button
              onClick={onExport}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center space-x-1"
              title="Export diagram"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            {/* Navigation minimap toggle with active state styling */}
            {onToggleMinimap && (
              <button
                onClick={onToggleMinimap}
                className={`px-3 py-2 text-sm font-medium rounded-md border flex items-center space-x-1 ${
                  minimapVisible 
                    ? 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100' 
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                }`}
                title={`${minimapVisible ? 'Hide' : 'Show'} navigation map (M)`}
              >
                <Map size={16} />
                <span>Map</span>
              </button>
            )}
          </div>

          {/* Settings panel toggle - always available for accessing properties */}
          {onToggleSidebar && (
            <>
              <div className="w-px h-6 bg-gray-300"></div>
              <button
                onClick={onToggleSidebar}
                className="p-2 text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
                title={sidebarOpen ? "Close Properties" : "Open Properties"}
              >
                <Settings size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;