export function requireAdmin(req, res, next) {
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken) {
    return res.status(500).json({
      success: false,
      error: 'ADMIN_TOKEN_NOT_CONFIGURED',
    });
  }

  const token =
    req.headers['x-admin-token'] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (token !== expectedToken) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin access required.',
    });
  }

  req.user = {
    role: 'admin',
  };

  next();
}