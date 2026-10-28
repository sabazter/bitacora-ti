import crypto from 'node:crypto';
import { config } from './config.js';

// Memoria para el rate limiting de login
// Map de IP -> { attempts: number, lockedUntil: number | null }
const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };

  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    } else {
      // Bloqueo expiró, resetear
      loginAttempts.delete(ip);
      return { allowed: true, remaining: MAX_ATTEMPTS };
    }
  }

  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - record.attempts) };
}

export function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(ip, record);
}

export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Token firmado seguro
export function createSessionToken() {
  const payload = {
    auth: true,
    created: Date.now()
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    // Válido por 30 días
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.created > maxAgeMs) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const COOKIE_NAME = 'bitacora_session';

// Middleware de autenticación
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || req.signedCookies?.[COOKIE_NAME];
  if (!token || !verifySessionToken(token)) {
    return res.status(401).json({ error: 'No autorizado. Se requiere iniciar sesión.' });
  }
  next();
}
