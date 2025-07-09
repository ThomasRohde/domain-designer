import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Save, Check } from 'lucide-react';

interface OfflineIndicatorProps {
  lastSaved?: number | null;
  autoSaveEnabled?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  lastSaved, 
  autoSaveEnabled = true 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (lastSaved) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowSavedIndicator(false);
    }
  }, [lastSaved]);

  const formatLastSaved = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      {/* Network Status */}
      <div className="flex items-center gap-1">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Auto-save Status */}
      {autoSaveEnabled && (
        <div className="flex items-center gap-1">
          <div className="w-px h-4 bg-gray-300" />
          {showSavedIndicator ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Saved</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-gray-500" />
              <span>
                {lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : 'Auto-save ready'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;