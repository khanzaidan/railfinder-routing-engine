// ─── Route Finder (own backend) ───────────────────────────────────────────────

const ROUTES_BASE_URL = 'https://railfinder-routing-engine.vercel.app/api/routes';

export async function fetchRoutes(source, destination) {
  const dest = Array.isArray(destination) ? destination.join(',') : destination;
  const url = `${ROUTES_BASE_URL}?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(dest)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`fetchRoutes failed: ${error.message}`);
  }
}

// ─── Live Train Status (RapidAPI) ─────────────────────────────────────────────

const LIVE_STATUS_BASE_URL =
  'https://indian-railway-irctc.p.rapidapi.com/api/trains/v1/train/status';

export async function fetchLiveStatus(trainNumber, date) {
  // date expected as "YYYYMMDD" — e.g. "20260605"
  const url = `${LIVE_STATUS_BASE_URL}?trainNo=${encodeURIComponent(trainNumber)}&startDay=${encodeURIComponent(date)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'indian-railway-irctc.p.rapidapi.com',
        'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`fetchLiveStatus failed: ${error.message}`);
  }
}
