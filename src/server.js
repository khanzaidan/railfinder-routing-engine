const express = require('express');
const cors = require('cors');
const { getRoutes } = require('./controllers/routeController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'RailFinder Engine Online' });
});

app.get('/api/routes', getRoutes);

app.listen(PORT, () => {
  console.log(`RailFinder server running on port ${PORT}`);
});

module.exports = app;
