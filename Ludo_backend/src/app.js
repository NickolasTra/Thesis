const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;