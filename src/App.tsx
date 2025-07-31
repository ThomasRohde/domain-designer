import { Routes, Route } from 'react-router-dom';
import HierarchicalDrawingApp from './components/HierarchicalDrawingApp';
import ViewerPage from './components/ViewerPage';
import URLViewerPage from './components/URLViewerPage';

/**
 * Root application component with routing configuration
 * 
 * Provides three main routes:
 * - "/" - Full editor interface with all editing capabilities  
 * - "/viewer" - Read-only viewer that handles both local storage and URL-based diagrams
 * - "/viewer/*" - Legacy path-based URL viewer (kept for backward compatibility)
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HierarchicalDrawingApp />} />
      <Route path="/viewer" element={<ViewerPage />} />
      <Route path="/viewer/*" element={<URLViewerPage />} />
    </Routes>
  );
}

export default App;