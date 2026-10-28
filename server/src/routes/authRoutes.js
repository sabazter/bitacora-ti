import express from 'express';
import crypto from 'node:crypto';
import { 
  checkLoginRateLimit, 
  recordFailedLogin, 
  resetLoginAttempts, 
  createSessionToken, 
  COOKIE_NAME, 
  getClientIp,
  verifySessionToken 
} from '../auth.js';
import { config } from '../config.js';

const router = express.Router();

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const rateStatus = checkLoginRateLimit(ip);

  if (!rateStatus.allowed) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Bloqueado temporalmente. Intenta de nuevo en ${rateStatus.waitSeconds} segundos.`
    });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'La contraseña es requerida.' });
  }

  if (!safeCompare(password, config.appPassword)) {
    recordFailedLogin(ip);
    const updatedStatus = checkLoginRateLimit(ip);
    if (!updatedStatus.allowed) {
      return res.status(429).json({
        error: `5 intentos fallidos consecutivos. Has sido bloqueado por 5 minutos.`
      });
    }
    return res.status(401).json({
      error: 'Contraseña incorrecta.',
      remainingAttempts: updatedStatus.remaining
    });
  }

  resetLoginAttempts(ip);
  const token = createSessionToken();

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
  });

  return res.json({ success: true, user: 'Santiago' });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction
  });
  return res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || !verifySessionToken(token)) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: 'Santiago' });
});

export default router;
