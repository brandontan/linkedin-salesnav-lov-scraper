const express = require('express');
const cors = require('cors');
const filtersRouter = require('./api/filters');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', filtersRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

module.exports = app; 