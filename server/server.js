const express = require('express');
const app = express();
const db = require('./models');
const cors = require('cors');
const passport = require("passport");
const session = require("express-session");

// Import routes
const userRoutes = require('./routes/usersRoutes');
const authRoutes = require('./routes/auth');

// Middleware
app.use(cors());

app.use(express.json());

app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to the API",
    status: "running",
    version: "1.0.0"
  });
});

app.use('/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;

db.sequelize.sync({ force: false }).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync database:', err);
});
