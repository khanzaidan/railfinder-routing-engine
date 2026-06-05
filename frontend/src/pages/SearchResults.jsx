import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchRoutes } from '../services/api';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined leading-none select-none ${className}`}>{name}</span>;
}

function DayBadge({ offset }) {
  if (!offset) return null;
  return (
    <span className="ml-0.5 inline-block px-1 py-px text-[9px] font-black rounded
                     bg-blue-100 text-blue-700 leading-tight align-middle">
      +{offset}d
    </span>
  );
}

const TYPE_STYLE = {
  Superfast: 'bg-blue-600 text-white',
  Express:   'bg-emerald-600 text-white',
  Mail:      'bg-amber-500 text-white',
  Special:   'bg-violet-600 text-white',
  Rajdhani:  'bg-red-600 text-white',
  Passenger: 'bg-slate-500 text-white',
};

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px]
                      font-black uppercase tracking-wide flex-shrink-0
                      ${TYPE_STYLE[type] ?? TYPE_STYLE.Express}`}>
      <Icon name="bolt" className="text-[11px]" />
      {type}
    </span>
  );
}

const CLASS_STYLE = {
  '1A': 'bg-amber-100 text-amber-800 border-amber-200',
  '2A': 'bg-blue-100  text-blue-800  border-blue-200',
  '3A': 'bg-teal-100  text-teal-800  border-teal-200',
  'SL': 'bg-green-100 text-green-800 border-green-200',
  'GN': 'bg-slate-100 text-slate-500 border-slate-200',
  '2S': 'bg-cyan-100  text-cyan-800  border-cyan-200',
  'CC': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

function ClassBadges({ classes }) {
  if (!classes?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {classes.map(c => (
        <span key={c} className={`px-1.5 py-px rounded border text-[9px] font-black uppercase
                                   ${CLASS_STYLE[c] ?? CLASS_STYLE.GN}`}>
          {c}
        </span>
      ))}
    </div>
  );
}

const ALL_DAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
function RunningDays({ days }) {
  return (
    <div className="flex items-center gap-0.5" title="Running days">
      {ALL_DAYS.map(d => (
        <span key={d}
          className={`text-[9px] font-black px-0.5 py-px rounded leading-none
                      ${days?.includes(d) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
          {d}
        </span>
      ))}
    </div>
  );
}

function PlatformBadge({ number }) {
  if (!number) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]
                     font-bold bg-orange-50 text-orange-700 border border-orange-200">
      <Icon name="hdr_strong" className="text-[10px]" />
      Pf.{number}
    </span>
  );
}

// ─── Station name lookup (client-side — avoids needing a /stations endpoint) ─

const STATION_NAMES = {
  JBN:  'Jogbani',
  KIR:  'Katihar Jn',
  CNB:  'Kanpur Central',
  PNBE: 'Patna Jn',
  NDLS: 'New Delhi',
  HWH:  'Howrah / Kolkata',
  RKMP: 'Rani Kamalapati',
  BPL:  'Bhopal Jn',
  BBS:  'Bhubaneswar',
  BGS:  'Barauni Jn',
  DDU:  'Pt. DDU Jn',
  PRYJ: 'Prayagraj Jn',
  ET:   'Itarsi Jn',
  NGP:  'Nagpur Jn',
};

const stName = code => STATION_NAMES[code] ?? code;

// ─── Path grouping helpers ────────────────────────────────────────────────────

/**
 * Derive a stable string key for a route's intermediate path.
 * Uses route.via (first intermediate) combined with the full viaName
 * to distinguish 1-stop vs 2-stop paths that share the same first hub.
 *
 * Direct routes (no intermediates) → key "__direct__"
 */
function routeGroupKey(route) {
  if (!route.via && (!route.viaName || route.viaName === '')) return '__direct__';
  return route.viaName || route.via || '__direct__';
}

/**
 * Convert a viaName string ("CNB" or "KIR → PNBE") into a human-readable
 * path label using the station name lookup.
 */
function buildPathLabel(key) {
  if (key === '__direct__') return 'Direct Route';
  const codes = key.split(' → ');
  return codes.map(c => `${stName(c)} (${c})`).join(' → ');
}

/**
 * groupRoutesByPath(routes, sortMode)
 *
 * Groups routes by their intermediate-station path.  Applies sort within each
 * group AND sorts the groups themselves — so the "fastest path" group always
 * floats to the top, and within each group the fastest schedule is first.
 *
 * @returns {Array<{ key, pathLabel, routes, bestTransitMinutes, bestLayoverMinutes }>}
 */
function groupRoutesByPath(routes, sortMode) {
  if (!routes.length) return [];

  // 1. Build group map
  const map = new Map();
  for (const route of routes) {
    const key = routeGroupKey(route);
    if (!map.has(key)) {
      map.set(key, {
        key,
        pathLabel:          buildPathLabel(key),
        routes:             [],
        bestTransitMinutes: Infinity,
        bestLayoverMinutes: Infinity,
      });
    }
    const g = map.get(key);
    g.routes.push(route);
    g.bestTransitMinutes = Math.min(g.bestTransitMinutes, route.totalTransitMinutes ?? Infinity);
    g.bestLayoverMinutes = Math.min(g.bestLayoverMinutes, route.layoverMinutes      ?? Infinity);
  }

  // 2. Sort routes within each group
  const cmpRoute = sortMode === 'layover'
    ? (a, b) => a.layoverMinutes      !== b.layoverMinutes
        ? a.layoverMinutes      - b.layoverMinutes
        : a.totalTransitMinutes - b.totalTransitMinutes
    : (a, b) => a.totalTransitMinutes !== b.totalTransitMinutes
        ? a.totalTransitMinutes - b.totalTransitMinutes
        : a.layoverMinutes      - b.layoverMinutes;

  for (const g of map.values()) g.routes.sort(cmpRoute);

  // 3. Sort groups by their best route
  const cmpGroup = sortMode === 'layover'
    ? (a, b) => a.bestLayoverMinutes  !== b.bestLayoverMinutes
        ? a.bestLayoverMinutes  - b.bestLayoverMinutes
        : a.bestTransitMinutes  - b.bestTransitMinutes
    : (a, b) => a.bestTransitMinutes  !== b.bestTransitMinutes
        ? a.bestTransitMinutes  - b.bestTransitMinutes
        : a.bestLayoverMinutes  - b.bestLayoverMinutes;

  return [...map.values()].sort(cmpGroup);
}

/** Format integer minutes → "Xh YYm" */
function fmtMin(m) {
  if (!m && m !== 0) return '—';
  const h = Math.floor(m / 60), min = m % 60;
  return `${h}h ${String(min).padStart(2, '0')}m`;
}

// ─── Group accent colour cycle ─────────────────────────────────────────────────

const ACCENT = [
  { bar: 'bg-brand-500',   iconRing: 'bg-brand-50',   iconFg: 'text-brand-600',   countPill: 'bg-brand-100 text-brand-700'   },
  { bar: 'bg-violet-500',  iconRing: 'bg-violet-50',  iconFg: 'text-violet-600',  countPill: 'bg-violet-100 text-violet-700'  },
  { bar: 'bg-amber-500',   iconRing: 'bg-amber-50',   iconFg: 'text-amber-600',   countPill: 'bg-amber-100 text-amber-700'    },
  { bar: 'bg-emerald-500', iconRing: 'bg-emerald-50', iconFg: 'text-emerald-600', countPill: 'bg-emerald-100 text-emerald-700'},
  { bar: 'bg-rose-500',    iconRing: 'bg-rose-50',    iconFg: 'text-rose-600',    countPill: 'bg-rose-100 text-rose-700'      },
];

// ─── Train leg row (inside accordion) ─────────────────────────────────────────

function TrainLegRow({ leg, legNumber }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap mb-2.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black
                             flex items-center justify-center flex-shrink-0">{legNumber}</span>
            <Icon name="train" className="text-brand-600 text-[16px]" />
            <span className="font-black text-slate-800 text-sm leading-tight">
              {leg.trainNo} · {leg.trainName}
            </span>
            <TypeBadge type={leg.trainType} />
          </div>
          <div className="pl-7">
            <RunningDays days={leg.runningDays} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <ClassBadges classes={leg.classes} />
          <PlatformBadge number={leg.expectedPlatform} />
        </div>
      </div>

      {/* Time bar */}
      <div className="flex items-center gap-3 pl-1">
        {/* Origin */}
        <div className="text-center w-14 flex-shrink-0">
          <p className="text-lg font-black text-slate-800 leading-tight tabular-nums">
            {leg.departureTime}
          </p>
          <DayBadge offset={leg.departureDayOffset} />
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">{leg.from}</p>
        </div>

        {/* Track */}
        <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
          <div className="flex items-center w-full gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-slate-300" />
            {leg.distanceKm && (
              <span className="text-[9px] text-slate-400 px-1 bg-white border border-slate-200
                               rounded flex-shrink-0">
                {leg.distanceKm}km
              </span>
            )}
            <div className="flex-1 border-t-2 border-dashed border-slate-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
          </div>
          <p className="text-[9px] text-slate-400 font-medium">Leg {legNumber}</p>
        </div>

        {/* Destination */}
        <div className="text-center w-14 flex-shrink-0">
          <p className="text-lg font-black text-slate-800 leading-tight tabular-nums">
            {leg.arrivalTime}
          </p>
          <DayBadge offset={leg.arrivalDayOffset} />
          <p className="text-[11px] font-bold text-slate-500 mt-0.5">{leg.to}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer pill between legs ───────────────────────────────────────────────

function TransferPill({ junctionCode, platform, layoverMinutes, layoverStr }) {
  const isShort = layoverMinutes !== undefined && layoverMinutes <= 90;
  return (
    <div className="relative flex items-center py-1.5">
      <div className="flex-1 h-px bg-slate-200" />
      <div className={`mx-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]
                       font-bold border flex-shrink-0
                       ${isShort
                         ? 'bg-amber-50 border-amber-300 text-amber-700'
                         : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <Icon name="swap_vert" className="text-[14px]" />
        <span>
          {stName(junctionCode)}&nbsp;
          {platform && <span className="opacity-70">· Pf.{platform}&nbsp;</span>}
          · <strong>{layoverStr ?? fmtMin(layoverMinutes)}</strong> layover
        </span>
        {isShort && <span className="ml-1">⚡</span>}
      </div>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ─── Single route schedule card (inside accordion) ────────────────────────────

function RouteScheduleCard({ route, indexInGroup, isFastestInGroup, isFastestOverall }) {
  const firstLeg = route.legs[0];
  const lastLeg  = route.legs[route.legs.length - 1];

  return (
    <div className={`rounded-xl overflow-hidden border transition-shadow
                     hover:shadow-sm
                     ${isFastestInGroup ? 'border-emerald-300 shadow-emerald-100 shadow-sm'
                                        : 'border-slate-200'}`}>

      {/* Fastest banners */}
      {(isFastestOverall || isFastestInGroup) && (
        <div className={`px-4 py-1 flex items-center gap-2
                         ${isFastestOverall
                           ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                           : 'bg-emerald-50'}`}>
          <Icon name="bolt" className={`text-[13px] ${isFastestOverall ? 'text-white' : 'text-emerald-500'}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider
                            ${isFastestOverall ? 'text-white' : 'text-emerald-700'}`}>
            {isFastestOverall ? 'Fastest Overall' : 'Fastest in this Path'}
          </span>
        </div>
      )}

      <div className="bg-white p-4">
        {/* Journey summary strip */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            {/* Index pill */}
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px]
                             font-black flex items-center justify-center flex-shrink-0">
              {indexInGroup + 1}
            </span>
            {/* Times */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-black text-slate-800 tabular-nums">
                {firstLeg.departureTime}
              </span>
              <span className="text-xs text-slate-400 font-semibold flex-shrink-0">{firstLeg.from}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="w-6 h-px bg-slate-300" />
                <Icon name="arrow_forward" className="text-slate-300 text-[13px]" />
              </div>
              <span className="text-base font-black text-slate-800 tabular-nums flex-shrink-0">
                {lastLeg.arrivalTime}
                <DayBadge offset={lastLeg.arrivalDayOffset} />
              </span>
              <span className="text-xs text-slate-400 font-semibold flex-shrink-0">{lastLeg.to}</span>
            </div>
          </div>

          {/* Key metrics */}
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-base font-black text-slate-800">
              {route.totalTransitTime}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                              ${route.layoverMinutes <= 90
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'}`}>
              {route.totalLayover} layover
            </span>
          </div>
        </div>

        {/* Legs + transfers */}
        <div className="space-y-0">
          {route.legs.map((leg, i) => (
            <div key={i}>
              <TrainLegRow leg={leg} legNumber={i + 1} />
              {i < route.legs.length - 1 && (
                <TransferPill
                  junctionCode={leg.to}
                  platform={leg.expectedPlatform}
                  layoverMinutes={route.legs[i + 1].layoverMinutes}
                  layoverStr={route.legs[i + 1].layoverBeforeLeg}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
          <a
            href="https://www.irctc.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white
                       text-xs font-bold shadow-sm hover:bg-brand-700 active:scale-95 transition-all"
          >
            <Icon name="confirmation_number" className="text-[14px]" />
            Book on IRCTC
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Path group accordion card ────────────────────────────────────────────────

function PathGroupCard({
  group,
  accentIndex,
  isOpen,
  onToggle,
  isOverallFastestGroup,
  overallFastestTransitMinutes,
}) {
  const ac = ACCENT[accentIndex % ACCENT.length];

  // Determine if the top route in this group is the overall fastest
  const topRoute     = group.routes[0];
  const isFastestOverall = topRoute.totalTransitMinutes === overallFastestTransitMinutes;

  // Count of unique originating trains in this group (for display)
  const scheduleCount = group.routes.length;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm
                    hover:shadow-md transition-shadow duration-200">

      {/* ── Header button ─────────────────────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="w-full flex items-stretch gap-0 text-left focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
        aria-expanded={isOpen}
      >
        {/* Accent bar */}
        <div className={`w-1 flex-shrink-0 rounded-l-2xl ${ac.bar}`} />

        <div className="flex-1 flex items-center gap-3 px-4 py-4">
          {/* Route icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                           flex-shrink-0 ${ac.iconRing}`}>
            <Icon name={group.key === '__direct__' ? 'directions_railway' : 'route'}
              className={`text-[20px] ${ac.iconFg}`} />
          </div>

          {/* Path info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-black text-slate-800 text-sm leading-tight">
                {group.key === '__direct__' ? 'Direct Route' : `Route via ${group.pathLabel}`}
              </h3>
              {isOverallFastestGroup && (
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700
                                 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  ⚡ FASTEST PATH
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0
                                ${ac.countPill}`}>
                {scheduleCount} schedule{scheduleCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-slate-500">
                Best&nbsp;
                <strong className="text-slate-700">{fmtMin(group.bestTransitMinutes)}</strong>
              </span>
              <span className="text-[11px] text-slate-400">·</span>
              <span className="text-[11px] text-slate-500">
                Min layover&nbsp;
                <strong className={group.bestLayoverMinutes <= 90
                  ? 'text-amber-600' : 'text-slate-700'}>
                  {fmtMin(group.bestLayoverMinutes)}
                </strong>
              </span>
            </div>
          </div>

          {/* Chevron */}
          <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors
                           ${isOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
            <Icon
              name="expand_more"
              className={`text-slate-400 text-[22px] transition-transform duration-300
                          ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </div>
        </div>
      </button>

      {/* ── Accordion body (CSS grid-rows animation, no JS height measurement) ── */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-3 pt-3 pb-3 space-y-3">
            {group.routes.map((route, i) => (
              <RouteScheduleCard
                key={`${route.legs[0]?.trainNo ?? i}-${i}`}
                route={route}
                indexInGroup={i}
                isFastestInGroup={i === 0}
                isFastestOverall={i === 0 && isFastestOverall}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  const bar = cls => <div className={`rounded-lg bg-slate-100 animate-pulse ${cls}`} />;
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(n => (
        <div key={n} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-stretch">
            <div className="w-1 bg-slate-200 animate-pulse" />
            <div className="flex-1 flex items-center gap-3 p-4">
              {bar('w-10 h-10 rounded-xl flex-shrink-0')}
              <div className="flex-1 space-y-2">
                {bar('h-4 w-48')}
                {bar('h-3 w-64')}
              </div>
              {bar('w-6 h-6 rounded-lg flex-shrink-0')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const source      = searchParams.get('source')      ?? '';
  const destination = searchParams.get('destination') ?? '';
  const travelDate  = searchParams.get('date')        ?? '';

  const [routes,   setRoutes]  = useState([]);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [sortMode, setSort]    = useState('duration');

  // Independent accordion open-state per group (keyed by group.key)
  // First group is open by default, controlled after data loads.
  const [openGroups, setOpenGroups] = useState(new Set());

  // Fetch from backend via centralised api.js (handles dev proxy + prod URL)
  useEffect(() => {
    if (!source || !destination || !travelDate) return;
    let cancelled = false;
    setLoading(true); setError(''); setRoutes([]); setOpenGroups(new Set());

    fetchRoutes(source, destination, travelDate)
      .then(data => {
        if (cancelled) return;
        const r = data.routes ?? [];
        setRoutes(r);
        // Auto-open the first (fastest) group
        if (r.length > 0) {
          const firstKey = routeGroupKey(r[0]);
          setOpenGroups(new Set([firstKey]));
        }
      })
      .catch(e  => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [source, destination, travelDate]);

  // Group + sort (pure derivation — no engine re-run)
  const groups = useMemo(
    () => groupRoutesByPath(routes, sortMode),
    [routes, sortMode]
  );

  // Find overall fastest transit minutes (across all groups)
  const overallFastestTransitMinutes = useMemo(
    () => groups.length ? groups[0].bestTransitMinutes : Infinity,
    [groups]
  );

  function toggleGroup(key) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const friendlyDate = (() => {
    try {
      const [y, m, d] = travelDate.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return travelDate; }
  })();

  // ── Guard: no params ───────────────────────────────────────────────────────
  if (!source || !destination) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 px-4">
        <Icon name="search" className="text-slate-300 text-[64px]" />
        <p className="font-bold text-slate-600">No search parameters found.</p>
        <Link to="/"
          className="px-6 py-3 bg-brand-600 text-white rounded-full text-sm font-bold
                     hover:bg-brand-700 transition-colors">
          ← Back to Search
        </Link>
      </div>
    );
  }

  const totalRouteCount = groups.reduce((s, g) => s + g.routes.length, 0);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)]">

      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-content mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              <span className="text-brand-600">{source}</span>
              <span className="mx-2 text-slate-300">→</span>
              <span className="text-brand-600">{destination}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {friendlyDate}
              {!loading && groups.length > 0 && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <strong className="text-slate-700">{groups.length}</strong> path{groups.length !== 1 ? 's' : ''}
                  <span className="mx-1 text-slate-300">·</span>
                  <strong className="text-slate-700">{totalRouteCount}</strong> schedule{totalRouteCount !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>
          <Link
            to={`/?source=${source}&destination=${destination}&date=${travelDate}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border
                       border-slate-200 text-slate-600 text-xs font-bold
                       hover:border-brand-300 hover:text-brand-600 transition-colors"
          >
            <Icon name="tune" className="text-[14px]" />
            Modify Search
          </Link>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 py-6">

        {/* ── Sort + expand/collapse controls ────────────────────────────────── */}
        {groups.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            {/* Sort chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sort:</span>
              {[
                ['duration', 'Fastest First',    'speed'],
                ['layover',  'Shortest Layover', 'schedule'],
              ].map(([mode, label, icon]) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border
                              text-xs font-bold transition-all
                              ${sortMode === mode
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}
                >
                  <Icon name={icon} className="text-[13px]" />
                  {label}
                </button>
              ))}
            </div>

            {/* Expand all / Collapse all */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenGroups(new Set(groups.map(g => g.key)))}
                className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors
                           flex items-center gap-1"
              >
                <Icon name="unfold_more" className="text-[14px]" />
                Expand all
              </button>
              <span className="text-slate-200">|</span>
              <button
                onClick={() => setOpenGroups(new Set())}
                className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors
                           flex items-center gap-1"
              >
                <Icon name="unfold_less" className="text-[14px]" />
                Collapse all
              </button>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200
                          rounded-xl text-red-800 text-sm">
            <Icon name="error_outline" className="text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error} — make sure the backend server is running on port 3000.</span>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && <Skeleton />}

        {/* ── Grouped results ───────────────────────────────────────────────── */}
        {!loading && groups.length > 0 && (
          <div className="space-y-4">
            {groups.map((group, gi) => (
              <PathGroupCard
                key={group.key}
                group={group}
                accentIndex={gi}
                isOpen={openGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                isOverallFastestGroup={gi === 0}
                overallFastestTransitMinutes={overallFastestTransitMinutes}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {!loading && !error && routes.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <Icon name="search_off" className="text-red-400 text-[36px]" />
            </div>
            <p className="font-bold text-slate-700">No routes found</p>
            <p className="text-sm text-slate-500 max-w-sm">
              No valid connections from <strong>{source}</strong> to <strong>{destination}</strong>
              {' '}on {friendlyDate} within the 12-hour layover window.
            </p>
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800
                          px-4 py-2 rounded-xl max-w-xs">
              💡 Try Wednesday 2026-06-10 — all demo trains run that day.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
