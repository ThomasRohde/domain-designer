import React from 'react';
import { Settings, Lock, Unlock, Loader2 } from 'lucide-react';
import type { LayoutAlgorithmType } from '../utils/layout';

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
  borderRadius: number;
  onBorderRadiusChange: (radius: number) => void;
  borderColor: string;
  onBorderColorChange: (color: string) => void;
  borderWidth: number;
  onBorderWidthChange: (width: number) => void;
  margin: number;
  onMarginChange: (margin: number) => void;
  labelMargin: number;
  onLabelMarginChange: (labelMargin: number) => void;
  layoutAlgorithm: LayoutAlgorithmType;
  onLayoutAlgorithmChange: (algorithm: LayoutAlgorithmType) => void;
  fontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
  availableFonts: Array<{ value: string; label: string; category: string }>;
  fontsLoading: boolean;
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
  onDynamicFontSizingChange,
  borderRadius,
  onBorderRadiusChange,
  borderColor,
  onBorderColorChange,
  borderWidth,
  onBorderWidthChange,
  margin,
  onMarginChange,
  labelMargin,
  onLabelMarginChange,
  layoutAlgorithm,
  onLayoutAlgorithmChange,
  fontFamily,
  onFontFamilyChange,
  availableFonts,
  fontsLoading
}) => {
  // Debug logging
  console.log('🔧 GlobalSettings rendered with:', {
    availableFonts: availableFonts.length,
    fontsLoading,
    fontFamily
  });
  
  return (
    <div className="bg-white rounded-lg shadow p-3 lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm lg:text-base">
          <Settings size={16} />
          <span className="hidden sm:inline">Global Settings</span>
          <span className="sm:hidden">Settings</span>
        </h3>
      </div>

      {/* Layout Algorithm Control */}
      <div className="space-y-3">
        {/* Layout Algorithm Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Layout Algorithm
          </label>
          <select
            value={layoutAlgorithm}
            onChange={(e) => onLayoutAlgorithmChange(e.target.value as LayoutAlgorithmType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="grid">Grid Layout</option>
            <option value="flow">Flow Layout</option>
            <option value="mixed-flow">Mixed Flow Layout</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {layoutAlgorithm === 'grid' ? 
              'Traditional grid-based layout with fixed positioning' : 
              layoutAlgorithm === 'flow' ?
              'Flow-based layout with alternating row/column orientation' :
              layoutAlgorithm === 'mixed-flow' ?
              'Adaptive layout combining rows and columns to minimize whitespace' :
              'Unknown layout algorithm'
            }
          </div>
        </div>

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
                  max="20"
                  step="1"
                  value={leafWidth}
                  onChange={(e) => onLeafWidthChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>20</span>
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
                  max="16"
                  step="1"
                  value={leafHeight}
                  onChange={(e) => onLeafHeightChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>16</span>
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

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <div className="relative">
                <select
                  value={fontFamily}
                  onChange={(e) => onFontFamilyChange(e.target.value)}
                  disabled={fontsLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {availableFonts.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fontsLoading && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {fontsLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    Detecting available fonts...
                  </span>
                ) : (
                  <span>
                    Font used in app and all export formats ({availableFonts.length} available)
                  </span>
                )}
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

        {/* Margin Settings */}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
            Margin Settings
          </h4>
          
          <div className="space-y-3">
            {/* Margin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margin: {margin} grid units
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={margin}
                onChange={(e) => onMarginChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1 (Tight)</span>
                <span>5.0 (Loose)</span>
              </div>
            </div>

            {/* Label Margin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Margin: {labelMargin} grid units
              </label>
              <input
                type="range"
                min="0.1"
                max="8"
                step="0.1"
                value={labelMargin}
                onChange={(e) => onLabelMarginChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1 (Tight)</span>
                <span>8.0 (Spacious)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Border Settings */}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
            Border Settings
          </h4>
          
          <div className="space-y-3">
            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Radius: {borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={borderRadius}
                onChange={(e) => onBorderRadiusChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px (Square)</span>
                <span>20px (Rounded)</span>
              </div>
            </div>

            {/* Border Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => onBorderColorChange(e.target.value)}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => onBorderColorChange(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                  placeholder="#374151"
                />
              </div>
            </div>

            {/* Border Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Width: {borderWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={borderWidth}
                onChange={(e) => onBorderWidthChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1px (Thin)</span>
                <span>8px (Thick)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
