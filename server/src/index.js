import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { getDb } from './db.js';
import { ensureSessionsGenerated } from './sessionsGenerator.js';
import { requireAuth } from './auth.js';

import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import evidenceRoutes, { serveUploadsProtected } from './routes/evidenceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { publicRequestRouter, adminRequestRouter } from './routes/requestRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Confianza en el proxy (Tailscale / Cloudflare Tunnel / Nginx)
app.set('trust proxy', 1);

// Blindaje: Cabeceras de seguridad HTTP con Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Blindaje: CORS
const corsOptions = {
  origin: config.isProduction ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

// Parsing con límites de tamaño para prevenir ataques de denegación de servicio (DoS)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser(config.sessionSecret));

// Inicializar la base de datos y generar sesiones iniciales
getDb();
ensureSessionsGenerated();

// Healthcheck público (requerido para Docker y orquestadores)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    tz: config.tz
  });
});

// Rutas de autenticación (login es público, logout y me verifican)
app.use('/api', authRoutes);

// Ruta pública de solicitudes para profesores (sin login)
app.use('/api/public/requests', publicRequestRouter);

// Servir archivos de subida protegidos por cookie
serveUploadsProtected(app);

// Todas las demás rutas de la API requieren autenticación
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/sessions', requireAuth, sessionRoutes);
app.use('/api/evidence', requireAuth, evidenceRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/requests', requireAuth, adminRequestRouter);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api', requireAuth, settingsRoutes); // Para /api/export

// Servir frontend compilado de React (en producción o cuando dist exista)
const distPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Manejo de rutas SPA para cliente React
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Manejo centralizado de errores (no filtra stack traces en producción)
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }
  res.status(err.status || 500).json({
    error: config.isProduction ? 'Ocurrió un error interno en el servidor.' : (err.message || 'Error del servidor')
  });
});

// Iniciar servidor solo si no estamos en pruebas automatizadas ni importado como módulo
const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

if (!isTest) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Bitácora TI] Servidor iniciado en http://0.0.0.0:${config.port}`);
    console.log(`[Bitácora TI] Zona horaria: ${config.tz}`);
    console.log(`[Bitácora TI] Directorio de datos: ${config.dataDir}`);
  });
}

export default app;
