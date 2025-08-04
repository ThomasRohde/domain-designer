import React from 'react';
import { Undo2, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Temporary undo button that appears after automatic layout changes.
 * Provides users with a safety net to quickly revert unwanted layout applications.
 * Auto-hides after 5 seconds or on next user action.
 */
const LayoutUndoButton: React.FC = () => {
  const layoutUndo = useAppStore(state => state.ui.layoutUndo);
  const performLayoutUndo = useAppStore(state => state.uiActions.performLayoutUndo);
  const hideLayoutUndo = useAppStore(state => state.uiActions.hideLayoutUndo);
  
  if (!layoutUndo?.isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[100001] animate-in slide-in-from-top-2 duration-300">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg border border-blue-700 flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Undo2 size={16} />
          <span className="font-medium">Layout applied</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={performLayoutUndo}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            Undo
          </button>
          
          <button
            onClick={hideLayoutUndo}
            className="text-blue-200 hover:text-white transition-colors p-1"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutUndoButton;