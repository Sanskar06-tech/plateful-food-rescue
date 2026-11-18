import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET || 'dev-secret-change-me';
export const sign = (u) => jwt.sign({ id: String(u._id), role: u.role }, secret(), { expiresIn: '7d' });

function read(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), secret()); } catch { return null; }
}

export const optionalAuth = (req, _res, next) => { req.user = read(req); next(); };

// requireAuth() = any logged-in user; requireAuth('donor') = role restricted
export const requireAuth = (...roles) => (req, res, next) => {
  const u = read(req);
  if (!u) return res.status(401).json({ error: 'Please log in.' });
  if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'Not allowed for your role.' });
  req.user = u;
  next();
};
