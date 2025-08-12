import React, { useState } from 'react';
import { X, Lock, AlertTriangle, Archive } from 'lucide-react';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface LockConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmLockAsIs: () => void;
  rectangleLabel: string;
}

/**
 * Modal for confirming layout lock behavior with two distinct options.
 * Critical for preserving user manual positioning vs. applying automatic layout.
 */
const LockConfirmationModal: React.FC<LockConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onConfirmLockAsIs,
  rectangleLabel 
}) => {
  // Default to re-layout option as it's more commonly desired behavior
  const [lockType, setLockType] = useState<'lock-as-is' | 'lock-and-relayout'>('lock-and-relayout');
  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (lockType === 'lock-as-is') {
      onConfirmLockAsIs();
    } else {
      onConfirm();
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
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
              Choose how to lock the automatic layout for <strong>"{rectangleLabel}"</strong>:
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="lockType"
                  value="lock-as-is"
                  checked={lockType === 'lock-as-is'}
                  onChange={(e) => setLockType(e.target.value as 'lock-as-is' | 'lock-and-relayout')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Archive size={16} className="text-blue-600" />
                    <span className="font-medium text-gray-900">Lock as-is</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Preserve current positions. Children stay exactly where they are now.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="lockType"
                  value="lock-and-relayout"
                  checked={lockType === 'lock-and-relayout'}
                  onChange={(e) => setLockType(e.target.value as 'lock-as-is' | 'lock-and-relayout')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Lock size={16} className="text-gray-600" />
                    <span className="font-medium text-gray-900">Lock and re-layout</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Apply automatic layout. All children will be repositioned using the grid system.
                  </p>
                </div>
              </label>
            </div>
            
            {lockType === 'lock-and-relayout' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">This will reset all manual positioning!</p>
                    <p>Any manual positioning you've done will be lost.</p>
                  </div>
                </div>
              </div>
            )}
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
            {lockType === 'lock-as-is' ? <Archive size={16} /> : <Lock size={16} />}
            <span>{lockType === 'lock-as-is' ? 'Lock as-is' : 'Lock and Re-layout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockConfirmationModal;