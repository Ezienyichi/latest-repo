import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try {
      const d = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
      req.userId = d.userId;
      req.userRole = d.role;
    } catch {}
  }
  next();
}
