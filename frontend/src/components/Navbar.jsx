import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',            label: 'Search',      icon: 'search',      end: true },
  { to: '/live-status', label: 'Live Status', icon: 'location_on',  end: false },
  { to: '/pnr-status',  label: 'PNR Status',  icon: 'receipt_long', end: false },
];

function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const desktopLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-1.5 px-1 py-1 text-sm font-semibold rounded',
      'transition-colors duration-150',
      isActive
        ? 'text-brand-600'
        : 'text-slate-600 hover:text-brand-600',
    ].join(' ');

  const mobileLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl',
      'transition-colors duration-150',
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-700 hover:bg-slate-100',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center
                            group-hover:bg-brand-700 transition-colors">
              <Icon name="train" className="text-white text-[18px]" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Rail<span className="text-brand-600">Finder</span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end} className={desktopLinkClass}>
                {({ isActive }) => (
                  <>
                    <Icon
                      name={icon}
                      className={`text-[17px] ${isActive ? 'text-brand-600' : 'text-slate-500'}`}
                    />
                    <span>{label}</span>
                    {/* Active underline pill */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://www.irctc.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
            >
              Book on IRCTC ↗
            </a>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                         bg-brand-600 text-white text-sm font-bold shadow-sm
                         hover:bg-brand-700 active:scale-95 transition-all"
            >
              <Icon name="search" className="text-[16px]" />
              Search Trains
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} className="text-[24px]" />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white animate-fade-in">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={mobileLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icon name={icon} className="text-[20px] text-current" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 pb-4">
            <a
              href="https://www.irctc.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3
                         bg-brand-600 text-white text-sm font-bold rounded-xl
                         hover:bg-brand-700 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <Icon name="confirmation_number" className="text-[18px]" />
              Book on IRCTC
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
