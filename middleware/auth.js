const ADMIN_PASSWORD = 'natheism2026';

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED. THIS INCIDENT HAS BEEN LOGGED.' });
}

module.exports = { requireAuth, ADMIN_PASSWORD };
