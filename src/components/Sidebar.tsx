import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import MobileOverlay from './MobileOverlay';

interface SidebarProps {
  /** Content to render within the sidebar (typically PropertyPanel) */
  children: React.ReactNode;
}

/**
 * Responsive sidebar component with slide-in animation and mobile overlay support.
 * Features adaptive behavior: fixed positioning with overlay on mobile/tablet,
 * integrated layout on desktop. Includes mobile-specific close button and
 * accessibility considerations for touch interfaces.
 */
const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const isOpen = useAppStore(state => state.ui.sidebarOpen);
  const onClose = useAppStore(state => state.uiActions.closeSidebar);
  return (
    <>
      {/* Fixed-position sidebar with slide animation from right edge */}
      <div className={`
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        fixed lg:fixed
        top-16 right-0 bottom-0 z-40
        w-96 bg-gray-50 shadow-xl
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Mobile-only header with integrated close button */}
        <div className="lg:hidden p-4 border-b bg-white">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">Properties</span>
            {/* X icon for clear close action indication */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area with consistent spacing */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Modal overlay for mobile interaction - blocks background interaction */}
      <MobileOverlay isVisible={isOpen} onClick={onClose} />
    </>
  );
};

export default React.memo(Sidebar);
