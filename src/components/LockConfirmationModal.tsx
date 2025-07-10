import React from 'react';
import { X, Lock, AlertTriangle } from 'lucide-react';

interface LockConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rectangleLabel: string;
}

const LockConfirmationModal: React.FC<LockConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  rectangleLabel 
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-amber-500" size={20} />
            <h2 className="text-lg font-semibold">Confirm Layout Lock</h2>
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
              You are about to lock the automatic layout for <strong>"{rectangleLabel}"</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">This will reset all manual positioning!</p>
                  <p>All children will be automatically repositioned using the grid layout system. Any manual positioning you've done will be lost.</p>
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
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center space-x-2"
          >
            <Lock size={16} />
            <span>Lock Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockConfirmationModal;