const { findRoutes } = require('../services/routingEngine');

const routes = findRoutes('JBN', ['RKMP', 'BPL', 'SHRN']);

console.log('=== JBN → [RKMP, BPL, SHRN] Route Results ===\n');
console.log(JSON.stringify(routes, null, 2));
console.log(`\nTotal valid journeys found: ${routes.length}`);
