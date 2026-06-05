/**
 * routingEngine.js  ─  Generalised, API-Ready Modified BFS
 * ─────────────────────────────────────────────────────────
 *
 * ARCHITECTURE — "API-Ready" Decoupling
 * ──────────────────────────────────────
 * The core algorithm is a PURE FUNCTION that accepts a `trainEdges` array
 * as a parameter.  The data source is fully decoupled:
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  Data Layer (swappable)                          │
 *   │  ┌──────────────────┐  ┌───────────────────────┐│
 *   │  │ mockGraphData.json│  │ RapidAPI normalizer   ││
 *   │  └────────┬─────────┘  └──────────┬────────────┘│
 *   │           └─────── trainEdges[] ──┘              │
 *   └─────────────────────┬───────────────────────────┘
 *                         │
 *   ┌─────────────────────▼───────────────────────────┐
 *   │  Algorithm Layer (never changes)                 │
 *   │  buildAdjacency(trainEdges) → adjacency map      │
 *   │  findRoutes(source, dest, date, trainEdges, K)   │
 *   └─────────────────────────────────────────────────┘
 *
 * ABSOLUTE-TIME MATHEMATICS — Proof of Correctness
 * ──────────────────────────────────────────────────
 * Every departure and arrival is converted to "absolute minutes from
 * Day-0 midnight" (the search date at 00:00):
 *
 *   absMin = calendarDay × 1440 + clockMinutes
 *
 * Example  (JBN→CNB via Seemanchal, then CNB→RKMP via Pushpak):
 *
 *   Day-0 = search date (e.g. Thursday, 2026-06-11)
 *
 *   Leg 1 — Seemanchal Express departs JBN:
 *     depAbs  = 0 × 1440 + toMin("20:35")  = 1235 min  (Day-0 20:35)
 *     arrAbs  = 1235 + toMin("14:15") + 1×1440 − toMin("20:35")
 *             = 1235 + 855 + 1440 − 1235 = 2295 min    (Day-1 14:15)
 *
 *   Leg 2 — Pushpak Express, CNB departs 23:10 same calendar day as arrival:
 *     calDay  = ⌊2295 / 1440⌋ = 1
 *     depAbs  = 1 × 1440 + toMin("23:10") = 2830 min   (Day-1 23:10)
 *     layover = 2830 − 2295 = 535 min  ✓  (45 ≤ 535 ≤ 720)
 *     arrAbs  = 2830 + toMin("07:22") + 1×1440 − toMin("23:10")
 *             = 2830 + 442 + 1440 − 1390 = 3322 min    (Day-2 07:22)
 *     transit = 3322 − 1235 = 2087 min = 34h 47m       ✓
 *
 *   MIDNIGHT WRAP is automatic: if a connecting train departs at 00:25
 *   and we arrived at 14:15, depAbs on same calDay = 1 × 1440 + 25 = 1465
 *   which is < 2295.  findNextValidDep advances to calDay+1, giving
 *   depAbs = 2 × 1440 + 25 = 2905.  Layover = 610 min ✓.  No clock
 *   string comparison is ever performed.
 *
 * ALGORITHM: Modified BFS with Time-Constraint Pruning
 *   Complexity: O(V^K × E) for K stops, V stations, E edges.
 *   National scale (V=8000, K=2): production systems use RAPTOR
 *   O(K × (E+V)).  This engine is a correct reference implementation
 *   for the mock-data scale.
 */

'use strict';

const { trains: defaultTrains } = require('../data/mockGraphData.json');

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_LAYOVER  = 45;    // minutes — realistic platform-change buffer
const MAX_LAYOVER  = 720;   // 12-hour ceiling
const MPD          = 1440;  // minutes per calendar day

// Index 0=Sun, 1=Mon, …, 6=Sat  (matches Date.getUTCDay())
const DOW = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

// ─── Pure time utilities ──────────────────────────────────────────────────────

/** "HH:MM" → integer minutes from midnight */
const toMin = s => {
  const c = s.indexOf(':');
  return parseInt(s.slice(0, c), 10) * 60 + parseInt(s.slice(c + 1), 10);
};

/** Integer minutes → "Xh YYm" display string */
const fmtDur = m => {
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.abs(m) % 60;
  return `${h}h ${String(min).padStart(2, '0')}m`;
};

/** Absolute day index → day-of-week short code */
const dowForDay = (absDay, originDow) => DOW[(originDow + absDay) % 7];

/** "YYYY-MM-DD" → UTC day-of-week (0=Sun … 6=Sat) */
const parseDow = dateStr => {
  if (!dateStr) return 1; // default Monday
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// ─── Graph builder (the "API adapter" boundary) ───────────────────────────────

/**
 * buildAdjacency(trainEdges)
 *
 * Converts a flat array of train-edge objects into a station-indexed
 * adjacency map.  This is the only transformation needed to switch between
 * data sources:
 *
 *   Local JSON  → JSON.parse(file).trains → buildAdjacency(trains)
 *   RapidAPI    → normaliseRapidApiResponse(res) → buildAdjacency(trains)
 *
 * The "normalise" step simply maps RapidAPI field names to the standard
 * schema (from, to, trainNo, trainName, departureTime, arrivalTime,
 * dayOffset, runningDays, classes, trainType, distanceKm, expectedPlatform).
 */
function buildAdjacency(trainEdges) {
  const adj = Object.create(null);
  for (const edge of trainEdges) {
    if (!adj[edge.from]) adj[edge.from] = [];
    adj[edge.from].push(edge);
  }
  return adj;
}

// ─── Connection finder ────────────────────────────────────────────────────────

/**
 * findNextValidDep(edge, arrivalAbsMin, originDow)
 *
 * Finds the earliest calendar slot for `edge`'s train that:
 *   (a) departs ≥ MIN_LAYOVER after `arrivalAbsMin`
 *   (b) layover ≤ MAX_LAYOVER (12-hour ceiling)
 *   (c) train runs on that day-of-week (runningDays gate)
 *
 * Returns { depAbs, layoverMin } or null.
 */
function findNextValidDep(edge, arrivalAbsMin, originDow) {
  const depClock  = toMin(edge.departureTime);
  const arrCalDay = Math.floor(arrivalAbsMin / MPD);

  for (let ahead = 0; ahead <= 2; ahead++) {
    const calDay = arrCalDay + ahead;
    const depAbs = calDay * MPD + depClock;
    const layover = depAbs - arrivalAbsMin;

    if (layover > MAX_LAYOVER) return null;       // ceiling breached — stop
    if (layover < MIN_LAYOVER) continue;           // too soon — try next day

    const dayShort = dowForDay(calDay, originDow);
    if (!edge.runningDays || edge.runningDays.includes(dayShort)) {
      return { depAbs, layoverMin: layover };
    }
    // Train doesn't run this day — advance
  }
  return null;
}

// ─── Core algorithm ───────────────────────────────────────────────────────────

/**
 * findRoutes(source, destination, travelDate, trainEdges, maxStops)
 *
 * PARAMETERS
 *   source      — origin station IRCTC code, e.g. "JBN"
 *   destination — destination code(s) as string or array, e.g. "RKMP"
 *   travelDate  — ISO "YYYY-MM-DD" search date
 *   trainEdges  — flat array of train-edge objects (data-source-agnostic)
 *                 If omitted, falls back to the local mock JSON.
 *   maxStops    — max intermediate hops (default 2 → up to 3-leg journeys)
 *
 * RETURNS sorted array of journey objects, each containing:
 *   legs[]              — ordered leg objects with full metadata
 *   via                 — first intermediate station code (grouping key)
 *   viaName             — display string of all intermediates
 *   totalTransitTime    — "34h 47m" (display)
 *   totalTransitMinutes — 2087 (sort key)
 *   totalLayover        — "8h 55m" (display)
 *   layoverMinutes      — 535 (sort key)
 */
function findRoutes(
  source,
  destination,
  travelDate,
  trainEdges = defaultTrains,
  maxStops   = 2
) {
  const destSet   = new Set(Array.isArray(destination) ? destination : [destination]);
  const originDow = parseDow(travelDate);
  const adjacency = buildAdjacency(trainEdges);
  const results   = [];

  /**
   * BFS queue entry:
   *   station              — current position
   *   path                 — confirmed leg objects so far
   *   lastArrivalAbs       — absolute arrival time (null at origin)
   *   journeyStartAbs      — when the first leg departed
   *   cumulativeLayoverMin — running layover total (integer, never string-parsed)
   *   visitedStations      — cycle guard
   */
  const queue = [{
    station:              source,
    path:                 [],
    lastArrivalAbs:       null,
    journeyStartAbs:      null,
    cumulativeLayoverMin: 0,
    visitedStations:      new Set([source]),
  }];

  while (queue.length > 0) {
    const { station, path, lastArrivalAbs, journeyStartAbs,
            cumulativeLayoverMin, visitedStations } = queue.shift();

    if (path.length > maxStops) continue;

    for (const edge of (adjacency[station] ?? [])) {

      if (visitedStations.has(edge.to)) continue;  // cycle guard

      let depAbs, layoverMin;

      if (lastArrivalAbs === null) {
        // Origin leg — must run on travelDate
        const dayShort = DOW[originDow];
        if (edge.runningDays && !edge.runningDays.includes(dayShort)) continue;
        depAbs     = toMin(edge.departureTime);
        layoverMin = 0;
      } else {
        const slot = findNextValidDep(edge, lastArrivalAbs, originDow);
        if (!slot) continue;
        depAbs     = slot.depAbs;
        layoverMin = slot.layoverMin;
      }

      // Absolute arrival at edge.to
      const arrAbs =
        depAbs
        + toMin(edge.arrivalTime)
        + edge.dayOffset * MPD
        - toMin(edge.departureTime);

      const thisJourneyStart     = journeyStartAbs ?? depAbs;
      const newCumulativeLayover = cumulativeLayoverMin + layoverMin;

      const leg = {
        from:             edge.from,
        to:               edge.to,
        trainNo:          edge.trainNo,
        trainName:        edge.trainName,
        trainType:        edge.trainType         ?? 'Express',
        runningDays:      edge.runningDays        ?? [],
        classes:          edge.classes            ?? [],
        distanceKm:       edge.distanceKm         ?? null,
        expectedPlatform: edge.expectedPlatform   ?? null,
        departureTime:    edge.departureTime,
        arrivalTime:      edge.arrivalTime,
        departureDayOffset: Math.floor(depAbs / MPD),
        arrivalDayOffset:   Math.floor(arrAbs / MPD),
        layoverBeforeLeg: layoverMin > 0 ? fmtDur(layoverMin) : null,
        layoverMinutes:   layoverMin,
      };

      const newPath    = [...path, leg];
      const newVisited = new Set(visitedStations);
      newVisited.add(edge.to);

      if (destSet.has(edge.to)) {
        const totalTransitMinutes = arrAbs - thisJourneyStart;

        // Build via metadata: first intermediate = grouping key; full path = display
        const intermediates = newPath.slice(0, -1).map(l => l.to);
        results.push({
          legs:               newPath,
          via:                intermediates[0]          ?? null,
          viaName:            intermediates.join(' → ') ?? null,
          totalTransitTime:   fmtDur(totalTransitMinutes),
          totalTransitMinutes,
          totalLayover:       fmtDur(newCumulativeLayover),
          layoverMinutes:     newCumulativeLayover,
        });

      } else if (newPath.length <= maxStops) {
        queue.push({
          station:              edge.to,
          path:                 newPath,
          lastArrivalAbs:       arrAbs,
          journeyStartAbs:      thisJourneyStart,
          cumulativeLayoverMin: newCumulativeLayover,
          visitedStations:      newVisited,
        });
      }
    }
  }

  results.sort((a, b) =>
    a.totalTransitMinutes !== b.totalTransitMinutes
      ? a.totalTransitMinutes - b.totalTransitMinutes
      : a.layoverMinutes     - b.layoverMinutes
  );

  return results;
}

module.exports = { findRoutes, buildAdjacency };
