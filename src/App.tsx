import { Routes, Route } from 'react-router-dom';
import HierarchicalDrawingApp from './components/HierarchicalDrawingApp';
import ViewerPage from './components/ViewerPage';
import URLViewerPage from './components/URLViewerPage';

/**
 * Root application component with routing configuration
 * 
 * Provides three main routes:
 * - "/" - Full editor interface with all editing capabilities
 * - "/viewer" - Read-only viewer for displaying saved diagrams from local storage
 * - "/viewer/*" - Read-only viewer for displaying diagrams loaded from URL parameter
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HierarchicalDrawingApp />} />
      <Route path="/viewer/*" element={<URLViewerPage />} />
      <Route path="/viewer" element={<ViewerPage />} />
    </Routes>
  );
}

export default App;