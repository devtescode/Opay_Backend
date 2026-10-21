const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for the Opay API.
 *
 * Two kinds of JWTs exist:
 *   - user tokens   -> payload { userId, username, role: 'user', sessionId }
 *   - admin tokens  -> payload { email, role: 'admin' }
 *
 * Both are signed with the same secret in the current environment, so the
 * role claim (not the secret) is what decides who the caller is.
 */

const USER_SECRET = process.env.JWT_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

const extractToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  // Fall back to the body token used by the older endpoints
  // (changepassword / changeadminpassword / checkTransactionLimit).
  const bodyToken = req.body?.token || req.body?.adminToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim();
  }

  return null;
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, USER_SECRET);
  } catch (userError) {
    try {
      return jwt.verify(token, ADMIN_SECRET);
    } catch (adminError) {
      return null;
    }
  }
};

/**
 * Verifies the bearer token and attaches the decoded payload to req.auth.
 */
const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.auth = payload;
  req.token = token;
  return next();
};

/**
 * Only signed-in users (role: 'user'). Admins are rejected.
 */
const requireUser = (req, res, next) => {
  if (req.auth?.role !== 'user' || !req.auth?.userId) {
    return res.status(403).json({ message: 'User access required' });
  }
  return next();
};

/**
 * Only signed-in admins (role: 'admin').
 */
const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
};

/**
 * A user may only touch their own records; admins may touch anyone's.
 * Used on routes where the target user id travels in the path.
 */
const requireSelfOrAdmin = (req, res, next) => {
  if (req.auth?.role === 'admin') {
    return next();
  }

  if (req.auth?.role !== 'user' || !req.auth?.userId) {
    return res.status(403).json({ message: 'User access required' });
  }

  const targetUserId = req.params.userId || req.params.id || req.body?.userId;

  if (targetUserId && String(req.auth.userId) !== String(targetUserId)) {
    return res.status(403).json({ message: 'You can only access your own records' });
  }

  return next();
};

/**
 * Guards records that are addressed by their own id (transactions, recents).
 * The controller resolves the document, then calls this with the owner id.
 */
const ownsResource = (req, res, ownerId) => {
  if (req.auth?.role === 'admin') return true;
  if (!ownerId) return false;
  return String(req.auth?.userId) === String(ownerId);
};

module.exports = {
  authenticate,
  requireUser,
  requireAdmin,
  requireSelfOrAdmin,
  ownsResource,
};
