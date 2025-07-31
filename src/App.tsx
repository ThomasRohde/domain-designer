import { Routes, Route, useLocation } from 'react-router-dom';
import HierarchicalDrawingApp from './components/HierarchicalDrawingApp';
import ViewerPage from './components/ViewerPage';
import URLViewerPage from './components/URLViewerPage';

/**
 * Root component that handles URL parameter detection at any route level.
 * GitHub Pages sometimes loses the /viewer path, so we detect URL params everywhere.
 */
function RootHandler() {
  const location = useLocation();
  const urlParam = new URLSearchParams(location.search).get('url');
  
  if (urlParam) {
    return <URLViewerPage />;
  }
  
  return <HierarchicalDrawingApp />;
}

/**
 * Root application component with routing configuration
 * 
 * Provides routes:
 * - "/" - Handles both main editor AND URL-based viewer (via URL param detection)
 * - "/viewer" - Read-only viewer that handles both local storage and URL-based diagrams
 * - "/viewer/*" - Legacy path-based URL viewer (kept for backward compatibility)
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<RootHandler />} />
      <Route path="/viewer" element={<ViewerPage />} />
      <Route path="/viewer/*" element={<URLViewerPage />} />
    </Routes>
  );
}

export default App;