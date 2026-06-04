import { useState, useMemo } from 'react';
import { findOptimalRoutes } from '../services/routingEngine';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined leading-none select-none ${className}`}>
      {name}
    </span>
  );
}

/** "+1d" badge for multi-day times */
function DayBadge({ offset }) {
  if (!offset || offset === 0) return null;
  return (
    <span className="ml-1 inline-block px-1 py-px text-[9px] font-black rounded
                     bg-blue-100 text-blue-700 leading-tight align-middle">
      +{offset}d
    </span>
  );
}

// ─── groupByHub ───────────────────────────────────────────────────────────────
// Pure transformation — never touches routingEngine.js.
// Groups the flat routes array by via station, sorts within each hub and
// across hubs according to sortMode, then injects a cumulative globalRank.

function groupByHub(routes, sortMode) {
  if (!routes || routes.length === 0) return [];

  // 1. Build map keyed by via (null → '__direct__')
  const map = new Map();
  for (const route of routes) {
    const key = route.via ?? '__direct__';
    if (!map.has(key)) {
      map.set(key, {
        via:          route.via,
        viaName:      route.viaName ?? route.via ?? 'Direct',
        incomingLeg:  route.legs[0],   // same originating leg for all rows in hub
        routes:       [],
        bestDuration: Infinity,
        bestLayover:  Infinity,
      });
    }
    const g = map.get(key);
    g.routes.push(route);
    g.bestDuration = Math.min(g.bestDuration, route.totalDurationInMinutes);
    g.bestLayover  = Math.min(g.bestLayover,  route.totalLayoverInMinutes);
  }

  // 2. Sort routes within each hub
  const comparator = sortMode === 'layover'
    ? (a, b) => a.totalLayoverInMinutes  !== b.totalLayoverInMinutes
        ? a.totalLayoverInMinutes  - b.totalLayoverInMinutes
        : a.totalDurationInMinutes - b.totalDurationInMinutes
    : (a, b) => a.totalDurationInMinutes !== b.totalDurationInMinutes
        ? a.totalDurationInMinutes - b.totalDurationInMinutes
        : a.totalLayoverInMinutes  - b.totalLayoverInMinutes;

  for (const g of map.values()) g.routes.sort(comparator);

  // 3. Sort hubs by their best route
  const hubComparator = sortMode === 'layover'
    ? (a, b) => a.bestLayover  !== b.bestLayover  ? a.bestLayover  - b.bestLayover  : a.bestDuration - b.bestDuration
    : (a, b) => a.bestDuration !== b.bestDuration ? a.bestDuration - b.bestDuration : a.bestLayover  - b.bestLayover;

  const groups = [...map.values()].sort(hubComparator);

  // 4. Assign global rank so ConnectingTrainRow can show its position
  let rank = 1;
  for (const g of groups) {
    g.startRank = rank;
    rank += g.routes.length;
  }

  return groups;
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ source, destination, travelDate,
                     onSourceChange, onDestinationChange, onTravelDateChange, onSearch }) {
  const handleKey = (e) => { if (e.key === 'Enter') onSearch(); };

  const field = (icon, label, input) => (
    <div className="flex-1 flex items-center w-full px-4 gap-3
                    border-b md:border-b-0 md:border-r border-slate-200 py-2.5 min-w-0">
      <Icon name={icon} className="text-blue-600 flex-shrink-0 text-[20px]" />
      <div className="flex flex-col w-full min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        {input}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl md:rounded-full shadow-lg border border-slate-200
                    p-2 flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-0">
      {field('train', 'From',
        <input type="text" value={source}
          onChange={e => onSourceChange(e.target.value.toUpperCase())}
          onKeyDown={handleKey} placeholder="e.g. JBN"
          className="text-sm font-bold bg-transparent border-none outline-none
                     text-slate-800 placeholder:text-slate-300 w-full" />
      )}
      {field('location_on', 'To',
        <input type="text" value={destination}
          onChange={e => onDestinationChange(e.target.value.toUpperCase())}
          onKeyDown={handleKey} placeholder="e.g. RKMP"
          className="text-sm font-bold bg-transparent border-none outline-none
                     text-slate-800 placeholder:text-slate-300 w-full" />
      )}
      {field('calendar_today', 'Travel Date',
        <input type="date" value={travelDate}
          onChange={e => onTravelDateChange(e.target.value)}
          className="text-sm font-bold bg-transparent border-none outline-none
                     text-slate-800 w-full cursor-pointer" />
      )}
      <button onClick={onSearch}
        className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-full
                   font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all
                   flex items-center justify-center gap-2 min-w-[148px]">
        <Icon name="search" className="text-[18px]" />
        Search Trains
      </button>
    </div>
  );
}

// ─── Dashboard Header ─────────────────────────────────────────────────────────

function DashboardHeader({ source, destination, travelDate, totalRoutes, totalHubs }) {
  const friendly = (() => {
    try {
      const [y, m, d] = travelDate.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d))
        .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return travelDate; }
  })();

  return (
    <div className="mb-4">
      <h2 className="text-xl font-black text-slate-800 leading-tight">
        <span className="text-blue-600">{source}</span>
        <span className="mx-2 text-slate-400">→</span>
        <span className="text-blue-600">{destination}</span>
      </h2>
      <p className="text-sm text-slate-500 mt-1">
        {friendly}
        <span className="mx-2">·</span>
        <span className="font-semibold text-slate-700">{totalRoutes}</span> routes across{' '}
        <span className="font-semibold text-slate-700">{totalHubs}</span> junction hubs
      </p>
    </div>
  );
}

// ─── Sort Panel ───────────────────────────────────────────────────────────────

function SortPanel({ sortMode, onSort }) {
  const btn = (mode, label, icon) => (
    <button onClick={() => onSort(mode)}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold
                  transition-all ${
        sortMode === mode
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}>
      <Icon name={icon} className="text-[15px]" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">
        Sort hubs &amp; trains by:
      </span>
      {btn('duration', 'Total Duration (Fastest First)', 'speed')}
      {btn('layover',  'Layover Time (Shortest First)',  'schedule')}
    </div>
  );
}

// ─── Incoming Leg Card ────────────────────────────────────────────────────────
// Shows the originating train that ARRIVES at this hub station.

function IncomingLegCard({ leg }) {
  const isJogbani   = leg.trainNo === '13160';
  const borderColor = isJogbani ? 'border-indigo-500' : 'border-blue-500';
  const bgColor     = isJogbani ? 'bg-indigo-50'      : 'bg-blue-50';
  const textColor   = isJogbani ? 'text-indigo-700'   : 'text-blue-700';
  const tagBg       = isJogbani ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className={`rounded-xl border-l-4 ${borderColor} ${bgColor} p-4 mb-4`}>
      {/* Train label row */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon name="train" className={`${textColor} text-[20px]`} />
          <span className={`text-sm font-black ${textColor}`}>
            {leg.trainNo} · {leg.trainName}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagBg}`}>
          ORIGINATING TRAIN
        </span>
      </div>

      {/* Times row */}
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black text-slate-800">{leg.departure}</p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">{leg.from}</p>
          <p className="text-[10px] text-slate-400">{leg.fromName}</p>
        </div>

        {/* Line */}
        <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
          <div className="flex items-center w-full gap-1">
            <div className="flex-1 h-px bg-slate-300" />
            <Icon name="arrow_forward" className="text-slate-400 text-[16px] flex-shrink-0" />
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            arrives hub
          </span>
        </div>

        {/* Arrival */}
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black text-slate-800">
            {leg.arrival}
            <DayBadge offset={leg.arrivalDayOffset} />
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">{leg.to}</p>
          <p className="text-[10px] text-slate-400">{leg.toName}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Connecting Train Row ─────────────────────────────────────────────────────
// One row per connecting train option departing from the hub.

function ConnectingTrainRow({ route, rank, isBest }) {
  const leg2        = route.legs[1];
  const leg1        = route.legs[0];
  const isOvernight = (leg2?.departureDayOffset ?? 0) > (leg1?.arrivalDayOffset ?? 0);

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md
                     transition-shadow overflow-hidden
                     ${isBest ? 'border-emerald-300' : 'border-slate-200'}`}>
      {/* Optional "fastest" banner */}
      {isBest && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5
                        flex items-center gap-2">
          <Icon name="bolt" className="text-emerald-600 text-[16px]" />
          <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wide">
            Fastest Option in this Hub
          </span>
        </div>
      )}

      <div className="px-4 py-4 flex flex-wrap items-start gap-4">

        {/* ── Left: rank + train details ── */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Rank circle */}
          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs
                           font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {rank}
          </span>

          <div className="min-w-0">
            {/* Train name */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Icon name="directions_railway" className="text-slate-500 text-[18px]" />
              <span className="font-black text-sm text-slate-800">
                {leg2?.trainNo} · {leg2?.trainName}
              </span>
            </div>

            {/* Journey times */}
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-800">
                  {leg2?.departure}
                  <DayBadge offset={leg2?.departureDayOffset} />
                </span>
                <span className="text-slate-400 text-xs">{leg2?.from}</span>
              </div>

              <div className="flex items-center gap-0.5 text-slate-300">
                <div className="w-4 h-px bg-slate-200" />
                <Icon name="arrow_forward" className="text-[12px]" />
              </div>

              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-800">
                  {leg2?.arrival}
                  <DayBadge offset={leg2?.arrivalDayOffset} />
                </span>
                <span className="text-slate-400 text-xs">{leg2?.to}</span>
              </div>
            </div>

            {/* Destination full name */}
            <p className="text-[11px] text-slate-400 mt-1">
              Arrives at {leg2?.toName}
            </p>
          </div>
        </div>

        {/* ── Right: layover badge + total + book ── */}
        <div className="flex flex-col items-end gap-2.5 flex-shrink-0 min-w-[130px]">
          {/* Layover badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           border text-xs font-semibold
                           ${isOvernight
                             ? 'bg-orange-50 border-orange-300 text-orange-800'
                             : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <Icon name="schedule" className="text-[14px]" />
            {route.totalLayoverFormatted} layover
            {isOvernight && <span className="ml-1">🌙</span>}
          </div>

          {/* Total duration */}
          <div className="text-right">
            <p className="text-lg font-black text-slate-800 leading-tight">
              {route.totalDurationFormatted}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
              total journey
            </p>
          </div>

          {/* Book button */}
          <button className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white
                             text-xs font-bold shadow-sm hover:bg-blue-700
                             active:scale-95 transition-all flex items-center
                             justify-center gap-1.5">
            <Icon name="confirmation_number" className="text-[14px]" />
            Book on IRCTC
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hub Section ──────────────────────────────────────────────────────────────
// One section per unique intermediate junction station.

function HubSection({ hub }) {
  const [open, setOpen] = useState(true);

  const isJogbani    = hub.incomingLeg?.trainNo === '13160';
  const accentColor  = isJogbani ? 'text-indigo-600'  : 'text-blue-600';
  const accentDot    = isJogbani ? 'bg-indigo-500'     : 'bg-blue-500';
  const countColor   = isJogbani ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700';

  const bestRoute    = hub.routes[0];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

      {/* ── Hub header (collapsible toggle) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4
                   bg-slate-50 border-b border-slate-200 px-5 py-4
                   hover:bg-slate-100 transition-colors text-left">

        <div className="flex items-center gap-3 min-w-0">
          {/* Accent dot */}
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${accentDot}`} />
          <div className="min-w-0">
            <h3 className={`text-base font-black ${accentColor} leading-tight`}>
              Connections via {hub.viaName}
              <span className="ml-2 text-xs font-bold text-slate-400">({hub.via})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Best route:{' '}
              <span className="font-bold text-slate-700">
                {bestRoute.totalDurationFormatted}
              </span>
              {' · '}
              <span className="font-bold text-slate-700">
                {bestRoute.totalLayoverFormatted}
              </span>
              {' '}min layover via{' '}
              <span className="font-semibold">{bestRoute.legs[1]?.trainName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${countColor}`}>
            {hub.routes.length} {hub.routes.length === 1 ? 'train' : 'trains'}
          </span>
          <Icon name={open ? 'expand_less' : 'expand_more'}
            className="text-slate-400 text-[22px]" />
        </div>
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div className="px-5 pt-5 pb-4">

          {/* Incoming train card */}
          <IncomingLegCard leg={hub.incomingLeg} />

          {/* Divider with label */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest
                             flex items-center gap-1">
              <Icon name="keyboard_double_arrow_down" className="text-[14px]" />
              Connecting Trains to {hub.routes[0]?.legs[1]?.toName ?? 'destination'}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Stack of connecting train rows */}
          <div className="space-y-3">
            {hub.routes.map((route, i) => (
              <ConnectingTrainRow
                key={`${route.legs[1]?.trainNo}-${i}`}
                route={route}
                rank={hub.startRank + i}
                isBest={i === 0}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Empty / Invite / Skeleton states ────────────────────────────────────────

function InviteState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
        <Icon name="train" className="text-blue-400 text-[40px]" />
      </div>
      <p className="text-base font-bold text-slate-600">Plan your railway journey</p>
      <p className="text-sm text-center max-w-xs text-slate-400">
        Enter origin, destination, and a travel date, then tap{' '}
        <strong className="text-slate-600">Search Trains</strong>.
        Results are grouped by junction hub for clarity.
      </p>
    </div>
  );
}

function EmptyState({ source, destination, travelDate }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
        <Icon name="search_off" className="text-red-400 text-[36px]" />
      </div>
      <p className="text-base font-bold text-slate-700">No routes found</p>
      <p className="text-sm text-center max-w-sm text-slate-500">
        No connecting trains exist from{' '}
        <strong>{source}</strong> to <strong>{destination}</strong> on{' '}
        <strong>{travelDate}</strong> within a 24-hour layover window.
      </p>
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl
                      text-xs text-amber-800 text-center max-w-xs">
        💡 <strong>Tip:</strong> Try Tuesday, Thursday, or Saturday — both Seemanchal Express
        and Jogbani Kolkata Express run on those days.
      </div>
    </div>
  );
}

function SkeletonCard() {
  const bar = (cls) => (
    <div className={`rounded-lg bg-slate-100 animate-pulse ${cls}`} />
  );
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
        {bar('w-2.5 h-2.5 rounded-full flex-shrink-0')}
        {bar('h-4 w-48')}
        <div className="ml-auto">{bar('h-4 w-16')}</div>
      </div>
      <div className="p-5 space-y-3">
        {bar('h-20 w-full rounded-xl')}
        {bar('h-16 w-full rounded-xl')}
        {bar('h-16 w-3/4 rounded-xl')}
      </div>
    </div>
  );
}

// ─── Bottom nav (mobile) ──────────────────────────────────────────────────────

function BottomNav() {
  const item = (icon, label, active = false) => (
    <div className={`flex flex-col items-center justify-center p-2 rounded-full
                     ${active ? 'bg-blue-100 text-blue-700 px-5' : 'text-slate-500'}`}>
      <Icon name={icon} className="text-[22px]" />
      <span className="text-[10px] font-bold mt-0.5">{label}</span>
    </div>
  );
  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center
                    py-2 px-2 bg-white border-t border-slate-200 shadow-lg">
      {item('search',        'Search',   true)}
      {item('train',         'Bookings')}
      {item('notifications', 'Alerts')}
      {item('person',        'Profile')}
    </nav>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function Home() {
  const [source,      setSource]      = useState('JBN');
  const [destination, setDestination] = useState('RKMP');
  // Thursday 2026-06-11 — Seemanchal (daily) + Jogbani (Tue/Thu/Sat) both run.
  const [travelDate,  setTravelDate]  = useState('2026-06-11');
  const [rawResults,  setRawResults]  = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error,       setError]       = useState('');
  const [sortMode,    setSortMode]    = useState('duration');

  // ── Group + sort logic (pure transform — engine untouched) ────────────────
  const hubGroups = useMemo(
    () => groupByHub(rawResults, sortMode),
    [rawResults, sortMode]
  );

  const totalRoutes = rawResults?.length ?? 0;
  const showResults = hasSearched && !isSearching && !error;

  // ── Search handler ────────────────────────────────────────────────────────
  function handleSearch() {
    if (!source.trim() || !destination.trim() || !travelDate) {
      setError('Please fill in origin, destination, and a travel date.');
      return;
    }
    setError('');
    setHasSearched(true);
    setIsSearching(true);

    // One-frame setTimeout so skeleton renders before synchronous engine call
    setTimeout(() => {
      try {
        const results = findOptimalRoutes(
          source.trim().toUpperCase(),
          destination.trim().toUpperCase(),
          travelDate
        );
        setRawResults(results);
      } catch (err) {
        setError(`Engine error: ${err.message}`);
        setRawResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 0);
  }

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen pb-24 md:pb-10">
      <main className="max-w-max-width-content mx-auto px-4 py-6">

        {/* ── Search bar ── */}
        <section className="mb-6">
          <SearchBar
            source={source}
            destination={destination}
            travelDate={travelDate}
            onSourceChange={setSource}
            onDestinationChange={setDestination}
            onTravelDateChange={setTravelDate}
            onSearch={handleSearch}
          />
        </section>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl
                          bg-red-50 border border-red-200 text-red-800 text-sm">
            <Icon name="error_outline" className="flex-shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Pre-search invite ── */}
        {!hasSearched && !error && <InviteState />}

        {/* ── Skeleton while computing ── */}
        {isSearching && (
          <div className="space-y-5">
            {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
          </div>
        )}

        {/* ── Results ── */}
        {showResults && (
          <>
            <DashboardHeader
              source={source.toUpperCase()}
              destination={destination.toUpperCase()}
              travelDate={travelDate}
              totalRoutes={totalRoutes}
              totalHubs={hubGroups.length}
            />

            {hubGroups.length > 0 && (
              <SortPanel sortMode={sortMode} onSort={setSortMode} />
            )}

            {hubGroups.length === 0 ? (
              <EmptyState
                source={source.toUpperCase()}
                destination={destination.toUpperCase()}
                travelDate={travelDate}
              />
            ) : (
              <div className="space-y-5">
                {hubGroups.map(hub => (
                  <HubSection key={hub.via ?? '__direct__'} hub={hub} />
                ))}
              </div>
            )}
          </>
        )}

      </main>
      <BottomNav />
    </div>
  );
}
