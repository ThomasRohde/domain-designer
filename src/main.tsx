import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import './utils/pwaTestUtils' // Initialize PWA test utilities in development

// Global update notification handler - will be set by App component
let globalShowUpdateNotification: ((updateSW: () => void) => void) | null = null;

// Export function to set the update notification handler
export const setGlobalUpdateNotificationHandler = (handler: (updateSW: () => void) => void) => {
  globalShowUpdateNotification = handler;
  
  // Make handler available for testing in development
  if (import.meta.env.DEV) {
    (window as typeof window & { globalShowUpdateNotification?: typeof handler }).globalShowUpdateNotification = handler;
  }
};

// Register service worker with enhanced update handling
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available - showing update notification');
    // Show user-friendly update notification instead of just logging
    if (globalShowUpdateNotification) {
      globalShowUpdateNotification(() => {
        console.log('User requested immediate update');
        updateSW(true); // Force update immediately
      });
    } else {
      // Fallback for when notification handler isn't ready yet
      console.log('Update notification handler not ready, will update on next app start');
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true
});

// Get base path for GitHub Pages deployment
const basename = import.meta.env.PROD && import.meta.env.BASE_URL === '/domain-designer/' ? '/domain-designer' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)