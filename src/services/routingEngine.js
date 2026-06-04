const graph = require('../data/mockGraphData.json');

const MIN_LAYOVER_MINUTES = 60;

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function isDestination(station, destination) {
  return Array.isArray(destination)
    ? destination.includes(station)
    : station === destination;
}

// Returns all valid journeys from source to destination.
// destination can be a station string or an array of station strings.
// Each connecting train must depart >= MIN_LAYOVER_MINUTES after the previous arrival.
function findRoutes(source, destination, maxStops = 1) {
  const results = [];

  // Queue entry:
  //   station          – current position
  //   path             – confirmed leg objects so far
  //   lastArrivalAbs   – absolute minutes (day-0 epoch) when traveller arrives here; null at origin
  //   journeyStartAbs  – absolute minutes when the first train departs
  const queue = [{ station: source, path: [], lastArrivalAbs: null, journeyStartAbs: null }];

  while (queue.length > 0) {
    const { station, path, lastArrivalAbs, journeyStartAbs } = queue.shift();

    if (path.length > maxStops) continue;

    const edges = graph[station] ?? [];

    for (const edge of edges) {
      // Anchor departure to the day the traveller is currently at this station.
      const currentDay = lastArrivalAbs !== null ? Math.floor(lastArrivalAbs / (24 * 60)) : 0;
      let depAbs = currentDay * 24 * 60 + toMinutes(edge.departureTime);

      // Roll forward day-by-day until the minimum layover is satisfied.
      if (lastArrivalAbs !== null) {
        while (depAbs - lastArrivalAbs < MIN_LAYOVER_MINUTES) {
          depAbs += 24 * 60;
        }
      }

      // Arrival in absolute minutes.
      // edge.dayOffset is calendar days after departure that the train arrives.
      const arrAbs =
        depAbs +
        toMinutes(edge.arrivalTime) +
        edge.dayOffset * 24 * 60 -
        toMinutes(edge.departureTime);

      const layoverMin = lastArrivalAbs !== null ? depAbs - lastArrivalAbs : 0;
      const thisJourneyStart = journeyStartAbs ?? depAbs;

      const leg = {
        from: station,
        to: edge.to,
        trainName: edge.trainName,
        trainNo: edge.trainNo,
        departureTime: edge.departureTime,
        arrivalTime: edge.arrivalTime,
        layoverBeforeLeg: lastArrivalAbs !== null ? formatDuration(layoverMin) : 'N/A (origin)',
      };

      const newPath = [...path, leg];

      if (isDestination(edge.to, destination)) {
        const totalLayoverMin = newPath.reduce((acc, l) => {
          if (l.layoverBeforeLeg === 'N/A (origin)') return acc;
          const [hPart, mPart] = l.layoverBeforeLeg.split(' ');
          return acc + parseInt(hPart) * 60 + parseInt(mPart);
        }, 0);

        results.push({
          legs: newPath,
          totalLayover: formatDuration(totalLayoverMin),
          totalTransitTime: formatDuration(arrAbs - thisJourneyStart),
        });
      } else if (newPath.length <= maxStops) {
        queue.push({
          station: edge.to,
          path: newPath,
          lastArrivalAbs: arrAbs,
          journeyStartAbs: thisJourneyStart,
        });
      }
    }
  }

  return results;
}

module.exports = { findRoutes };
