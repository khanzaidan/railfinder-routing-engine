import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout       from './components/Layout';
import Home         from './pages/Home';
import SearchResults from './pages/SearchResults';
import LiveStatus   from './pages/LiveStatus';
import PnrStatus    from './pages/PnrStatus';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All pages share the Layout (Navbar + Footer) */}
        <Route element={<Layout />}>
          <Route path="/"            element={<Home />} />
          <Route path="/results"     element={<SearchResults />} />
          <Route path="/live-status" element={<LiveStatus />} />
          <Route path="/pnr-status"  element={<PnrStatus />} />

          {/* Legacy /status redirect */}
          <Route path="/status" element={<Navigate to="/live-status" replace />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
