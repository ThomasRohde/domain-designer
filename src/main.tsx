import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker
registerSW({
  onNeedRefresh() {
    console.log('New content available, will update on next app start');
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