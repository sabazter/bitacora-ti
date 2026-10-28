import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde server o raíz del repo
const rootEnvPath = path.resolve(__dirname, '../../.env');
const serverEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const DATA_DIR = process.env.DATA_DIR 
  ? path.resolve(process.env.DATA_DIR) 
  : (process.env.NODE_ENV === 'production' && fs.existsSync('/data') 
      ? '/data' 
      : path.resolve(__dirname, '../../data'));

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'bitacora.db');

// Asegurar directorios de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  appPassword: process.env.APP_PASSWORD || 'cambiar-esto',
  sessionSecret: process.env.SESSION_SECRET || 'bitacora-super-secret-key-change-in-production',
  tz: process.env.TZ || 'America/Caracas',
  schedule: process.env.SCHEDULE || '1|15:00|16:30,3|15:00|16:30,5|10:45|12:15',
  startDate: process.env.START_DATE || '',
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR,
  dbPath: DB_PATH,
  isProduction: process.env.NODE_ENV === 'production'
};
