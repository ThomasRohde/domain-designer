/**
 * PWA Update Testing Utilities
 * Utilities for testing and validating PWA update functionality
 */

// Development-only flag to simulate update scenarios
const isDevelopment = import.meta.env.DEV;

/**
 * Simulates an available update for testing purposes
 * Only works in development mode
 */
export const simulateUpdateAvailable = () => {
  if (!isDevelopment) {
    console.warn('simulateUpdateAvailable() only works in development mode');
    return;
  }

  // Dispatch a custom event that mimics the service worker update
  const event = new CustomEvent('sw-update-available', {
    detail: {
      type: 'test',
      message: 'Simulated update for testing'
    }
  });
  
  window.dispatchEvent(event);
  console.log('Simulated PWA update available event dispatched');
};

/**
 * Tests the update notification system
 */
export const testUpdateNotification = () => {
  if (!isDevelopment) {
    console.warn('testUpdateNotification() only works in development mode');
    return;
  }

  // Find the global update handler
  const globalHandler = (window as typeof window & { globalShowUpdateNotification?: (updateSW: () => void) => void }).globalShowUpdateNotification;
  
  if (globalHandler) {
    const mockUpdateFunction = () => {
      console.log('Mock update function called');
      setTimeout(() => {
        console.log('Mock update completed - would normally reload page');
      }, 2000);
    };
    
    globalHandler(mockUpdateFunction);
    console.log('Test update notification triggered');
  } else {
    console.error('Global update notification handler not found');
  }
};

/**
 * Validates PWA installation status
 */
export const validatePWAInstallation = () => {
  const results = {
    serviceWorkerSupported: 'serviceWorker' in navigator,
    serviceWorkerActive: false,
    cacheAPISupported: 'caches' in window,
    notificationSupported: 'Notification' in window,
    installPromptSupported: 'BeforeInstallPromptEvent' in window,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    userAgent: navigator.userAgent,
  };

  // Check if service worker is active
  if (results.serviceWorkerSupported && navigator.serviceWorker.controller) {
    results.serviceWorkerActive = true;
  }

  console.log('PWA Installation Validation Results:', results);
  return results;
};

/**
 * Tests offline functionality
 */
export const testOfflineCapabilities = async () => {
  if (!isDevelopment) {
    console.warn('testOfflineCapabilities() only works in development mode');
    return;
  }

  const results = {
    cacheStorage: false,
    indexedDB: false,
    localStorage: false,
    networkStatus: navigator.onLine,
  };

  // Test Cache Storage
  try {
    const cache = await caches.open('test-cache');
    await cache.put('/test', new Response('test'));
    await cache.delete('/test');
    results.cacheStorage = true;
  } catch (error) {
    console.warn('Cache Storage test failed:', error);
  }

  // Test IndexedDB (simplified)
  try {
    const request = indexedDB.open('test-db', 1);
    request.onsuccess = () => {
      results.indexedDB = true;
      request.result.close();
      indexedDB.deleteDatabase('test-db');
    };
  } catch (error) {
    console.warn('IndexedDB test failed:', error);
  }

  // Test localStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    results.localStorage = true;
  } catch (error) {
    console.warn('localStorage test failed:', error);
  }

  console.log('Offline Capabilities Test Results:', results);
  return results;
};

/**
 * Monitors service worker update lifecycle
 */
export const monitorServiceWorkerUpdates = () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed - new version active');
  });

  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      console.log('Service Worker update found');
      
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('Service Worker state changed to:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker installed, waiting to activate');
          }
        });
      }
    });
  });

  console.log('Service Worker update monitoring enabled');
};

const testUtils = {
  simulateUpdateAvailable,
  testUpdateNotification,
  validatePWAInstallation,
  testOfflineCapabilities,
  monitorServiceWorkerUpdates,
};

// Development-only: Add utilities to window for easy testing
if (isDevelopment) {
  (window as typeof window & { pwaTestUtils?: typeof testUtils }).pwaTestUtils = testUtils;
  
  console.log('PWA test utilities available in development mode. Use window.pwaTestUtils');
}