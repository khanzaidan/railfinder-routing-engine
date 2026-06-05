import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchPnrStatus } from '../services/api';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined leading-none select-none ${className}`}>{name}</span>;
}

// Map statusCode → visual treatment
const STATUS_CONFIG = {
  CNF: {
    label:    'CONFIRMED',
    band:     'bg-emerald-500',
    icon:     'verified',
    iconBg:   'bg-white/20',
    iconText: 'text-white',
    passBg:   'bg-emerald-50 border-emerald-200',
    pillBg:   'bg-emerald-100 text-emerald-800',
  },
  WL: {
    label:    'WAITLISTED',
    band:     'bg-amber-500',
    icon:     'pending',
    iconBg:   'bg-white/20',
    iconText: 'text-white',
    passBg:   'bg-amber-50 border-amber-200',
    pillBg:   'bg-amber-100 text-amber-800',
  },
  RAC: {
    label:    'RAC — CONFIRM PENDING',
    band:     'bg-orange-500',
    icon:     'hourglass_top',
    iconBg:   'bg-white/20',
    iconText: 'text-white',
    passBg:   'bg-orange-50 border-orange-200',
    pillBg:   'bg-orange-100 text-orange-800',
  },
};

const BERTH_LABELS = { LB: 'Lower', MB: 'Middle', UB: 'Upper', SL: 'Side Lower', SU: 'Side Upper', WS: 'Window Side' };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Horizontal journey bar — the distinctive "boarding pass" section */
function RouteBar({ journey }) {
  return (
    <div className="px-6 py-5 flex items-center gap-4">
      {/* Origin */}
      <div className="flex-shrink-0">
        <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {journey.origin.code}
        </p>
        <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight max-w-[80px]">
          {journey.origin.name}
        </p>
        <p className="text-lg font-black text-brand-600 mt-1">{journey.origin.departure}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{journey.boardingDateFmt}</p>
      </div>

      {/* Journey connector */}
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <Icon name="train" className="text-slate-400 text-[18px]" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {journey.travelClass} · {journey.quota}
            </span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          {journey.distanceKm.toLocaleString()} km · {journey.durationLabel}
        </p>
        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
          {journey.trainNo} — {journey.trainName}
        </p>
      </div>

      {/* Destination */}
      <div className="flex-shrink-0 text-right">
        <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {journey.destination.code}
        </p>
        <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight max-w-[80px] ml-auto">
          {journey.destination.name}
        </p>
        <p className="text-lg font-black text-brand-600 mt-1">{journey.destination.arrival}</p>
        <p className="text-[10px] text-amber-600 font-bold mt-0.5">{journey.destination.arrivalDayLabel}</p>
      </div>
    </div>
  );
}

/** Platform info strip between route bar and data grid */
function PlatformStrip({ origin, destination }) {
  return (
    <div className="mx-6 mb-5 flex gap-3">
      <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
        <Icon name="hdr_auto" className="text-slate-400 text-[16px]" />
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Boarding Platform</p>
          <p className="font-black text-slate-800 text-sm">Pf. {origin.platform} · {origin.code}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
        <Icon name="flag" className="text-slate-400 text-[16px]" />
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Arrival Platform</p>
          <p className="font-black text-slate-800 text-sm">Pf. {destination.platform} · {destination.code}</p>
        </div>
      </div>
    </div>
  );
}

/** Passenger tile — seat allocation card grid item */
function PassengerTile({ p, statusConfig }) {
  const isConfirmed = p.status === 'CNF';
  return (
    <div className={`rounded-xl border p-3 ${statusConfig.passBg}`}>
      {/* Name row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                           flex-shrink-0 ${isConfirmed ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
            {p.sno}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
            <p className="text-[10px] text-slate-500">{p.age} · {p.gender === 'M' ? '♂' : '♀'}</p>
          </div>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0
                          ${statusConfig.pillBg}`}>
          {p.status}
        </span>
      </div>

      {/* Seat allocation — displayed as micro tiles */}
      {isConfirmed ? (
        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Coach</p>
            <p className="font-black text-brand-600 text-base leading-tight">{p.coach}</p>
          </div>
          <div className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Seat</p>
            <p className="font-black text-brand-600 text-base leading-tight">{p.berth}</p>
          </div>
          <div className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</p>
            <p className="font-black text-slate-700 text-xs leading-tight mt-0.5">
              {BERTH_LABELS[p.berthType] ?? p.berthType}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/60 rounded-lg px-3 py-2 text-center border border-amber-200">
          <p className="text-xs text-amber-700 font-semibold">Berth will be assigned after confirmation</p>
        </div>
      )}
    </div>
  );
}

/** Fare row component */
function FareRow({ label, amount, bold }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${bold ? 'border-t border-slate-200 mt-1 pt-2.5' : ''}`}>
      <span className={`text-sm ${bold ? 'font-black text-slate-900' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-black text-slate-900 text-base' : 'font-semibold text-slate-700'}`}>
        ₹{amount.toLocaleString()}
      </span>
    </div>
  );
}

/** Visual coach formation strip */
function CoachFormation({ coachPosition, totalCoaches, coachLabel }) {
  if (!coachPosition) return null;
  return (
    <div className="px-6 pb-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
        Coach Position in Train Formation
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max">
          {/* Locomotive */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="w-8 h-8 bg-slate-700 rounded-sm flex items-center justify-center">
              <Icon name="train" className="text-white text-[14px]" />
            </div>
            <span className="text-[8px] text-slate-400 font-bold">LOCO</span>
          </div>
          {/* Coach blocks */}
          {Array.from({ length: totalCoaches }, (_, i) => {
            const pos = i + 1;
            const isYours = pos === coachPosition;
            return (
              <div key={pos} className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className={`w-7 h-7 rounded flex items-center justify-center text-[9px] font-black
                                 transition-all
                                 ${isYours
                                   ? 'bg-violet-600 text-white shadow-lg shadow-violet-300 scale-110'
                                   : 'bg-slate-100 text-slate-400'}`}>
                  {pos}
                </div>
                {isYours && (
                  <span className="text-[8px] text-violet-600 font-black">{coachLabel}</span>
                )}
              </div>
            );
          })}
          {/* Guard van */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="w-7 h-7 bg-slate-600 rounded-sm flex items-center justify-center">
              <Icon name="shield" className="text-slate-300 text-[12px]" />
            </div>
            <span className="text-[8px] text-slate-400 font-bold">GV</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">
        Your coach <strong className="text-violet-600">{coachLabel}</strong> is at position{' '}
        <strong className="text-slate-700">{coachPosition}</strong> of {totalCoaches} coaches.
      </p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PnrSkeleton() {
  const bar = cls => <div className={`rounded-lg bg-slate-100 animate-pulse ${cls}`} />;
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="h-16 bg-slate-200 animate-pulse" />
      <div className="px-6 py-5 space-y-3">
        {bar('h-12 w-full rounded-xl')}
        {bar('h-8 w-3/4')}
      </div>
      <div className="px-6 pb-5 grid grid-cols-2 gap-3">
        {bar('h-24 rounded-xl')}
        {bar('h-24 rounded-xl')}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PnrStatus() {
  const [pnr,     setPnr]     = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleCheck = useCallback(async () => {
    const clean = pnr.replace(/\D/g, '');
    setError('');
    setLoading(true);
    setData(null);
    try {
      const json = await fetchPnrStatus(clean);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pnr]);

  const cfg = data ? (STATUS_CONFIG[data.statusCode] ?? STATUS_CONFIG.WL) : null;

  // Derive the first confirmed passenger's coach label for the formation
  const firstCoach = data?.passengers?.find(p => p.status === 'CNF')?.coach;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Page heading ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-1.5 h-8 bg-violet-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">PNR Status</h1>
            <p className="text-slate-400 text-sm">Booking confirmation · Seat allocation · Fare</p>
          </div>
        </div>

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex gap-2
                        shadow-sm mb-8">
          <input
            value={pnr}
            onChange={e => setPnr(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            placeholder="Enter 10-digit PNR number"
            maxLength={10}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-800
                       placeholder:text-slate-300 placeholder:font-normal
                       bg-transparent outline-none tracking-[0.15em]"
          />
          <button
            onClick={handleCheck}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white
                       text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <Icon name="progress_activity" className="text-[17px] animate-spin" />
              : <Icon name="manage_search" className="text-[17px]" />}
            {loading ? 'Checking…' : 'Check PNR'}
          </button>
        </div>

        {/* Demo chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8 -mt-4">
          <span className="text-xs text-slate-400 font-medium">Try:</span>
          {[
            { pnr: '2103456789', label: '2103… CNF' },
            { pnr: '3405567123', label: '3405… CNF' },
            { pnr: '5512309876', label: '5512… WL'  },
          ].map(({ pnr: p, label }) => (
            <button key={p} onClick={() => setPnr(p)}
              className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200
                         px-2.5 py-1 rounded-full hover:bg-violet-100 transition-colors">
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
        {loading && <PnrSkeleton />}

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {data && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md
                          overflow-hidden animate-fade-in">

            {/* ── Status band ───────────────────────────────────────────────── */}
            <div className={`${cfg.band} px-6 py-4 flex items-center justify-between gap-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${cfg.iconBg} flex items-center
                                 justify-center flex-shrink-0`}>
                  <Icon name={cfg.icon} className={`${cfg.iconText} text-[22px]`} />
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">
                    {cfg.label}
                  </p>
                  <p className="text-white/70 text-xs">
                    PNR {data.pnr} · {data.chartStatus}
                    {data.chartPreparedAt && (
                      <> · Charted {new Date(data.chartPreparedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white/60 text-[10px] uppercase tracking-widest">Fetched</p>
                <p className="text-white font-bold text-sm">
                  {new Date(data.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} hrs
                </p>
              </div>
            </div>

            {/* Dashed separator between status band and route bar */}
            <div className="mx-6 border-t border-dashed border-slate-200 my-0" />

            {/* ── Route bar ─────────────────────────────────────────────────── */}
            <RouteBar journey={data.journey} />

            {/* ── Platform info ─────────────────────────────────────────────── */}
            <PlatformStrip origin={data.journey.origin} destination={data.journey.destination} />

            {/* ── Divider ───────────────────────────────────────────────────── */}
            <div className="mx-6 border-t border-slate-100" />

            {/* ── Data grid: passengers left | fare right ────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-slate-100">

              {/* Passengers */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Passengers ({data.passengers.length})
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {data.journey.travelClass} · {data.journey.quota}
                  </span>
                </div>
                <div className="space-y-3">
                  {data.passengers.map((p, i) => (
                    <PassengerTile key={i} p={p} statusConfig={cfg} />
                  ))}
                </div>
              </div>

              {/* Fare */}
              <div className="px-6 py-5 border-t md:border-t-0 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Fare Breakdown
                </p>
                <div className="space-y-0.5">
                  <FareRow label="Base Fare"       amount={data.fare.base}            />
                  <FareRow label="Reservation"     amount={data.fare.reservation}     />
                  {data.fare.superfastCharge > 0 &&
                    <FareRow label="Superfast Charge" amount={data.fare.superfastCharge} />}
                  <FareRow label="GST"             amount={data.fare.gst}             />
                  {data.fare.insurance > 0 &&
                    <FareRow label="Travel Insurance" amount={data.fare.insurance} />}
                  <FareRow label="Total Fare"      amount={data.fare.total}  bold     />
                </div>

                {/* Utility actions */}
                <div className="mt-5 flex flex-col gap-2">
                  {data.cancellationAllowed && (
                    <div className="flex items-center justify-between text-xs text-slate-500
                                    bg-slate-50 rounded-xl px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <Icon name="undo" className="text-[14px]" />
                        Est. refund on cancel
                      </span>
                      <span className="font-black text-emerald-600">
                        ₹{data.refundOnCancel.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.insuranceActive && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-600
                                    bg-brand-50 rounded-xl px-3 py-2.5 font-semibold">
                      <Icon name="health_and_safety" className="text-[14px]" />
                      Travel insurance active
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Divider ───────────────────────────────────────────────────── */}
            <div className="mx-6 border-t border-slate-100" />

            {/* ── Coach formation ───────────────────────────────────────────── */}
            <div className="pt-5">
              <CoachFormation
                coachPosition={data.coachPosition}
                totalCoaches={data.totalCoaches}
                coachLabel={firstCoach}
              />
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100
                            flex items-center justify-between flex-wrap gap-3">
              <p className="text-[10px] text-slate-400">
                Demo data · not affiliated with IRCTC
              </p>
              <div className="flex items-center gap-3">
                <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors">
                  Manage on IRCTC ↗
                </a>
                <Link to="/"
                  className="text-xs font-bold px-4 py-1.5 bg-brand-600 text-white
                             rounded-xl hover:bg-brand-700 transition-colors">
                  Search Routes
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
