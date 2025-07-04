import React from 'react';
import { Grid, Settings, Lock, Unlock } from 'lucide-react';

interface GlobalSettingsProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  leafFixedWidth: boolean;
  onLeafFixedWidthChange: (enabled: boolean) => void;
  leafFixedHeight: boolean;
  onLeafFixedHeightChange: (enabled: boolean) => void;
  leafWidth: number;
  onLeafWidthChange: (width: number) => void;
  leafHeight: number;
  onLeafHeightChange: (height: number) => void;
  rootFontSize: number;
  onRootFontSizeChange: (size: number) => void;
  dynamicFontSizing: boolean;
  onDynamicFontSizingChange: (enabled: boolean) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  gridSize,
  onGridSizeChange,
  leafFixedWidth,
  onLeafFixedWidthChange,
  leafFixedHeight,
  onLeafFixedHeightChange,
  leafWidth,
  onLeafWidthChange,
  leafHeight,
  onLeafHeightChange,
  rootFontSize,
  onRootFontSizeChange,
  dynamicFontSizing,
  onDynamicFontSizingChange
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


        {/* Leaf Node Settings */}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Lock size={14} className="text-gray-600" />
            Leaf Node Settings
          </h4>
          
          {/* Fixed Width Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Fixed Width</label>
              <button
                onClick={() => onLeafFixedWidthChange(!leafFixedWidth)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  leafFixedWidth 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {leafFixedWidth ? <Lock size={12} /> : <Unlock size={12} />}
                {leafFixedWidth ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {leafFixedWidth && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Width: {leafWidth} grid units
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={leafWidth}
                  onChange={(e) => onLeafWidthChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>10</span>
                </div>
              </div>
            )}

            {/* Fixed Height Control */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Fixed Height</label>
              <button
                onClick={() => onLeafFixedHeightChange(!leafFixedHeight)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  leafFixedHeight 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {leafFixedHeight ? <Lock size={12} /> : <Unlock size={12} />}
                {leafFixedHeight ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {leafFixedHeight && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Height: {leafHeight} grid units
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={leafHeight}
                  onChange={(e) => onLeafHeightChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>8</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Font Settings */}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">Aa</span>
            Font Settings
          </h4>
          
          {/* Root Font Size */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Root Font Size: {rootFontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={rootFontSize}
                onChange={(e) => onRootFontSizeChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10px (Small)</span>
                <span>24px (Large)</span>
              </div>
            </div>

            {/* Dynamic Font Sizing */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700">Dynamic Font Sizing</label>
                <div className="text-xs text-gray-500 mt-0.5">
                  Automatically decrease font size for deeper hierarchies
                </div>
              </div>
              <button
                onClick={() => onDynamicFontSizingChange(!dynamicFontSizing)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  dynamicFontSizing 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dynamicFontSizing ? <Lock size={12} /> : <Unlock size={12} />}
                {dynamicFontSizing ? 'Enabled' : 'Disabled'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
