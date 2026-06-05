import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrainStatus } from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined leading-none select-none ${className}`}>{name}</span>;
}

/** Add `delay` minutes to a "HH:MM" string, return new "HH:MM" string */
function addDelayToTime(hhmm, delayMin) {
  if (!hhmm || !delayMin) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + delayMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const DELAY_CONFIG = {
  none:      { label: 'On Time',          color: 'text-emerald-400', badge: 'bg-emerald-900/50 border-emerald-700 text-emerald-300', dot: 'bg-emerald-400' },
  minor:     { label: 'Minor Delay',      color: 'text-amber-400',   badge: 'bg-amber-900/50 border-amber-700 text-amber-300',       dot: 'bg-amber-400'   },
  moderate:  { label: 'Running Late',     color: 'text-orange-400',  badge: 'bg-orange-900/50 border-orange-700 text-orange-300',    dot: 'bg-orange-400'  },
  heavy:     { label: 'Heavily Delayed',  color: 'text-red-400',     badge: 'bg-red-900/50 border-red-700 text-red-300',             dot: 'bg-red-400'     },
};

function getDelayConfig(mins) {
  if (mins <= 0)   return DELAY_CONFIG.none;
  if (mins <= 15)  return DELAY_CONFIG.minor;
  if (mins <= 30)  return DELAY_CONFIG.moderate;
  return            DELAY_CONFIG.heavy;
}

// ─── Cockpit header ───────────────────────────────────────────────────────────

function CockpitHeader({ train }) {
  const dc = getDelayConfig(train.currentDelay);
  const trendIcon = train.delayTrend === 'DECREASING' ? 'trending_down'
    : train.delayTrend === 'INCREASING' ? 'trending_up' : 'trending_flat';
  const trendColor = train.delayTrend === 'DECREASING' ? 'text-emerald-400'
    : train.delayTrend === 'INCREASING' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden mb-4">
      {/* Top bar */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              LIVE TRACKING
            </span>
            <span className="inline-flex items-center gap-1 bg-red-900/40 border border-red-800/60
                             rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-slow" />
              <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">LIVE</span>
            </span>
          </div>
          <h2 className="text-white font-black text-xl leading-tight">{train.trainName}</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            #{train.trainNo} · {train.trainType} · {train.runDate}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {train.origin.name} → {train.destination.name}
          </p>
        </div>

        {/* Delay badge */}
        <div className="flex flex-col items-end gap-1.5">
          <div className={`inline-flex items-center gap-2 border rounded-xl px-3 py-1.5 ${dc.badge}`}>
            <span className={`w-2 h-2 rounded-full ${dc.dot} animate-ping-once`} />
            <span className="font-black text-sm">
              {train.currentDelay > 0 ? `+${train.currentDelay} min` : 'On Time'}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] font-bold ${trendColor}`}>
            <Icon name={trendIcon} className="text-[14px]" />
            <span>{train.delayTrend.toLowerCase().replace('_', ' ')} trend</span>
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div className="px-5 pb-2">
        <div className="relative h-1.5 bg-slate-700 rounded-full mb-1">
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(train.progressPercent, 100)}%` }}
          />
          {/* Animated position marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${Math.min(train.progressPercent, 97)}%` }}
          >
            <span className="absolute inset-0 rounded-full bg-orange-400/50 scale-150 animate-ping-once" />
            <div className="relative w-4 h-4 rounded-full bg-orange-400 border-2 border-slate-900
                            shadow-lg shadow-orange-500/40" />
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] font-bold text-slate-500">{train.origin.code}</span>
          <span className="text-[10px] font-semibold text-slate-600">
            {train.progressPercent.toFixed(1)}% complete
          </span>
          <span className="text-[10px] font-bold text-slate-500">{train.destination.code}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border-t border-slate-800 divide-x divide-slate-800">
        {[
          { label: 'Avg Speed', value: `${train.speedKmh} km/h`,  icon: 'speed'    },
          { label: 'Covered',   value: `${train.distanceCoveredKm.toLocaleString()} km`, icon: 'straighten' },
          { label: 'Remaining', value: `${(train.totalDistanceKm - train.distanceCoveredKm).toLocaleString()} km`, icon: 'route' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3 flex flex-col items-center text-center">
            <Icon name={s.icon} className="text-slate-500 text-[16px] mb-0.5" />
            <p className="text-white font-black text-sm leading-tight">{s.value}</p>
            <p className="text-slate-500 text-[9px] uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Zone footer */}
      <div className="px-5 py-2.5 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 font-medium">
          <Icon name="corporate_fare" className="text-[12px] mr-1" />
          {train.currentZone} · Updated {train.lastUpdatedLabel}
        </p>
      </div>
    </div>
  );
}

// ─── Current station callout ──────────────────────────────────────────────────

function CurrentStationCard({ stop, delay }) {
  return (
    <div className="relative bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-4
                    overflow-hidden">
      {/* Subtle animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-100/60 to-transparent
                      pointer-events-none animate-pulse-slow" />

      <div className="relative flex items-center gap-4">
        {/* Pulsing icon */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-orange-300/40 animate-ping-once" />
          <div className="relative w-14 h-14 rounded-full bg-orange-400 flex items-center
                          justify-center shadow-lg shadow-orange-300/50">
            <Icon name="location_on" className="text-white text-[28px]" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-[0.15em]">
              Train is currently at
            </span>
            <span className="text-[9px] font-black bg-orange-400 text-white px-2 py-0.5
                             rounded-full uppercase">LIVE</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 leading-tight truncate">
            {stop.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm font-bold text-slate-600">{stop.code}</span>
            {stop.platform && (
              <span className="text-xs text-slate-500 bg-white border border-slate-200
                               rounded-lg px-2 py-0.5 font-bold">
                Platform {stop.platform}
              </span>
            )}
            {delay > 0 && (
              <span className="text-xs font-bold text-orange-600">
                ETA: {addDelayToTime(stop.schArr, delay)} (+{delay} min)
              </span>
            )}
            {delay === 0 && stop.schArr && (
              <span className="text-xs font-bold text-emerald-600">
                Arriving on time at {stop.schArr}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Passed / Upcoming station rows ──────────────────────────────────────────

function PassedRow({ stop }) {
  const hadDelay = stop.delayMin > 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center
                      flex-shrink-0">
        <Icon name="check" className="text-emerald-600 text-[13px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-700 truncate">{stop.name}</p>
        <p className="text-[10px] text-slate-400 font-medium">{stop.code}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-black ${hadDelay ? 'text-amber-600' : 'text-emerald-600'}`}>
          {stop.actDep ?? stop.actArr ?? stop.schDep ?? stop.schArr}
        </p>
        {hadDelay && (
          <p className="text-[9px] text-amber-500 font-bold">+{stop.delayMin} min</p>
        )}
        {!hadDelay && (
          <p className="text-[9px] text-slate-300 font-bold">on time</p>
        )}
      </div>
    </div>
  );
}

function UpcomingRow({ stop, delay }) {
  const expTime = addDelayToTime(stop.schArr ?? stop.schDep, delay);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white
                      flex items-center justify-center flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-600 truncate">{stop.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-400 font-medium">{stop.code}</p>
          {stop.platform && (
            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold rounded px-1 py-px">
              Pf.{stop.platform}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-black text-slate-600">{expTime}</p>
        {delay > 0 && (
          <p className="text-[9px] text-slate-400 font-medium line-through">{stop.schArr ?? stop.schDep}</p>
        )}
      </div>
    </div>
  );
}

// ─── Station split grid ───────────────────────────────────────────────────────

function StationGrid({ stops, delay }) {
  const passed   = stops.filter(s => s.status === 'DEPARTED');
  const upcoming = stops.filter(s => s.status === 'UPCOMING');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Passed */}
      {passed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Passed Stations
            </p>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700
                             px-2 py-0.5 rounded-full">
              {passed.length} done
            </span>
          </div>
          <div>
            {passed.map(s => <PassedRow key={s.code} stop={s} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Upcoming Stops
            </p>
            <span className="text-[10px] font-black bg-slate-100 text-slate-600
                             px-2 py-0.5 rounded-full">
              {upcoming.length} remaining
            </span>
          </div>
          <div>
            {upcoming.map(s => <UpcomingRow key={s.code} stop={s} delay={delay} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LiveSkeleton() {
  const bar = cls => <div className={`rounded-lg bg-slate-700 animate-pulse ${cls}`} />;
  return (
    <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
      {bar('h-6 w-48')}
      {bar('h-4 w-64')}
      <div className="h-2 bg-slate-700 rounded-full mt-4">{bar('h-2 w-1/4')}</div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[1,2,3].map(n => bar(`h-16 rounded-xl key-${n}`))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LiveStatus() {
  const [trainNo, setTrainNo] = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleTrack = useCallback(async () => {
    const clean = trainNo.trim().replace(/\D/g, '');
    if (!clean) { setError('Please enter a train number.'); return; }
    setError('');
    setLoading(true);
    setData(null);
    try {
      const res  = await fetch(`/api/live-status/${clean}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [trainNo]);

  const currentStop = data?.stops?.find(s => s.status === 'CURRENT');

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Page heading ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Live Train Status</h1>
            <p className="text-slate-400 text-sm">Real-time position · Delay · Upcoming stops</p>
          </div>
        </div>

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex gap-2
                        shadow-sm mb-8">
          <input
            value={trainNo}
            onChange={e => setTrainNo(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleTrack()}
            placeholder="Enter train number  (e.g. 12487)"
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-800
                       placeholder:text-slate-300 placeholder:font-normal
                       bg-transparent outline-none tracking-widest"
          />
          <button
            onClick={handleTrack}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white
                       text-sm font-bold rounded-xl hover:bg-emerald-700 active:scale-95
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <Icon name="progress_activity" className="text-[17px] animate-spin" />
              : <Icon name="my_location" className="text-[17px]" />}
            {loading ? 'Locating…' : 'Track Train'}
          </button>
        </div>

        {/* Demo chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8 -mt-4">
          <span className="text-xs text-slate-400 font-medium">Try:</span>
          {[
            { no: '12487', label: '12487 · Seemanchal (+25 min)' },
            { no: '12533', label: '12533 · Pushpak (On time)'    },
            { no: '12309', label: '12309 · Rajdhani (+10 min)'   },
          ].map(({ no, label }) => (
            <button key={no} onClick={() => setTrainNo(no)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200
                         px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors">
              {label}
            </button>
          ))}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl
                          px-4 py-3 mb-5 text-red-700 text-sm">
            <Icon name="error_outline" className="text-[18px] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && <LiveSkeleton />}

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {data && !loading && (
          <div className="animate-fade-in space-y-4">

            {/* Mission-control cockpit */}
            <CockpitHeader train={data} />

            {/* Current station callout */}
            {currentStop && (
              <CurrentStationCard stop={currentStop} delay={data.currentDelay} />
            )}

            {/* Passed / upcoming grid */}
            <StationGrid stops={data.stops} delay={data.currentDelay} />

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                Mock data · Last updated {data.lastUpdatedLabel}
              </p>
              <Link to="/"
                className="text-xs font-bold text-brand-600 hover:underline">
                Search Routes →
              </Link>
            </div>
          </div>
        )}

        {/* Not found */}
        {error && error.includes('not found') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Icon name="search_off" className="text-slate-300 text-[48px] mb-3" />
            <p className="font-bold text-slate-700">Train not in demo database</p>
            <p className="text-xs text-slate-400 mt-1">Try 12487, 12533, or 12309</p>
          </div>
        )}
      </div>
    </div>
  );
}
