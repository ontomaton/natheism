const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'natheism-anti-social-network-session-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Post permalink
app.get('/post/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

app.listen(PORT, () => {
  console.log(`\n  NATHEISM v1.0 — THE ANTI-SOCIAL NETWORK`);
  console.log(`  Operational on port ${PORT}`);
  console.log(`  All activity is being monitored.\n`);
});
