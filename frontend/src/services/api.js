/**
 * api.js — Centralised API client
 *
 * BASE URL STRATEGY
 * ─────────────────
 * Development:  Vite's /api proxy (vite.config.js) forwards to localhost:3000.
 *               API_BASE = '' → fetch('/api/routes') works fine.
 *
 * Production:   No proxy exists.  Calls must hit the deployed Vercel backend
 *               directly.  import.meta.env.PROD is true only after `vite build`.
 *               API_BASE = 'https://railfinder-routing-engine.vercel.app'
 *
 * Components import these helpers — never call fetch() directly.
 */

const API_BASE = import.meta.env.PROD
  ? 'https://railfinder-routing-engine.vercel.app'
  : '';

// ─── Generic request helper ────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res  = await fetch(url, options);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const j = await res.json(); message = j.error ?? message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

// ─── Route search ──────────────────────────────────────────────────────────────

/**
 * Search for train routes between two stations on a given date.
 * Calls GET /api/routes?source=JBN&destination=RKMP&date=2026-06-10
 */
export async function fetchRoutes(source, destination, date) {
  const dest = Array.isArray(destination) ? destination.join(',') : destination;
  const params = new URLSearchParams({
    source:      source,
    destination: dest,
    ...(date ? { date } : {}),
  });
  return apiFetch(`/api/routes?${params}`);
}

// ─── PNR status ────────────────────────────────────────────────────────────────

/**
 * Fetch booking status for a 10-digit PNR number.
 * Calls GET /api/pnr/:pnr
 */
export async function fetchPnrStatus(pnr) {
  if (!/^\d{10}$/.test(pnr)) throw new Error('PNR must be exactly 10 digits.');
  return apiFetch(`/api/pnr/${encodeURIComponent(pnr)}`);
}

// ─── Live train status ─────────────────────────────────────────────────────────

/**
 * Fetch live running status for a train number.
 * Calls GET /api/live-status/:trainNo
 */
export async function fetchTrainStatus(trainNo) {
  if (!trainNo || !/^\d{4,5}$/.test(trainNo)) {
    throw new Error('Train number must be 4–5 digits.');
  }
  return apiFetch(`/api/live-status/${encodeURIComponent(trainNo)}`);
}
