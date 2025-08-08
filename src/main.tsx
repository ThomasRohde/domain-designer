import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { enableMapSet } from 'immer'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import './utils/pwaTestUtils' // Initialize PWA test utilities in development

// Enable Immer MapSet plugin for Set and Map support in state updates
enableMapSet()

/**
 * Global PWA update notification handler state.
 * Maintains connection between service worker update events and UI components.
 * Set by the main App component during initialization.
 */
let globalShowUpdateNotification: ((updateSW: () => void) => void) | null = null;

/**
 * Configures the global update notification handler for PWA updates.
 * Allows the service worker to trigger UI notifications when updates are available.
 * @param handler Function to display update notifications to users
 */
export const setGlobalUpdateNotificationHandler = (handler: (updateSW: () => void) => void) => {
  globalShowUpdateNotification = handler;
  
  // Expose handler globally in development for testing PWA update flows
  if (import.meta.env.DEV) {
    (window as typeof window & { globalShowUpdateNotification?: typeof handler }).globalShowUpdateNotification = handler;
  }
};

/**
 * Progressive Web App service worker registration with update handling.
 * Manages caching strategies, offline functionality, and version updates.
 * Provides user-friendly notifications for available updates.
 */
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available - showing update notification');
    // Display user-friendly update notification with action button
    if (globalShowUpdateNotification) {
      globalShowUpdateNotification(() => {
        console.log('User requested immediate update');
        updateSW(true); // Force immediate update and reload
      });
    } else {
      // Graceful fallback when UI handler isn't initialized yet
      console.log('Update notification handler not ready, will update on next app start');
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true // Enable immediate SW registration for faster offline capability
});

/**
 * Dynamic base path configuration for deployment environments.
 * Handles GitHub Pages deployment with custom path while maintaining
 * local development compatibility with root path.
 */
const basename = import.meta.env.PROD && import.meta.env.BASE_URL === '/domain-designer/' ? '/domain-designer' : '/';

/**
 * React 18 concurrent root initialization with rehydration safety.
 * Prevents multiple root creation during hot module replacement in development.
 * Caches root instance on DOM element to ensure single root per container.
 */
interface ContainerWithRoot extends HTMLElement {
  _reactRoot?: ReactDOM.Root;
}

const container = document.getElementById('root')! as ContainerWithRoot;
let root = container._reactRoot;
if (!root) {
  root = ReactDOM.createRoot(container);
  container._reactRoot = root;
}


root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)