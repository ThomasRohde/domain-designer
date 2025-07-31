import React from 'react';
import { AlertTriangle, Trash2, Move, Palette, Type, FileText } from 'lucide-react';

/**
 * Props for the bulk operation confirmation dialog
 */
export interface BulkOperationConfirmDialogProps {
  isOpen: boolean;
  operation: 'delete' | 'move' | 'color' | 'align' | 'distribute' | 'label' | 'description';
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  details?: string[];
}

/**
 * Confirmation dialog for bulk operations
 * Provides clear feedback about the operation and potential consequences
 */
export const BulkOperationConfirmDialog: React.FC<BulkOperationConfirmDialogProps> = ({
  isOpen,
  operation,
  selectedCount,
  onConfirm,
  onCancel,
  details = []
}) => {
  if (!isOpen) return null;

  const getOperationConfig = () => {
    switch (operation) {
      case 'delete':
        return {
          title: 'Confirm Bulk Delete',
          icon: <Trash2 className="w-6 h-6 text-red-500" />,
          message: `Delete ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This action cannot be undone. All child rectangles will also be deleted.',
          confirmText: 'Delete',
          confirmStyle: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'move':
        return {
          title: 'Bulk Movement Restricted',
          icon: <Move className="w-6 h-6 text-orange-500" />,
          message: `Cannot move ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}`,
          warning: 'Movement blocked due to layout constraints or collisions.',
          confirmText: 'OK',
          confirmStyle: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
      case 'color':
        return {
          title: 'Confirm Color Change',
          icon: <Palette className="w-6 h-6 text-blue-500" />,
          message: `Change color for ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This will update the color for all selected rectangles.',
          confirmText: 'Apply',
          confirmStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'align':
        return {
          title: 'Confirm Alignment',
          icon: <Move className="w-6 h-6 text-green-500" />,
          message: `Align ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This will change the positions of the selected rectangles.',
          confirmText: 'Align',
          confirmStyle: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'distribute':
        return {
          title: 'Confirm Distribution',
          icon: <Move className="w-6 h-6 text-purple-500" />,
          message: `Distribute ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This will evenly space the selected rectangles.',
          confirmText: 'Distribute',
          confirmStyle: 'bg-purple-600 hover:bg-purple-700 text-white'
        };
      case 'label':
        return {
          title: 'Confirm Label Change',
          icon: <Type className="w-6 h-6 text-green-500" />,
          message: `Change labels for ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This will update the label for all selected rectangles.',
          confirmText: 'Update Labels',
          confirmStyle: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'description':
        return {
          title: 'Confirm Description Change',
          icon: <FileText className="w-6 h-6 text-indigo-500" />,
          message: `Change descriptions for ${selectedCount} selected rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This will update the description for all selected rectangles.',
          confirmText: 'Update Descriptions',
          confirmStyle: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        };
      default:
        return {
          title: 'Confirm Operation',
          icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
          message: `Perform operation on ${selectedCount} rectangle${selectedCount > 1 ? 's' : ''}?`,
          warning: 'This action will modify the selected rectangles.',
          confirmText: 'Confirm',
          confirmStyle: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
    }
  };

  const config = getOperationConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            {config.icon}
            <h3 className="text-lg font-semibold ml-3">{config.title}</h3>
          </div>

          {/* Message */}
          <p className="text-gray-700 mb-3">{config.message}</p>

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">{config.warning}</p>
            </div>
          </div>

          {/* Details */}
          {details.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Details:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md transition-colors ${config.confirmStyle}`}
            >
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};