import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import LiveStatus from './pages/LiveStatus';
import './App.css';

// ─── Global Nav Bar ───────────────────────────────────────────────────────────
// Uses NavLink so the active route gets an underline automatically.

function GlobalNav() {
  const base =
    'flex items-center gap-8 h-full';

  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-primary font-bold border-b-2 border-primary pb-1 font-label-lg text-label-lg'
      : 'text-on-surface-variant font-label-lg text-label-lg hover:text-primary transition-colors duration-200';

  return (
    <header className="sticky top-0 z-50 bg-surface shadow-sm h-16">
      <div className="flex justify-between items-center w-full px-gutter max-w-max-width-content mx-auto h-full">
        {/* Logo + nav links */}
        <div className={base}>
          <NavLink to="/" className="font-headline-lg text-headline-lg font-black text-primary no-underline">
            RailFinder
          </NavLink>
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>
              Trips
            </NavLink>
            <NavLink to="/status" className={linkClass}>
              Live Status
            </NavLink>
            <a
              href="#"
              className="text-on-surface-variant font-label-lg text-label-lg hover:text-primary transition-colors duration-200"
            >
              Help
            </a>
          </nav>
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <GlobalNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<LiveStatus />} />
      </Routes>
    </BrowserRouter>
  );
}
