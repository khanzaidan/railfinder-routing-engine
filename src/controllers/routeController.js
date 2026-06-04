const { findRoutes } = require('../services/routingEngine');

async function getRoutes(req, res) {
  const { source, destination } = req.query;

  if (!source || !destination) {
    return res.status(400).json({
      error: 'Missing required query parameters: source and destination',
    });
  }

  const destinationList = destination.includes(',')
    ? destination.split(',').map((s) => s.trim())
    : destination;

  const routes = findRoutes(source, destinationList);
  return res.json({ source, destination: destinationList, totalResults: routes.length, routes });
}

module.exports = { getRoutes };
