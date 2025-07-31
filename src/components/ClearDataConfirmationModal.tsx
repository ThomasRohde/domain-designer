import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, FileX } from 'lucide-react';

interface ClearDataConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearAll: () => void;
  onConfirmClearModel: () => void;
}

/**
 * Confirmation modal for data clearing operations with granular control.
 * Offers selective clearing (model only vs. everything) with clear visual warnings.
 */
const ClearDataConfirmationModal: React.FC<ClearDataConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirmClearAll,
  onConfirmClearModel
}) => {
  // Default to safer 'clear-model' option that preserves user settings
  const [clearType, setClearType] = useState<'clear-all' | 'clear-model'>('clear-model');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (clearType === 'clear-all') {
      onConfirmClearAll();
    } else {
      onConfirmClearModel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold">Clear Saved Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <p className="text-gray-700">
              Choose what to clear. This action cannot be undone.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="clearType"
                  value="clear-model"
                  checked={clearType === 'clear-model'}
                  onChange={(e) => setClearType(e.target.value as 'clear-all' | 'clear-model')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <FileX size={16} className="text-blue-600" />
                    <span className="font-medium text-gray-900">Clear Model Only</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Remove all rectangles and diagrams but keep your settings and preferences.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="clearType"
                  value="clear-all"
                  checked={clearType === 'clear-all'}
                  onChange={(e) => setClearType(e.target.value as 'clear-all' | 'clear-model')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Trash2 size={16} className="text-red-600" />
                    <span className="font-medium text-gray-900">Clear Everything</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Remove all diagrams, settings, and preferences. Complete reset.
                  </p>
                </div>
              </label>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">
                    {clearType === 'clear-all' ? 'This will delete everything!' : 'This will clear your drawings!'}
                  </p>
                  <p>
                    {clearType === 'clear-all' 
                      ? 'All diagrams, settings, and preferences will be permanently lost.'
                      : 'All rectangles and diagrams will be removed, but your settings will be preserved.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 ${
              clearType === 'clear-all' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {clearType === 'clear-all' ? <Trash2 size={16} /> : <FileX size={16} />}
            <span>{clearType === 'clear-all' ? 'Clear Everything' : 'Clear Model Only'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearDataConfirmationModal;