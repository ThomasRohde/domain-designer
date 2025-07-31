import React from 'react';
import { Plus, Trash2, Edit3, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, MoveHorizontal, MoveVertical, Palette } from 'lucide-react';
import type { AlignmentType, DistributionDirection } from '../stores/types';

interface ContextMenuProps {
  x: number;
  y: number;
  rectangleId: string;
  selectedIds?: string[];
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onEditDescription: (id: string) => void;
  onClose: () => void;
  // Multi-select operations
  onAlign?: (type: AlignmentType) => void;
  onDistribute?: (direction: DistributionDirection) => void;
  onBulkUpdateColor?: () => void;
  onBulkDelete?: () => void;
}

/**
 * Right-click context menu for rectangle operations.
 * Positioned absolutely at cursor location and auto-closes after action selection.
 * Supports both single-select and multi-select PowerPoint-style operations.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  rectangleId,
  selectedIds,
  onAddChild,
  onRemove,
  onEditDescription,
  onClose,
  onAlign,
  onDistribute,
  onBulkUpdateColor,
  onBulkDelete
}) => {
  const isMultiSelect = selectedIds && selectedIds.length > 1;
  const selectionCount = selectedIds?.length || 1;

  // Single-select handlers
  const handleAddChild = () => {
    onAddChild(rectangleId);
    onClose();
  };

  const handleRemove = () => {
    onRemove(rectangleId);
    onClose();
  };

  const handleEditDescription = () => {
    onEditDescription(rectangleId);
    onClose();
  };

  // Multi-select handlers
  const handleAlign = (type: AlignmentType) => {
    if (onAlign) {
      onAlign(type);
      onClose();
    }
  };

  const handleDistribute = (direction: DistributionDirection) => {
    if (onDistribute) {
      onDistribute(direction);
      onClose();
    }
  };

  const handleBulkUpdateColor = () => {
    if (onBulkUpdateColor) {
      onBulkUpdateColor();
      onClose();
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete();
      onClose();
    }
  };

  return (
    <div
      data-context-menu
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999] min-w-64 animate-in"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header - shows context */}
      <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
        {isMultiSelect ? `${selectionCount} rectangles selected` : rectangleId}
      </div>
      
      {isMultiSelect ? (
        // Multi-select context menu layout (PowerPoint-style)
        <>
          {/* Alignment options */}
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Align</div>
            <div className="grid grid-cols-3 gap-1 px-2 py-1">
              <button
                onClick={() => handleAlign('left')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Left"
              >
                <AlignLeft size={14} />
                <span>Left</span>
              </button>
              <button
                onClick={() => handleAlign('center')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Center"
              >
                <AlignCenter size={14} />
                <span>Center</span>
              </button>
              <button
                onClick={() => handleAlign('right')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Right"
              >
                <AlignRight size={14} />
                <span>Right</span>
              </button>
              <button
                onClick={() => handleAlign('top')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Top"
              >
                <AlignVerticalJustifyStart size={14} />
                <span>Top</span>
              </button>
              <button
                onClick={() => handleAlign('middle')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Middle"
              >
                <AlignVerticalJustifyCenter size={14} />
                <span>Middle</span>
              </button>
              <button
                onClick={() => handleAlign('bottom')}
                className="p-2 text-xs hover:bg-gray-50 flex flex-col items-center space-y-1 rounded"
                title="Align Bottom"
              >
                <AlignVerticalJustifyEnd size={14} />
                <span>Bottom</span>
              </button>
            </div>
          </div>

          {/* Distribution options - only show if 3+ rectangles */}
          {selectionCount >= 3 && (
            <div className="border-t border-gray-100 py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Distribute</div>
              <button
                onClick={() => handleDistribute('horizontal')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <MoveHorizontal size={14} />
                <span>Distribute Horizontally</span>
              </button>
              <button
                onClick={() => handleDistribute('vertical')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <MoveVertical size={14} />
                <span>Distribute Vertically</span>
              </button>
            </div>
          )}

          {/* Bulk operations */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleBulkUpdateColor}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Palette size={14} />
              <span>Change Color</span>
            </button>
          </div>

          {/* Destructive actions */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleBulkDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
            >
              <Trash2 size={14} />
              <span>Delete Selected</span>
            </button>
          </div>
        </>
      ) : (
        // Single-select context menu layout (original)
        <>
          <div className="py-1">
            <button
              onClick={handleAddChild}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Plus size={14} />
              <span>Add Child</span>
            </button>
            
            <button
              onClick={handleEditDescription}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Edit3 size={14} />
              <span>Edit Description</span>
            </button>
          </div>
          
          {/* Destructive action separated and styled with warning colors */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleRemove}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;