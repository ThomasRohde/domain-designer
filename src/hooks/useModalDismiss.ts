import React, { useEffect, useCallback } from 'react';

/**
 * Custom hook for handling modal dismissal via ESC key and click outside.
 * Provides universal modal behavior regardless of focus state.
 * 
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Callback function to close the modal
 */
export const useModalDismiss = (
  isOpen: boolean,
  onClose: () => void
) => {
  // Handle ESC key press globally
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    // Add event listener to document to catch ESC regardless of focus
    document.addEventListener('keydown', handleEscapeKey, true);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey, true);
    };
  }, [isOpen, onClose]);

  // Handle click outside modal
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    // If clicking on the backdrop (not the modal content), close the modal
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return { handleBackdropClick };
};