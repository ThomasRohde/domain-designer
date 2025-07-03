import React from 'react';
import { Grid, Settings } from 'lucide-react';

interface GlobalSettingsProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  gridSize,
  onGridSizeChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-3 lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm lg:text-base">
          <Settings size={16} />
          <span className="hidden sm:inline">Global Settings</span>
          <span className="sm:hidden">Settings</span>
        </h3>
      </div>

      {/* Grid Size Control */}
      <div className="space-y-3">
        {/* Grid Size Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grid Size: {gridSize}px
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={gridSize}
            onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5px (Fine)</span>
            <span>50px (Coarse)</span>
          </div>
        </div>

        {/* Grid Visibility Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Grid size={14} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Grid Info</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Current size: {gridSize}px</div>
            <div>Snap precision: {gridSize < 15 ? 'High' : gridSize < 25 ? 'Medium' : 'Low'}</div>
            <div>Recommended: 20px for most diagrams</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
