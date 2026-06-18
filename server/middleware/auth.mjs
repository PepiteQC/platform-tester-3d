import { config } from '../config.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Middleware d'authentification admin simple (Bearer token)
 * À remplacer par JWT/OAuth en production
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Tentative d\'accès admin sans token', { ip: req.ip });
    return res.status(401).json({
      success: false,
      error: 'Authentification requise.'
    });
  }

  const token = authHeader.slice(7); // Retire "Bearer "

  // Comparaison en temps constant pour éviter les timing attacks
  if (!timingSafeEqual(token, config.ADMIN_TOKEN)) {
    logger.warn('Token admin invalide', { ip: req.ip });
    return res.status(403).json({
      success: false,
      error: 'Accès refusé.'
    });
  }

  next();
}

// Implémentation manuelle de crypto.timingSafeEqual pour les strings
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}