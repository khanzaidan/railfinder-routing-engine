import { Link } from 'react-router-dom';

function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none ${className}`}>{name}</span>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <Icon name="train" className="text-white text-[16px]" />
              </div>
              <span className="text-base font-black text-white">
                Rail<span className="text-brand-400">Finder</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              India's smartest train route planner.
              Compare connections, track live status, and plan every journey.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
              Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Icon name="search" className="text-[13px]" /> Route Search
                </Link>
              </li>
              <li>
                <Link to="/live-status" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Icon name="location_on" className="text-[13px]" /> Live Train Status
                </Link>
              </li>
              <li>
                <Link to="/pnr-status" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Icon name="receipt_long" className="text-[13px]" /> PNR Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-xs">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
                <li key={l}>
                  <a href="#" className="hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row
                        items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {year} RailFinder. Not affiliated with Indian Railways or IRCTC.</p>
          <p className="flex items-center gap-1">
            Built with
            <Icon name="favorite" className="text-red-500 text-[13px]" />
            for Indian travellers
          </p>
        </div>
      </div>
    </footer>
  );
}
