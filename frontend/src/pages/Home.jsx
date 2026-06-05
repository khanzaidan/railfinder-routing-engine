import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined leading-none select-none ${className}`}>{name}</span>;
}

const POPULAR_ROUTES = [
  { src: 'JBN', dst: 'RKMP', label: 'Jogbani → Bhopal',      time: '~35h', icon: 'train'   },
  { src: 'JBN', dst: 'HWH',  label: 'Jogbani → Howrah',      time: '~15h', icon: 'directions_railway' },
  { src: 'JBN', dst: 'BPL',  label: 'Jogbani → Bhopal Jn',   time: '~36h', icon: 'route'   },
  { src: 'JBN', dst: 'NDLS', label: 'Jogbani → New Delhi',    time: '~31h', icon: 'location_city' },
];

const STATS = [
  { value: '8+',    label: 'Stations',        icon: 'hub'         },
  { value: '20+',   label: 'Train Edges',      icon: 'route'       },
  { value: '45 min', label: 'Min. Layover',    icon: 'schedule'    },
  { value: '12 h',  label: 'Max. Layover',     icon: 'timer'       },
];

export default function Home() {
  const navigate  = useNavigate();
  const today     = new Date().toISOString().split('T')[0];

  const [source,      setSource]     = useState('JBN');
  const [destination, setDest]       = useState('RKMP');
  const [travelDate,  setDate]       = useState('2026-06-11');
  const [error,       setError]      = useState('');

  function search(src = source, dst = destination, dt = travelDate) {
    if (!src.trim() || !dst.trim() || !dt) {
      setError('Please fill in all three fields.');
      return;
    }
    setError('');
    navigate(`/results?source=${src.toUpperCase()}&destination=${dst.toUpperCase()}&date=${dt}`);
  }

  return (
    <div className="bg-slate-50">

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600
                          text-white px-4 sm:px-6 pt-14 pb-28 text-center">
        <div className="max-w-content mx-auto">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-white/10 border border-white/20 text-white/80 text-xs
                          font-semibold mb-6">
            <Icon name="bolt" className="text-yellow-300 text-[14px]" />
            Graph-Powered · API-Ready · Real-World Constraints
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Find Your Perfect
            <br />
            <span className="text-yellow-300">Train Connection</span>
          </h1>

          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Modified BFS with absolute-time math — handles midnight wraps,
            multi-day journeys and running-day validation at any scale.
          </p>

          {/* Search card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100
                            flex flex-col md:flex-row items-stretch md:items-center">

              {/* From */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3
                              border-b md:border-b-0 md:border-r border-slate-200 min-w-0">
                <Icon name="train" className="text-brand-600 text-[20px] flex-shrink-0" />
                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">From</p>
                  <input
                    value={source}
                    onChange={e => setSource(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder="e.g. JBN"
                    className="w-full text-sm font-bold text-slate-800 bg-transparent
                               border-none outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* To */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3
                              border-b md:border-b-0 md:border-r border-slate-200 min-w-0">
                <Icon name="location_on" className="text-brand-600 text-[20px] flex-shrink-0" />
                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">To</p>
                  <input
                    value={destination}
                    onChange={e => setDest(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder="e.g. RKMP"
                    className="w-full text-sm font-bold text-slate-800 bg-transparent
                               border-none outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3
                              border-b md:border-b-0 md:border-r border-slate-200 min-w-0">
                <Icon name="calendar_today" className="text-brand-600 text-[20px] flex-shrink-0" />
                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date</p>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-sm font-bold text-slate-800 bg-transparent
                               border-none outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="p-2">
                <button
                  onClick={() => search()}
                  className="w-full md:w-auto bg-brand-600 text-white px-6 py-3 rounded-xl
                             font-bold shadow-md hover:bg-brand-700 active:scale-95 transition-all
                             flex items-center justify-center gap-2"
                >
                  <Icon name="search" className="text-[18px]" />
                  Search Trains
                </button>
              </div>
            </div>

            {error && <p className="mt-3 text-red-200 text-sm">{error}</p>}

            <p className="text-blue-200/60 text-xs mt-3">
              Try <strong className="text-white">JBN → HWH</strong> to see the Katihar hub,
              or <strong className="text-white">JBN → RKMP</strong> for 2-stop routes via Patna.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <div className="max-w-content mx-auto px-4 sm:px-6 -mt-8 mb-4 z-10 relative">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg
                        grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 px-3 gap-1">
              <Icon name={s.icon} className="text-brand-500 text-[20px]" />
              <p className="text-lg font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Popular routes ──────────────────────────────────── */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pb-8">
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
          Popular Routes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {POPULAR_ROUTES.map(r => (
            <button
              key={`${r.src}-${r.dst}`}
              onClick={() => search(r.src, r.dst, travelDate)}
              className="group bg-white rounded-xl border border-slate-200 p-4 text-left
                         shadow-sm hover:shadow-md hover:border-brand-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon name={r.icon} className="text-brand-600 text-[20px]" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100
                                 px-2 py-0.5 rounded-full">{r.time}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 mb-0.5">{r.label}</p>
              <p className="text-[10px] text-slate-400">
                {r.src} → {r.dst}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold
                              text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Search now <Icon name="arrow_forward" className="text-[13px]" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────── */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
          More Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/live-status"
            className="group bg-gradient-to-br from-emerald-50 to-teal-50 border
                       border-emerald-200 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center
                              justify-center flex-shrink-0">
                <Icon name="location_on" className="text-emerald-600 text-[26px]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-800">Live Train Status</h3>
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-800
                                   px-2 py-0.5 rounded-full">MOCK LIVE</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Vertical delivery-tracker timeline showing current position,
                  delay, and remaining stops.
                </p>
              </div>
            </div>
          </Link>

          <Link to="/pnr-status"
            className="group bg-gradient-to-br from-violet-50 to-purple-50 border
                       border-violet-200 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center
                              justify-center flex-shrink-0">
                <Icon name="receipt_long" className="text-violet-600 text-[26px]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-800">PNR Status</h3>
                  <span className="text-[10px] font-black bg-violet-200 text-violet-800
                                   px-2 py-0.5 rounded-full">MOCK DATA</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter any 10-digit PNR to see a mock booking confirmation
                  with coach, seat and passenger details.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
