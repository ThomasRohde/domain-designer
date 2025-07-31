import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';

interface DescriptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (description: string) => void;
  rectangleId: string;
  rectangleLabel: string;
  currentDescription: string;
}

/**
 * Modal for editing rectangle descriptions with keyboard shortcuts support.
 * Provides textarea input with auto-focus and real-time preview of changes.
 */
const DescriptionEditModal: React.FC<DescriptionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rectangleId,
  rectangleLabel,
  currentDescription
}) => {
  const [description, setDescription] = useState(currentDescription);

  // Sync local state with current description when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription(currentDescription);
    }
  }, [isOpen, currentDescription]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(description);
    onClose();
  };

  // Enhanced keyboard shortcuts for modal interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Edit3 size={20} />
            <span>Edit Description</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rectangle
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {rectangleLabel} ({rectangleId})
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Enter a description for this rectangle..."
              autoFocus
            />
          </div>
          
          <div className="text-xs text-gray-500">
            Press Ctrl/Cmd + Enter to save, Escape to cancel
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center space-x-2"
          >
            <Edit3 size={16} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DescriptionEditModal;