'use strict';

const express           = require('express');
const cors              = require('cors');
const { getRoutes }     = require('./controllers/routeController');
const { getPnrStatus }  = require('./controllers/pnrController');
const { getLiveStatus } = require('./controllers/liveStatusController');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Explicitly allow both local dev and the deployed Vercel frontend so
// production requests from railfinder-ui.vercel.app are not blocked.

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',          // Vite dev server
  'http://localhost:3000',          // backend self-calls
  'https://railfinder-ui.vercel.app',           // deployed frontend
  'https://railfinder-routing-engine.vercel.app', // backend (for health checks)
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (server-to-server, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    // Also allow any *.vercel.app preview deployment
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin "${origin}" is not allowed.`));
  },
  methods:     ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status:  'RailFinder Engine Online',
    version: '2.1',
    routes:  ['/api/routes', '/api/pnr/:pnr', '/api/live-status/:trainNo'],
  });
});

// ─── Route search ─────────────────────────────────────────────────────────────
app.get('/api/routes', getRoutes);

// ─── PNR Status ───────────────────────────────────────────────────────────────
app.get('/api/pnr/:pnr', getPnrStatus);

// ─── Live Train Status ────────────────────────────────────────────────────────
app.get('/api/live-status/:trainNo', getLiveStatus);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`RailFinder v2.1 running on port ${PORT}`);
  console.log(`  Allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
});

module.exports = app;
