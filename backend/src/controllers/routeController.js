'use strict';

const { findRoutes }  = require('../services/routingEngine');
const rawData         = require('../data/mockGraphData.json');

// ─── Running-day normaliser ────────────────────────────────────────────────────
//
// The JSON stores running days in one of two formats:
//
//   (a) 7-element positional array  ["M","T","W","T","F","S","S"]
//       Each element represents Mon→Sun.  All seven filled = runs daily.
//
//   (b) Explicit list  ["M","W","F"]  or  ["M","T","T","S"]
//       "T" is disambiguated: first occurrence = Tuesday ("T"),
//       second occurrence = Thursday ("Th").
//       "S" is disambiguated: first = Saturday ("Sa"), second = Sunday ("Su").
//
// The BFS engine's DOW array is ['Su','M','T','W','Th','F','Sa']

function normaliseRunningDays(raw) {
  if (!raw || raw.length === 0) return ['M','T','W','Th','F','Sa','Su'];

  // 7-element positional format → runs every day
  if (raw.length === 7) return ['M','T','W','Th','F','Sa','Su'];

  // Explicit list — disambiguate repeated letters
  const result = [];
  let tCount = 0;
  let sCount = 0;

  for (const d of raw) {
    switch (d) {
      case 'M':  result.push('M');  break;
      case 'W':  result.push('W');  break;
      case 'F':  result.push('F');  break;
      case 'Th': result.push('Th'); break;
      case 'Sa': result.push('Sa'); break;
      case 'Su': result.push('Su'); break;
      case 'T':
        tCount++;
        result.push(tCount === 1 ? 'T' : 'Th');
        break;
      case 'S':
        sCount++;
        result.push(sCount === 1 ? 'Sa' : 'Su');
        break;
      default:
        result.push(d); // pass through unknown codes unchanged
    }
  }
  return result;
}

// ─── Route-schedule → flat-edge normaliser ────────────────────────────────────
//
// Converts the new route-based schedule format:
//   { trainNumber, trainName, type, runningDays, classes, route[], distanceKm }
//
// Into the flat-edge format expected by the BFS engine:
//   { from, to, trainNo, trainName, trainType, runningDays,
//     classes, departureTime, arrivalTime, dayOffset,
//     distanceKm, expectedPlatform }
//
// A multi-stop route (N stops) produces (N-1) edges, one per consecutive pair.
// This is called once at startup; the result is cached for the process lifetime.

function normaliseRouteData(trainSchedules) {
  const edges = [];

  for (const train of trainSchedules) {
    // Skip meta-comment objects
    if (!train.trainNumber || !train.route || train.route.length < 2) continue;

    const runningDays = normaliseRunningDays(train.runningDays);

    for (let i = 0; i < train.route.length - 1; i++) {
      const origin = train.route[i];
      const dest   = train.route[i + 1];

      // Ignore "00:00" sentinel used as placeholder for terminus with no dep / origin with no arr
      const depTime = (origin.departureTime === '00:00') ? null : origin.departureTime;
      const arrTime = (dest.arrivalTime    === '00:00') ? null : dest.arrivalTime;
      if (!depTime || !arrTime) continue;   // leg has no valid times — skip

      const dayOffset = (dest.dayOffset   ?? 0)
                      - (origin.dayOffset ?? 0);

      edges.push({
        from:             origin.stationCode,
        to:               dest.stationCode,
        trainNo:          train.trainNumber,
        trainName:        train.trainName,
        trainType:        train.type        ?? 'Express',
        runningDays,
        classes:          train.classes     ?? [],
        departureTime:    depTime,
        arrivalTime:      arrTime,
        dayOffset:        Math.max(0, dayOffset), // never negative
        distanceKm:       train.distanceKm  ?? null,
        expectedPlatform: parseInt(dest.platform, 10) || null,
      });
    }
  }

  return edges;
}

// Build the flat-edge cache once at module load — O(trains × stops) startup cost
const TRAIN_EDGES = normaliseRouteData(rawData.trains ?? []);

// ─── Controller ───────────────────────────────────────────────────────────────

async function getRoutes(req, res) {
  const { source, destination, date, maxStops } = req.query;

  if (!source || !destination) {
    return res.status(400).json({
      error: 'Missing required query parameters: source and destination',
    });
  }

  const destinationList = destination.includes(',')
    ? destination.split(',').map(s => s.trim())
    : destination;

  const stops  = maxStops ? Math.min(parseInt(maxStops, 10), 3) : 2;

  /**
   * RapidAPI-Ready swap point:
   * Replace TRAIN_EDGES with normalised live data:
   *
   *   const liveEdges = normaliseRouteData(await fetchFromRapidApi(source, date));
   *   const routes    = findRoutes(source, destinationList, date, liveEdges, stops);
   */
  const routes = findRoutes(source, destinationList, date ?? null, TRAIN_EDGES, stops);

  return res.json({
    source,
    destination: destinationList,
    date:         date ?? null,
    totalResults: routes.length,
    routes,
  });
}

module.exports = { getRoutes };
