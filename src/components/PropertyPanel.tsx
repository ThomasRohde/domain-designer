import React, { useState } from 'react';
import { LayoutPreferences, Rectangle } from '../types';
import { useAppStore } from '../stores/useAppStore';
import ColorPalette from './ColorPalette';
import GlobalSettings from './GlobalSettings';
import { BulkOperationConfirmDialog } from './BulkOperationConfirmDialog';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PropertyPanelProps {
  // No props needed - component will access store directly
}

/**
 * Adaptive property panel that displays different content based on selection state:
 * - When a rectangle is selected: Shows rectangle-specific properties (color, layout, text settings)
 * - When no selection: Shows global application settings
 * 
 * Features context-aware UI sections:
 * - Color picker with predefined palette and custom color management
 * - Text label mode controls for typography-focused rectangles
 * - Layout preferences for parent rectangles with advanced fill strategies
 * - Rectangle information display with hierarchy details
 */
const PropertyPanel: React.FC<PropertyPanelProps> = () => {
  // Core application state for selected rectangle and settings
  const selectedId = useAppStore(state => state.selectedId);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const rectangles = useAppStore(state => state.rectangles);
  const settings = useAppStore(state => state.settings);
  
  // Rectangle manipulation actions
  const updateRectangleColor = useAppStore(state => state.rectangleActions.updateRectangleColor);
  const updateRectangleLabel = useAppStore(state => state.rectangleActions.updateRectangleLabel);
  const updateRectangleDescription = useAppStore(state => state.rectangleActions.updateRectangleDescription);
  const bulkUpdateColor = useAppStore(state => state.rectangleActions.bulkUpdateColor);
  const updateRectangleLayoutPreferences = useAppStore(state => state.rectangleActions.updateRectangleLayoutPreferences);
  const toggleTextLabel = useAppStore(state => state.rectangleActions.toggleTextLabel);
  const updateTextLabelProperties = useAppStore(state => state.rectangleActions.updateTextLabelProperties);
  const updateColorSquare = useAppStore(state => state.settingsActions.updateColorSquare);
  
  const selectedRectangle = selectedId ? rectangles.find(r => r.id === selectedId) || null : null;
  const selectedRectangles = selectedIds.map(id => rectangles.find(r => r.id === id)).filter(Boolean) as Rectangle[];
  const isMultiSelect = selectedIds.length > 1;
  
  const {
    gridSize,
    showGrid,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    rootFontSize,
    dynamicFontSizing,
    fontFamily,
    availableFonts,
    fontsLoading,
    borderRadius,
    borderColor,
    borderWidth,
    predefinedColors,
    margin,
    labelMargin,
    layoutAlgorithm,
  } = settings;


  // State for bulk operation confirmations
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState<{
    isOpen: boolean;
    operation: 'color' | 'label' | 'description';
    pendingColor?: string;
    pendingLabel?: string;
    pendingDescription?: string;
    updateMode?: 'replace' | 'append';
  }>({ isOpen: false, operation: 'color' });

  // Helper function to get mixed value indicator
  const getMixedValueIndicator = (values: (string | number | boolean | undefined)[]): string | undefined => {
    const uniqueValues = [...new Set(values.filter(v => v !== undefined))];
    return uniqueValues.length > 1 ? 'Mixed values' : uniqueValues[0]?.toString();
  };

  // Multi-select rendering
  if (isMultiSelect) {
    const colors = selectedRectangles.map(r => r.color);
    const labels = selectedRectangles.map(r => r.label);
    const descriptions = selectedRectangles.map(r => r.description || '');
    const positions = selectedRectangles.map(r => `(${r.x}, ${r.y})`);
    const sizes = selectedRectangles.map(r => `${r.w} × ${r.h}`);
    const types = selectedRectangles.map(r => r.parentId ? 'Child' : 'Root');
    
    // Check if all selected rectangles have same values
    const allSameColor = colors.every(color => color === colors[0]);
    const allSameLabel = labels.every(label => label === labels[0]);
    const allSameDescription = descriptions.every(desc => desc === descriptions[0]);
    const commonColor = allSameColor ? colors[0] : undefined;
    const commonLabel = allSameLabel ? labels[0] : undefined;
    const commonDescription = allSameDescription ? descriptions[0] : undefined;

    return (
      <>
        {/* Multi-select header */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm lg:text-base">
            Multiple Selected ({selectedIds.length} rectangles)
          </h3>
          <div className="text-xs lg:text-sm text-blue-700 space-y-1">
            <div>Colors: {getMixedValueIndicator(colors) || 'Mixed values'}</div>
            <div>Positions: {positions.length > 3 ? `${positions.slice(0, 3).join(', ')}...` : positions.join(', ')}</div>
            <div>Sizes: {getMixedValueIndicator(sizes) || 'Mixed values'}</div>
            <div>Types: {getMixedValueIndicator(types) || 'Mixed values'}</div>
          </div>
        </div>

        {/* Bulk color picker */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Color Change</h3>
          <ColorPalette
            selectedColor={commonColor || colors[0]}
            onColorChange={(color) => {
              if (allSameColor && color === colors[0]) {
                // No change needed
                return;
              }
              
              setBulkConfirmDialog({
                isOpen: true,
                operation: 'color',
                pendingColor: color
              });
            }}
            predefinedColors={predefinedColors}
            onUpdateColorSquare={updateColorSquare}
          />
          {!allSameColor && (
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ Selected rectangles have different colors. New color will be applied to all.
            </p>
          )}
        </div>

        {/* Bulk label editor */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Label Update</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                New Label
              </label>
              <input
                type="text"
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                placeholder={commonLabel || 'Enter new label for all selected rectangles'}
                onChange={(e) => {
                  if (e.target.value.trim()) {
                    setBulkConfirmDialog({
                      isOpen: true,
                      operation: 'label',
                      pendingLabel: e.target.value,
                      updateMode: 'replace'
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    setBulkConfirmDialog({
                      isOpen: true,
                      operation: 'label',
                      pendingLabel: e.currentTarget.value,
                      updateMode: 'replace'
                    });
                  }
                }}
              />
              {!allSameLabel && (
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Selected rectangles have different labels: {getMixedValueIndicator(labels)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bulk description editor */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Description Update</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Update Mode
              </label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm mb-2">
                <option value="replace">Replace all descriptions</option>
                <option value="append">Append to existing descriptions</option>
              </select>
            </div>
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Description Text
              </label>
              <textarea
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                rows={3}
                placeholder={commonDescription || 'Enter description for all selected rectangles'}
                onChange={(e) => {
                  if (e.target.value.trim()) {
                    const mode = (e.target.closest('.bg-white')?.querySelector('select') as HTMLSelectElement)?.value as 'replace' | 'append' || 'replace';
                    setBulkConfirmDialog({
                      isOpen: true,
                      operation: 'description',
                      pendingDescription: e.target.value,
                      updateMode: mode
                    });
                  }
                }}
              />
              {!allSameDescription && (
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Selected rectangles have different descriptions
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bulk operation shortcuts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Operations</h3>
          <div className="space-y-2">
            <p className="text-xs lg:text-sm text-gray-600">
              Use the context menu (right-click) for alignment, distribution, and other bulk operations.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Align</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Distribute</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Delete</span>
            </div>
          </div>
        </div>

        {/* Bulk operation confirmation dialog */}
        <BulkOperationConfirmDialog
          isOpen={bulkConfirmDialog.isOpen}
          operation={bulkConfirmDialog.operation}
          selectedCount={selectedIds.length}
          onConfirm={() => {
            if (bulkConfirmDialog.operation === 'color' && bulkConfirmDialog.pendingColor) {
              bulkUpdateColor(selectedIds, bulkConfirmDialog.pendingColor);
            } else if (bulkConfirmDialog.operation === 'label' && bulkConfirmDialog.pendingLabel) {
              selectedIds.forEach(id => updateRectangleLabel(id, bulkConfirmDialog.pendingLabel!));
            } else if (bulkConfirmDialog.operation === 'description' && bulkConfirmDialog.pendingDescription) {
              selectedIds.forEach(id => {
                if (bulkConfirmDialog.updateMode === 'append') {
                  const currentRect = rectangles.find(r => r.id === id);
                  const currentDesc = currentRect?.description || '';
                  const newDesc = currentDesc ? `${currentDesc}\n${bulkConfirmDialog.pendingDescription}` : bulkConfirmDialog.pendingDescription!;
                  updateRectangleDescription(id, newDesc);
                } else {
                  updateRectangleDescription(id, bulkConfirmDialog.pendingDescription!);
                }
              });
            }
            setBulkConfirmDialog({ isOpen: false, operation: 'color' });
          }}
          onCancel={() => setBulkConfirmDialog({ isOpen: false, operation: 'color' })}
          details={
            bulkConfirmDialog.operation === 'color' ? [
              `Current colors: ${allSameColor ? colors[0] : 'Mixed values'}`,
              `New color will be applied to all ${selectedIds.length} rectangles`
            ] : bulkConfirmDialog.operation === 'label' ? [
              `Current labels: ${allSameLabel ? labels[0] : 'Mixed values'}`,
              `New label "${bulkConfirmDialog.pendingLabel}" will be applied to all ${selectedIds.length} rectangles`
            ] : bulkConfirmDialog.operation === 'description' ? [
              `Update mode: ${bulkConfirmDialog.updateMode === 'append' ? 'Append to existing descriptions' : 'Replace all descriptions'}`,
              `${bulkConfirmDialog.updateMode === 'append' ? 'Text will be added to existing descriptions' : 'All descriptions will be replaced'}`
            ] : []
          }
        />
      </>
    );
  }

  // Single-select rendering: existing functionality preserved
  if (selectedId && selectedRectangle) {
    const children = useAppStore.getState().getters.getChildren(selectedId);
    
    return (
      <>
        {/* Color selection interface with palette and custom color support */}
        <ColorPalette
          selectedColor={selectedRectangle.color}
          onColorChange={(color) => updateRectangleColor(selectedId, color)}
          predefinedColors={predefinedColors}
          onUpdateColorSquare={updateColorSquare}
        />

        {/* Rectangle information panel showing key properties and hierarchy context */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Selected: {selectedId}</h3>
          <div className="text-xs lg:text-sm text-gray-600 space-y-1">
            <div>Position: ({selectedRectangle.x}, {selectedRectangle.y})</div>
            <div>Size: {selectedRectangle.w} × {selectedRectangle.h}</div>
            <div>Children: {children.length}</div>
            <div>Type: {selectedRectangle.parentId ? 'Child' : 'Root'}</div>
            <div>Color: {selectedRectangle.color}</div>
            {selectedRectangle.isTextLabel && (
              <div>Mode: Text Label</div>
            )}
          </div>
        </div>

        {/* Text Label Mode: Typography controls for leaf rectangles (no children) */}
        {children.length === 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2 text-sm lg:text-base">Text Label Mode</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="textLabelMode"
                  checked={selectedRectangle.isTextLabel || false}
                  onChange={() => toggleTextLabel(selectedId)}
                  className="rounded"
                />
                <label htmlFor="textLabelMode" className="text-xs lg:text-sm font-medium text-gray-700">
                  Enable Text Label Mode
                </label>
              </div>

              {selectedRectangle.isTextLabel && (
                <>
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Family
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textFontFamily || 'Arial, sans-serif'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textFontFamily: e.target.value })}
                    >
                      {(availableFonts || []).map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Size
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textFontSize || 14}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textFontSize: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Weight
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.fontWeight || 'normal'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { fontWeight: e.target.value as 'normal' | 'bold' })}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Text Alignment
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textAlign || 'center'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textAlign: e.target.value as 'left' | 'center' | 'right' | 'justify' })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Layout Preferences: Advanced layout controls for parent rectangles */}
        {children.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2 text-sm lg:text-base">Layout Preferences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Fill Strategy
                </label>
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                  value={selectedRectangle.layoutPreferences?.fillStrategy || 'default'}
                  onChange={(e) => {
                    /* Layout preference change handler with default fallback logic */
                    if (e.target.value === 'default') {
                      const newPreferences: LayoutPreferences = {
                        fillStrategy: 'fill-columns-first'
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    } else {
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: e.target.value as 'fill-columns-first' | 'fill-rows-first'
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }
                  }}
                >
                  <option value="default">Default (Fill Columns First)</option>
                  <option value="fill-columns-first">Fill Columns First</option>
                  <option value="fill-rows-first">Fill Rows First</option>
                </select>
              </div>

              {/* Conditional layout constraint controls based on selected fill strategy */}
              {selectedRectangle.layoutPreferences?.fillStrategy === 'fill-rows-first' && (
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Max Columns
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                    value={selectedRectangle.layoutPreferences?.maxColumns || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const maxColumns = e.target.value ? parseInt(e.target.value) : undefined;
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: 'fill-rows-first',
                        maxColumns: maxColumns
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }}
                  />
                </div>
              )}

              {selectedRectangle.layoutPreferences?.fillStrategy === 'fill-columns-first' && (
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Max Rows
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                    value={selectedRectangle.layoutPreferences?.maxRows || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const maxRows = e.target.value ? parseInt(e.target.value) : undefined;
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: 'fill-columns-first',
                        maxRows: maxRows
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Default state: Display global application settings when no rectangle is selected
  return (
    <GlobalSettings
      gridSize={gridSize}
      showGrid={showGrid}
      leafFixedWidth={leafFixedWidth}
      leafFixedHeight={leafFixedHeight}
      leafWidth={leafWidth}
      leafHeight={leafHeight}
      rootFontSize={rootFontSize}
      dynamicFontSizing={dynamicFontSizing}
      fontFamily={fontFamily}
      availableFonts={availableFonts || []}
      fontsLoading={fontsLoading || false}
      borderRadius={borderRadius}
      borderColor={borderColor}
      borderWidth={borderWidth}
      margin={margin}
      labelMargin={labelMargin}
      layoutAlgorithm={layoutAlgorithm}
    />
  );
};

export default PropertyPanel;
