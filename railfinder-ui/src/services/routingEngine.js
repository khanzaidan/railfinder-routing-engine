import railwayData from '../data/mockRailwayData.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const trains   = railwayData.trains;
const stations = railwayData.stations; // available for name lookups
const MIN_LAYOVER_MINUTES = 60;
const MAX_LAYOVER_MINUTES = 24 * 60; // 24h — prunes absurd multi-day waits at interchange
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Utility Helpers ──────────────────────────────────────────────────────────

/**
 * Returns the 3-letter day name ("Mon", "Tue"…) for a given ISO date string
 * shifted forward/backward by `offsetDays` calendar days.
 *
 * Always uses UTC to avoid timezone-induced day-shift bugs — e.g.
 *   new Date("2026-06-05") in UTC-5 would read as June 4 locally.
 *
 * Works correctly with NEGATIVE offsets (the day before travelDate).
 */
function getDayName(dateString, offsetDays) {
  const [y, m, d] = dateString.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return DAY_NAMES[utc.getUTCDay()];
}

/**
 * Converts a "HH:MM" string + a schedule dayOffset into absolute minutes
 * measured from midnight of Day 0 (the travelDate).
 *
 * Examples:
 *   toAbsMin("22:30", 0)  →   1350   (Day 0, 22:30)
 *   toAbsMin("03:30", 1)  →   1650   (Day 1, 03:30  =  1440 + 210)
 *   toAbsMin("13:00", 2)  →   3660   (Day 2, 13:00  =  2880 + 780)
 */
function toAbsMin(timeStr, dayOffset) {
  const [h, m] = timeStr.split(':').map(Number);
  return dayOffset * 24 * 60 + h * 60 + m;
}

/** Converts a raw minute total into a "Xh YYm" display string. */
function formatDuration(minutes) {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Returns the schedule index of `stationCode` in a train's schedule, or -1. */
function getStopIdx(train, stationCode) {
  return train.schedule.findIndex(s => s.stationCode === stationCode);
}

/** Optional: looks up a human-readable station name from the stations list. */
function stationName(code) {
  return stations.find(s => s.code === code)?.name ?? code;
}

// ─── Core Algorithm ───────────────────────────────────────────────────────────

/**
 * findOptimalRoutes(sourceCode, destinationCode, travelDate)
 *
 * Exhaustive 1-stop graph traversal over the mock railway network.
 *
 * HIGH-LEVEL LOGIC
 * ─────────────────
 * 1. Collect every train T1 that has `sourceCode` in its schedule.
 * 2. Filter T1 to those running on `travelDate` (day-of-week gate).
 * 3. Extract the FULL array of downstream stations for each T1.
 * 4. Deep loop — for EVERY downstream station S:
 *      a. If S === destinationCode → direct route, record it.
 *      b. Otherwise, scan every train T2 that:
 *           • Calls at S  AND
 *           • Has destinationCode downstream of S
 *      c. Layover resolution: find the EARLIEST valid departure of T2 from S
 *         such that (T2_dep_abs − T1_arr_abs) ≥ MIN_LAYOVER_MINUTES.
 *         Tries up to 7 consecutive T2 origin days to handle:
 *           – Same-day connections
 *           – Next-day connections (T2 departs just before T1 arrives → roll forward)
 *           – Negative t2OriginOffset (T2 originated the day before travelDate, a
 *             perfectly valid scenario for long-distance trains like AGTL RKMP SPL)
 *
 * TIME MATH
 * ──────────
 * All times are converted to "absolute minutes from travelDate midnight" so
 * midnight rollovers, multi-day journeys, and cross-day comparisons reduce
 * to simple integer subtraction — no string comparisons, no modular arithmetic.
 *
 * t2InterDepAbsMin = t2OriginOffset × 1440 + toAbsMin(T2_dep_time, T2_stop_dayOffset)
 *
 * Where t2OriginOffset = (day relative to travelDate on which T2 departs its
 * own origin station). This is derived from:
 *   baseT2OriginOffset = interArrDayOffset − interStop2.dayOffset
 * then rolled forward by `extraDays` (0–6) until the layover gate is satisfied
 * AND T2 operates on that calendar day.
 *
 * SORTING
 * ────────
 * Primary:   totalDurationInMinutes  ASC  (fastest journey first)
 * Secondary: totalLayoverInMinutes   ASC  (if same total duration, prefer less waiting)
 *
 * @param {string} sourceCode       Station code, e.g. "JBN"
 * @param {string} destinationCode  Station code, e.g. "RKMP"
 * @param {string} travelDate       ISO date string "YYYY-MM-DD"
 * @returns {Array<Object>}  Sorted array of journey objects
 */
export function findOptimalRoutes(sourceCode, destinationCode, travelDate) {
  const results = [];
  const travelDayName = getDayName(travelDate, 0);

  // ── Step 1 & 2 : trains that serve source AND run on travelDate ────────────
  const originTrains = trains.filter(t => {
    const idx = getStopIdx(t, sourceCode);
    return idx !== -1 && t.daysOfOperation.includes(travelDayName);
  });

  // ── Step 3 : walk every originating train ─────────────────────────────────
  for (const t1 of originTrains) {
    const srcIdx       = getStopIdx(t1, sourceCode);
    const srcStop      = t1.schedule[srcIdx];
    const srcDepAbsMin = toAbsMin(srcStop.departure, srcStop.dayOffset);

    // ── Step 4 : deep loop over EVERY downstream station ──────────────────
    for (let i = srcIdx + 1; i < t1.schedule.length; i++) {
      const downStop          = t1.schedule[i];
      const interCode         = downStop.stationCode;
      const interArrAbsMin    = toAbsMin(downStop.arrival, downStop.dayOffset);
      const interArrDayOffset = downStop.dayOffset; // calendar day T1 arrives here

      // ── 4a : DIRECT route ─────────────────────────────────────────────────
      if (interCode === destinationCode) {
        const totalDurationInMinutes = interArrAbsMin - srcDepAbsMin;
        results.push({
          type:                    'direct',
          via:                     null,
          viaName:                 null,
          legs: [
            {
              legNo:              1,
              trainNo:            t1.trainNo,
              trainName:          t1.trainName,
              from:               sourceCode,
              fromName:           stationName(sourceCode),
              departure:          srcStop.departure,
              departureDayOffset: srcStop.dayOffset,
              to:                 destinationCode,
              toName:             stationName(destinationCode),
              arrival:            downStop.arrival,
              arrivalDayOffset:   downStop.dayOffset,
              layoverBeforeLeg:   'N/A — origin leg',
            },
          ],
          totalDurationInMinutes,
          totalDurationFormatted:  formatDuration(totalDurationInMinutes),
          totalLayoverInMinutes:   0,
          totalLayoverFormatted:   'None (direct)',
        });
        // destination is a terminus — no further stops to check beyond it
        continue;
      }

      // ── 4b : 1-STOP routes — scan every T2 that calls at interCode ────────
      for (const t2 of trains) {
        if (t2.trainNo === t1.trainNo) continue; // never connect to yourself

        const interIdx2 = getStopIdx(t2, interCode);
        if (interIdx2 === -1) continue;           // T2 doesn't stop here

        const destIdx2 = getStopIdx(t2, destinationCode);
        if (destIdx2 === -1 || destIdx2 <= interIdx2) continue; // dest must be downstream in T2

        const interStop2 = t2.schedule[interIdx2]; // T2's entry for the interchange
        const destStop2  = t2.schedule[destIdx2];  // T2's entry for the destination

        // ── Earliest valid connection resolution ────────────────────────────
        //
        // baseT2OriginOffset: the calendar day (relative to travelDate) on which
        // T2 must have left its own source so that it reaches interCode on the
        // SAME day T1 does (interArrDayOffset).
        //
        //   interStop2.dayOffset = days after T2's origin that T2 arrives at interCode
        //   ⇒ T2 origin day = interArrDayOffset − interStop2.dayOffset
        //
        // A NEGATIVE result is valid — it just means T2 originated the day before
        // travelDate and is already en-route when our journey begins.
        //
        // We then try extraDays = 0, 1, 2, … 6 to roll forward until both:
        //   (a) T2 operates on its computed origin day, AND
        //   (b) the layover at interCode is ≥ MIN_LAYOVER_MINUTES.
        //
        const baseT2OriginOffset = interArrDayOffset - interStop2.dayOffset;

        for (let extraDays = 0; extraDays <= 6; extraDays++) {
          const t2OriginOffset = baseT2OriginOffset + extraDays;

          // Day-of-week gate for T2
          const t2OriginDayName = getDayName(travelDate, t2OriginOffset);
          if (!t2.daysOfOperation.includes(t2OriginDayName)) continue;

          // Absolute departure of T2 from the interchange station
          const t2InterDepAbsMin =
            t2OriginOffset * 24 * 60 +
            toAbsMin(interStop2.departure, interStop2.dayOffset);

          // ── Layover gate ─────────────────────────────────────────────────
          const layoverMinutes = t2InterDepAbsMin - interArrAbsMin;
          if (layoverMinutes < MIN_LAYOVER_MINUTES) continue;
          // Increasing extraDays only grows the layover further — stop searching
          if (layoverMinutes > MAX_LAYOVER_MINUTES) break;

          // ── Valid connection — record the journey ─────────────────────────
          const t2DestArrAbsMin =
            t2OriginOffset * 24 * 60 +
            toAbsMin(destStop2.arrival, destStop2.dayOffset);

          const totalDurationInMinutes = t2DestArrAbsMin - srcDepAbsMin;
          const totalLayoverInMinutes  = layoverMinutes;

          results.push({
            type:                    '1-stop',
            via:                     interCode,
            viaName:                 stationName(interCode),
            legs: [
              {
                legNo:              1,
                trainNo:            t1.trainNo,
                trainName:          t1.trainName,
                from:               sourceCode,
                fromName:           stationName(sourceCode),
                departure:          srcStop.departure,
                departureDayOffset: srcStop.dayOffset,
                to:                 interCode,
                toName:             stationName(interCode),
                arrival:            downStop.arrival,
                arrivalDayOffset:   downStop.dayOffset,
                layoverBeforeLeg:   'N/A — origin leg',
              },
              {
                legNo:              2,
                trainNo:            t2.trainNo,
                trainName:          t2.trainName,
                from:               interCode,
                fromName:           stationName(interCode),
                departure:          interStop2.departure,
                departureDayOffset: interStop2.dayOffset + t2OriginOffset,
                to:                 destinationCode,
                toName:             stationName(destinationCode),
                arrival:            destStop2.arrival,
                arrivalDayOffset:   destStop2.dayOffset + t2OriginOffset,
                layoverBeforeLeg:   formatDuration(layoverMinutes),
              },
            ],
            totalDurationInMinutes,
            totalDurationFormatted: formatDuration(totalDurationInMinutes),
            totalLayoverInMinutes,
            totalLayoverFormatted:  formatDuration(totalLayoverInMinutes),
          });

          break; // Earliest valid connection found — do not look further
        }
      }
    }
  }

  // ── Step 5 : Dual-key sort ─────────────────────────────────────────────────
  // Primary:   totalDurationInMinutes ASC  (fastest first)
  // Secondary: totalLayoverInMinutes  ASC  (tie-break: less waiting time wins)
  results.sort((a, b) =>
    a.totalDurationInMinutes !== b.totalDurationInMinutes
      ? a.totalDurationInMinutes - b.totalDurationInMinutes
      : a.totalLayoverInMinutes  - b.totalLayoverInMinutes
  );

  return results;
}
