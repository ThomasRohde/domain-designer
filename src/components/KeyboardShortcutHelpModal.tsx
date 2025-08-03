import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { getShortcutsByCategory, formatShortcut } from '../types/shortcuts';

interface KeyboardShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component displaying all available keyboard shortcuts
 * Organized by category for easy discovery and reference
 */
const KeyboardShortcutHelpModal: React.FC<KeyboardShortcutHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcutsByCategory = getShortcutsByCategory();
  const categories = Object.keys(shortcutsByCategory);

  const categoryOrder = ['Editing', 'Selection', 'Navigation', 'View'];
  const orderedCategories = categoryOrder.filter(cat => categories.includes(cat));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Keyboard className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close help modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid gap-6 md:grid-cols-2">
            {orderedCategories.map((category) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcutsByCategory[category].map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700 flex-1">
                        {shortcut.description}
                      </span>
                      <kbd className="inline-flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600 ml-3 whitespace-nowrap">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer tip */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Most shortcuts work context-sensitively. For example, 
              arrow keys move selected rectangles, and Ctrl+A selects all rectangles at 
              the same hierarchy level as your current selection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutHelpModal;