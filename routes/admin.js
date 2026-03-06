const express = require('express');
const router = express.Router();
const path = require('path');
const { ADMIN_PASSWORD } = require('../middleware/auth');

// GET /admin - serve admin page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// GET /admin/status - check auth status
router.get('/status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

// POST /admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true, message: 'CLEARANCE GRANTED. WELCOME, CITIZEN.' });
  }
  return res.status(401).json({ success: false, message: 'ACCESS DENIED. THIS INCIDENT HAS BEEN LOGGED.' });
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'SESSION TERMINATION FAILED.' });
    }
    res.json({ message: 'SESSION TERMINATED. YOUR DEPARTURE HAS BEEN NOTED.' });
  });
});

module.exports = router;
