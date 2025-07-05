import React from 'react';
import MobileOverlay from './MobileOverlay';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, children }) => {
  return (
    <>
      {/* Responsive Sidebar */}
      <div className={`
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        fixed lg:fixed
        top-16 right-0 bottom-0 z-40
        w-80 bg-gray-50 shadow-xl
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden p-4 border-b bg-white">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">Properties</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Mobile overlay when sidebar is open */}
      <MobileOverlay isVisible={isOpen} onClick={onClose} />
    </>
  );
};

export default React.memo(Sidebar);
