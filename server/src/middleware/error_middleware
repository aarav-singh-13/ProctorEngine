import { getSessionFromAccessToken } from '../services/auth.service.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // allowAllStatuses = false → only active sessions can access exam endpoints
    const { decoded, session } = await getSessionFromAccessToken(token, false);
    req.auth = { token, decoded, session };
    next();
  } catch (err) {
    next(err);
  }
}
