import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { EditorRoute } from './routes/editor/EditorRoute';
import { PresentRoute } from './routes/present/PresentRoute';
import { RemoteRoute } from './routes/remote/RemoteRoute';
import { ViewRoute } from './routes/view/ViewRoute';
import { usePresentationStore } from './store/presentationStore';

export function App() {
  const restore = usePresentationStore((s) => s.restoreAutosave);

  useEffect(() => {
    restore();
  }, [restore]);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <h1>Prsnt</h1>
        <nav>
          <Link to="/editor">Editor</Link>
          <Link to="/present">Present</Link>
          <Link to="/remote">Remote</Link>
          <Link to="/view">View</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="/editor" element={<EditorRoute />} />
          <Route path="/present" element={<PresentRoute />} />
          <Route path="/remote" element={<RemoteRoute />} />
          <Route path="/view" element={<ViewRoute />} />
        </Routes>
      </main>
    </div>
  );
}
