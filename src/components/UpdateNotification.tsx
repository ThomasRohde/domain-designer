import React, { useCallback } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { UpdateNotificationState } from '../types';

interface UpdateNotificationProps {
  updateNotification: UpdateNotificationState;
}

/**
 * PWA Update Notification Component
 * Shows a banner when app updates are available with options to update now or later
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ updateNotification }) => {
  const { isUpdateAvailable, isUpdating, updateServiceWorker, dismiss } = updateNotification;

  const handleUpdateNow = useCallback(() => {
    if (updateServiceWorker && !isUpdating) {
      // Set updating state to provide immediate user feedback
      updateNotification.isUpdating = true;
      
      try {
        updateServiceWorker();
        // PWA will automatically reload page after service worker activates
      } catch (error) {
        console.error('Failed to update service worker:', error);
        // Reset updating state on error to allow retry
        updateNotification.isUpdating = false;
      }
    }
  }, [updateServiceWorker, isUpdating, updateNotification]);

  const handleDismiss = useCallback(() => {
    if (dismiss && !isUpdating) {
      dismiss();
    }
  }, [dismiss, isUpdating]);

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isUpdating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {isUpdating ? 'Updating Domain Designer...' : 'New version available!'}
              </div>
              <div className="text-xs text-blue-100">
                {isUpdating 
                  ? 'Please wait while we update the app.' 
                  : 'A new version of Domain Designer is ready to install.'
                }
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isUpdating && (
            <>
              <button
                onClick={handleUpdateNow}
                className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                disabled={isUpdating}
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-100 hover:text-white p-1.5 rounded hover:bg-blue-700 transition-colors"
                aria-label="Dismiss update notification"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {isUpdating && (
            <div className="text-sm text-blue-100">
              The app will reload automatically when ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
};