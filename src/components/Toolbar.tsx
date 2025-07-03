import React, { useRef } from 'react';
import { Plus, Save, FolderOpen, Grid, Download, Undo, Redo } from 'lucide-react';
import { RectangleCategory } from '../types';

interface ToolbarProps {
  onAddRectangle: (parentId: string | null, category?: RectangleCategory) => void;
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedId: string | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddRectangle,
  onSave,
  onLoad,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Grid size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Domain Modeling Tool</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-gray-300 flex items-center space-x-1"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
            <span>Undo</span>
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-gray-300 flex items-center space-x-1"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
            <span>Redo</span>
          </button>
          
          <div className="w-px h-6 bg-gray-300"></div>
          
          <button
            onClick={() => onAddRectangle(null, 'business')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 text-sm font-medium"
          >
            <Plus size={16} />
            <span>Add Root</span>
          </button>
          
          {selectedId && (
            <button
              onClick={() => onAddRectangle(selectedId, 'business')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 text-sm font-medium"
            >
              <Plus size={16} />
              <span>Add Child</span>
            </button>
          )}
          
          <div className="w-px h-6 bg-gray-300"></div>
          
          <button
            onClick={onSave}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center space-x-1"
            title="Save diagram"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          
          <button
            onClick={handleLoadClick}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center space-x-1"
            title="Load diagram"
          >
            <FolderOpen size={16} />
            <span>Load</span>
          </button>
          
          <button
            onClick={onExport}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center space-x-1"
            title="Export diagram"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onLoad}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default Toolbar;