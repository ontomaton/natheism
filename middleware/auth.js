const ADMIN_PASSWORD = 'natheism2026';
const AUTH_HASH = '6c02b16dd0d13afc3545898c99a341b41e44d88c4bda8e50d0104d00200fcd0e';

function requireAuth(req, res, next) {
  // Session-based auth (legacy)
  if (req.session && req.session.isAdmin) {
    return next();
  }
  // Token-based auth (client-side login)
  if (req.headers['x-auth'] === AUTH_HASH) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED. THIS INCIDENT HAS BEEN LOGGED.' });
}

module.exports = { requireAuth, ADMIN_PASSWORD };
