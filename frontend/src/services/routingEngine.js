/**
 * frontend/src/services/routingEngine.js
 *
 * Client-side routing engine — runs synchronously in the browser with no
 * network calls.  Mirrors the backend algorithm architecture.
 *
 * KEY UPGRADES vs the original implementation
 * ────────────────────────────────────────────
 *  • MIN_LAYOVER  45 min  (was 60) — realistic platform-change buffer
 *  • MAX_LAYOVER 720 min  (was 24h) — 12-hour ceiling prunes absurd waits
 *  • RUNNING-DAYS GATE: each connecting train carries a `runningDays` array.
 *    Before accepting a connection, the engine finds the earliest calendar
 *    day that both satisfies the layover bounds AND is a running day for that
 *    train.  If no such day exists within the 12-hour window, the train is
 *    quietly rejected.
 *  • ENRICHED LEG OUTPUT: every leg now carries trainType, classes,
 *    distanceKm, expectedPlatform, departureDayOffset, arrivalDayOffset —
 *    all the fields the premium UI needs to render without extra lookups.
 *  • DE-DUPLICATION unchanged: a train ID is marked as used at the EARLIEST
 *    valid hub and skipped at later ones.
 */

import data from '../data/mockRailwayData.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_LAYOVER = 45;          // minutes — safe platform-change buffer
const MAX_LAYOVER = 12 * 60;     // 720 min — 12-hour ceiling
const MPD         = 1440;        // minutes per day

// Day-of-week short codes (index = JavaScript UTC day, 0 = Sunday)
const DOW = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

// ─── Time utilities ───────────────────────────────────────────────────────────

/** "HH:MM" → integer minutes since midnight */
function parseTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** (time string, day-offset integer) → absolute minutes from Day-0 midnight */
function absMin(hhmm, dayOffset) {
  return dayOffset * MPD + parseTime(hhmm);
}

/** Absolute minutes → "HH:MM" clock string (handles multi-day modulo) */
function toHHMM(abs) {
  const v = ((abs % MPD) + MPD) % MPD;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

/** Integer minutes → "Xh YYm" display string */
function fmt(minutes) {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Returns the UTC day-of-week (0=Sun … 6=Sat) for a "YYYY-MM-DD" string.
 * Uses UTC arithmetic to avoid timezone-induced off-by-one shifts.
 */
function dowFromDateStr(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

// ─── Running-days gate ────────────────────────────────────────────────────────

/**
 * findNextValidDep(depClock, runningDays, hubArrAbs, originDow)
 *
 * Given:
 *   depClock    — the connecting train's clock departure time (in minutes)
 *   runningDays — days the train operates, e.g. ["M","W","F"]
 *   hubArrAbs   — absolute minutes when Seemanchal arrives at the hub
 *   originDow   — day-of-week of Day-0 (the travelDate)
 *
 * Returns { depAbs, layover } if a valid slot exists within MAX_LAYOVER,
 * or `null` if every candidate day violates a constraint.
 *
 * Strategy: start from the same calendar day as hub arrival; try today,
 * tomorrow, and day-after.  For each day, check:
 *   (a) layover ≥ MIN_LAYOVER   — train hasn't departed yet AND buffer satisfied
 *   (b) layover ≤ MAX_LAYOVER   — wait is not unreasonably long
 *   (c) runningDays includes that day's code
 */
function findNextValidDep(depClock, runningDays, hubArrAbs, originDow) {
  const arrCalDay = Math.floor(hubArrAbs / MPD);

  for (let ahead = 0; ahead <= 2; ahead++) {
    const calDay = arrCalDay + ahead;
    const depAbs = calDay * MPD + depClock;
    const layover = depAbs - hubArrAbs;

    if (layover > MAX_LAYOVER) return null;   // exceeded ceiling — no point looking further
    if (layover < MIN_LAYOVER) continue;       // not enough buffer — try next day

    // Running-day check
    const dayShort = DOW[(originDow + calDay) % 7];
    if (!runningDays || runningDays.includes(dayShort)) {
      return { depAbs, layover };
    }
    // Train doesn't run this day → keep looking
  }

  return null;
}

// ─── findOptimalRoutes ────────────────────────────────────────────────────────

/**
 * findOptimalRoutes(sourceCode, destinationCode, travelDate)
 *
 * Traverses the hub-based data model and returns every valid 1-stop journey
 * from `sourceCode` to `destinationCode`, enriched with full train metadata.
 *
 * Output shape per result:
 *   type                   — '1-stop'
 *   via / viaName          — intermediate hub code + name
 *   legs[0]                — origin leg (Seemanchal Express)
 *   legs[1]                — connecting leg
 *   totalDurationInMinutes — integer (primary sort key)
 *   totalDurationFormatted — display string
 *   totalLayoverInMinutes  — integer (secondary sort key + UI)
 *   totalLayoverFormatted  — display string
 *
 * Each leg carries: trainNo, trainName, trainType, runningDays, classes,
 * distanceKm, expectedPlatform, departure, arrival, departureDayOffset,
 * arrivalDayOffset, layoverBeforeLeg.
 *
 * @param {string} sourceCode
 * @param {string} destinationCode
 * @param {string} travelDate  ISO "YYYY-MM-DD"
 * @returns {Array<Object>}
 */
export function findOptimalRoutes(sourceCode, destinationCode, travelDate) {
  const { originTrain, validDestinations, routes } = data;

  if (originTrain.source !== sourceCode) return [];

  const originDow = dowFromDateStr(travelDate ?? '2026-01-01');

  // ── Validate origin train runs on travelDate ────────────────────────────────
  const travelDayShort = DOW[originDow];
  if (originTrain.runningDays && !originTrain.runningDays.includes(travelDayShort)) {
    return []; // Seemanchal doesn't run today
  }

  const srcDepAbs = parseTime(originTrain.departure);  // Day-0 departure
  const results   = [];
  const seenIds   = new Set();   // cross-hub deduplication

  // ── Outer loop: hubs in geographic order ──────────────────────────────────
  for (const hub of originTrain.hubs) {

    const routeEntry = routes.find(r => r.viaCode === hub.code);
    if (!routeEntry) continue;

    const hubArrAbs = absMin(hub.arrival, hub.dayOffset);

    // ── Inner loop: connecting trains at this hub ──────────────────────────
    for (const train of routeEntry.trains) {

      if (seenIds.has(train.id))                                continue; // dedup
      if (!validDestinations.includes(train.destination))       continue; // dest filter
      if (train.journeyMins == null)                            continue; // no schedule

      // Find earliest valid departure respecting layover bounds + running days
      const slot = findNextValidDep(
        parseTime(train.departure),
        train.runningDays,
        hubArrAbs,
        originDow
      );
      if (!slot) continue;  // No valid connection within 12-hour window

      const { depAbs, layover } = slot;
      const arrAbs       = depAbs + train.journeyMins;
      const totalDur     = arrAbs - srcDepAbs;
      const depDayOffset = Math.floor(depAbs / MPD);
      const arrDayOffset = Math.floor(arrAbs / MPD);

      const destName = train.destination === 'RKMP'
        ? 'Rani Kamlapati (Bhopal)'
        : 'Bhopal Junction';

      seenIds.add(train.id);

      results.push({
        type:    '1-stop',
        via:     hub.code,
        viaName: hub.name,

        legs: [
          // ── Leg 1: Seemanchal Express ──────────────────────────────────────
          {
            legNo:              1,
            trainNo:            originTrain.trainNo,
            trainName:          originTrain.trainName,
            trainType:          originTrain.trainType,
            runningDays:        originTrain.runningDays,
            classes:            originTrain.classes,
            distanceKm:         originTrain.totalDistanceKm,
            expectedPlatform:   hub.platform,
            from:               originTrain.source,
            fromName:           originTrain.sourceName,
            departure:          originTrain.departure,
            departureDayOffset: 0,
            to:                 hub.code,
            toName:             hub.name,
            arrival:            hub.arrival,
            arrivalDayOffset:   hub.dayOffset,
            layoverBeforeLeg:   null,  // origin leg — no layover
          },
          // ── Leg 2: Connecting train ────────────────────────────────────────
          {
            legNo:              2,
            trainNo:            train.id,
            trainName:          train.name,
            trainType:          train.trainType      ?? 'Express',
            runningDays:        train.runningDays    ?? [],
            classes:            train.classes        ?? [],
            distanceKm:         train.distanceKm     ?? null,
            expectedPlatform:   train.expectedPlatform ?? null,
            from:               hub.code,
            fromName:           hub.name,
            departure:          toHHMM(depAbs),
            departureDayOffset: depDayOffset,
            to:                 train.destination,
            toName:             destName,
            arrival:            toHHMM(arrAbs),
            arrivalDayOffset:   arrDayOffset,
            layoverBeforeLeg:   fmt(layover),
            layoverMinutes:     layover,
          },
        ],

        totalDurationInMinutes: totalDur,
        totalDurationFormatted: fmt(totalDur),
        totalLayoverInMinutes:  layover,
        totalLayoverFormatted:  fmt(layover),
      });
    }
  }

  // ── Sort: fastest total journey first; tie-break by shortest layover ────────
  results.sort((a, b) =>
    a.totalDurationInMinutes !== b.totalDurationInMinutes
      ? a.totalDurationInMinutes - b.totalDurationInMinutes
      : a.totalLayoverInMinutes  - b.totalLayoverInMinutes
  );

  return results;
}
