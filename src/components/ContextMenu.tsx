import React from 'react';
import { Plus, Trash2, Edit3, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, MoveHorizontal, MoveVertical, Copy, Clipboard } from 'lucide-react';
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
  onBulkDelete?: () => void;
  // Clipboard operations
  onCopy?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
  // Operation availability flags
  canPerformAlignmentOperations?: boolean;
  canPerformDistributionOperations?: boolean;
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
  onBulkDelete,
  onCopy,
  onPaste,
  canPaste = false,
  canPerformAlignmentOperations = true,
  canPerformDistributionOperations = true
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
    if (onAlign && canPerformAlignmentOperations) {
      onAlign(type);
      onClose();
    }
  };

  const handleDistribute = (direction: DistributionDirection) => {
    if (onDistribute && canPerformDistributionOperations) {
      onDistribute(direction);
      onClose();
    }
  };


  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete();
      onClose();
    }
  };

  // Clipboard handlers
  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      onClose();
    }
  };

  const handlePaste = () => {
    if (onPaste) {
      onPaste();
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
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Align
              {!canPerformAlignmentOperations && (
                <span className="ml-2 text-xs text-red-500">(Parent locked)</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 px-2 py-1">
              <button
                onClick={() => handleAlign('left')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Left" : "Cannot align: parent has automatic layout"}
              >
                <AlignLeft size={14} />
                <span>Left</span>
              </button>
              <button
                onClick={() => handleAlign('center')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Center" : "Cannot align: parent has automatic layout"}
              >
                <AlignCenter size={14} />
                <span>Center</span>
              </button>
              <button
                onClick={() => handleAlign('right')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Right" : "Cannot align: parent has automatic layout"}
              >
                <AlignRight size={14} />
                <span>Right</span>
              </button>
              <button
                onClick={() => handleAlign('top')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Top" : "Cannot align: parent has automatic layout"}
              >
                <AlignVerticalJustifyStart size={14} />
                <span>Top</span>
              </button>
              <button
                onClick={() => handleAlign('middle')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Middle" : "Cannot align: parent has automatic layout"}
              >
                <AlignVerticalJustifyCenter size={14} />
                <span>Middle</span>
              </button>
              <button
                onClick={() => handleAlign('bottom')}
                disabled={!canPerformAlignmentOperations}
                className={`p-2 text-xs flex flex-col items-center space-y-1 rounded ${
                  canPerformAlignmentOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformAlignmentOperations ? "Align Bottom" : "Cannot align: parent has automatic layout"}
              >
                <AlignVerticalJustifyEnd size={14} />
                <span>Bottom</span>
              </button>
            </div>
          </div>

          {/* Distribution options - only show if 3+ rectangles */}
          {selectionCount >= 3 && (
            <div className="border-t border-gray-100 py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Distribute
                {!canPerformDistributionOperations && (
                  <span className="ml-2 text-xs text-red-500">(Parent locked)</span>
                )}
              </div>
              <button
                onClick={() => handleDistribute('horizontal')}
                disabled={!canPerformDistributionOperations}
                className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                  canPerformDistributionOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformDistributionOperations ? "Distribute Horizontally" : "Cannot distribute: parent has automatic layout"}
              >
                <MoveHorizontal size={14} />
                <span>Distribute Horizontally</span>
              </button>
              <button
                onClick={() => handleDistribute('vertical')}
                disabled={!canPerformDistributionOperations}
                className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                  canPerformDistributionOperations 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
                title={canPerformDistributionOperations ? "Distribute Vertically" : "Cannot distribute: parent has automatic layout"}
              >
                <MoveVertical size={14} />
                <span>Distribute Vertically</span>
              </button>
            </div>
          )}

          {/* Clipboard operations */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleCopy}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Copy size={14} />
              <span>Copy Selected</span>
            </button>
            {canPaste && (
              <button
                onClick={handlePaste}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Clipboard size={14} />
                <span>Paste</span>
              </button>
            )}
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

          {/* Clipboard operations */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleCopy}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Copy size={14} />
              <span>Copy</span>
            </button>
            {canPaste && (
              <button
                onClick={handlePaste}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Clipboard size={14} />
                <span>Paste</span>
              </button>
            )}
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