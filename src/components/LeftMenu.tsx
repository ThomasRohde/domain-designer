import React from 'react';
import { Info, FileText, Trash2, HelpCircle, Eye, FolderTree } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import MobileOverlay from './MobileOverlay';

interface LeftMenuProps {
  /** Handler for opening about dialog */
  onAboutClick: () => void;
  /** Handler for opening templates interface */
  onTemplatesClick: () => void;
  /** Optional handler for clearing saved application data */
  onClearSavedData?: () => void;
}

/**
 * Left-side slide-out navigation menu with consistent styling and responsive behavior.
 * Provides access to secondary application features and navigation options.
 * Features include templates, viewer mode, help system, and data management.
 */
const LeftMenu: React.FC<LeftMenuProps> = ({ onAboutClick, onTemplatesClick, onClearSavedData }) => {
  const isOpen = useAppStore(state => state.ui.leftMenuOpen);
  const onClose = useAppStore(state => state.uiActions.closeLeftMenu);
  const onHelpClick = useAppStore(state => state.uiActions.openHelpModal);
  const toggleHierarchyOutline = useAppStore(state => state.uiActions.toggleHierarchyOutline);
  
  const handleHierarchyOutlineClick = () => {
    toggleHierarchyOutline();
    onClose(); // Close the left menu when opening hierarchy outline
  };
  return (
    <>
      {/* Left-side navigation menu with slide-in animation */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:fixed
        top-16 left-0 bottom-0 z-40
        w-64 bg-gray-50 shadow-xl
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden p-4 border-b bg-white">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">Menu</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation menu items with consistent styling and hover effects */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={onTemplatesClick}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <FileText size={16} />
            <span>Templates</span>
          </button>
          
          <button
            onClick={handleHierarchyOutlineClick}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <FolderTree size={16} />
            <span>Hierarchy Outline</span>
          </button>
          
          {/* Router Link for viewer mode with automatic menu close */}
          <Link
            to="/viewer"
            onClick={onClose}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Eye size={16} />
            <span>Viewer Mode</span>
          </Link>
          
          <button
            onClick={onHelpClick}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <HelpCircle size={16} />
            <span>Help</span>
          </button>
          
          <button
            onClick={onAboutClick}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Info size={16} />
            <span>About</span>
          </button>

          {/* Destructive action separated by visual divider and styled with warning colors */}
          {onClearSavedData && (
            <>
              <div className="border-t border-gray-200 my-2"></div>
              <button
                onClick={onClearSavedData}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 size={16} />
                <span>Clear Saved Data</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile overlay when menu is open */}
      <MobileOverlay isVisible={isOpen} onClick={onClose} />
    </>
  );
};

export default React.memo(LeftMenu);