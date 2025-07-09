import React from 'react';
import { Plus, Menu, Download, Upload, Settings } from 'lucide-react';
import OfflineIndicator from './OfflineIndicator';

interface ToolbarProps {
  onAddRectangle: (parentId: string | null) => void;
  onExport: () => void;
  onImport: () => void;
  selectedId: string | null;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onToggleLeftMenu?: () => void;
  leftMenuOpen?: boolean;
  lastSaved?: number | null;
  autoSaveEnabled?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddRectangle,
  onExport,
  onImport,
  selectedId,
  onToggleSidebar,
  sidebarOpen,
  onToggleLeftMenu,
  leftMenuOpen,
  lastSaved,
  autoSaveEnabled
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleLeftMenu}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
            title={leftMenuOpen ? "Close Menu" : "Open Menu"}
          >
            <Menu size={20} className="sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 hidden sm:block">Domain Modeling Tool</h1>
          <h1 className="text-sm font-bold text-gray-800 sm:hidden">Domain Tool</h1>
          <div className="hidden sm:block">
            <OfflineIndicator lastSaved={lastSaved} autoSaveEnabled={autoSaveEnabled} />
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Mobile-first responsive controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onAddRectangle(null)}
              className="px-2 py-2 sm:px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-1 text-xs sm:text-sm font-medium"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Root</span>
            </button>
            
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
          
          <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
          
          <div className="hidden sm:flex items-center space-x-1">
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
          </div>

          {/* Sidebar toggle button */}
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