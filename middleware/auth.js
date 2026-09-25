const jwt = require('jsonwebtoken');

// Returns the payload {id, name} or throws if the token is invalid/expired
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Express middleware: expects header "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

module.exports = { verifyToken, requireAuth };
