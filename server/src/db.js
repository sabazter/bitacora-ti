import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(config.dbPath);
    // Habilitar foreign keys y modo WAL para mejor concurrencia
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('compra', 'instalacion', 'mantenimiento', 'soporte', 'mejora')),
      status TEXT CHECK(status IN ('todo', 'doing', 'waiting', 'done')) DEFAULT 'todo',
      priority TEXT CHECK(priority IN ('alta', 'media', 'baja')) DEFAULT 'media',
      location TEXT,
      requested_by TEXT,
      waiting_reason TEXT,
      due_date TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      done_at TEXT,
      est_cost REAL,
      currency TEXT DEFAULT 'USD',
      supplier TEXT,
      purchase_status TEXT CHECK(purchase_status IS NULL OR purchase_status IN ('por_cotizar', 'cotizado', 'aprobado', 'comprado', 'recibido'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT CHECK(type IN ('created', 'status', 'note', 'edit')),
      from_value TEXT,
      to_value TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      sched_start TEXT NOT NULL,
      sched_end TEXT NOT NULL,
      actual_start TEXT,
      actual_end TEXT,
      status TEXT CHECK(status IN ('pendiente', 'realizada', 'no_realizada', 'suspendida')) DEFAULT 'pendiente',
      reason TEXT,
      notes TEXT,
      closed_at TEXT,
      UNIQUE(date, sched_start)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

    CREATE TABLE IF NOT EXISTS session_tasks (
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      minutes INTEGER,
      note TEXT,
      PRIMARY KEY (session_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_session_id ON evidence(session_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence(task_id);

    -- Solicitudes y reportes de profesores y coordinadores (sin cuenta)
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_name TEXT NOT NULL,
      location TEXT,
      type TEXT CHECK(type IN ('falla', 'material', 'mejora', 'sugerencia')) DEFAULT 'falla',
      description TEXT NOT NULL,
      photo_url TEXT,
      status TEXT CHECK(status IN ('pendiente', 'en_proceso', 'resuelta', 'descartada')) DEFAULT 'pendiente',
      admin_note TEXT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

    -- Inventario de equipos del colegio
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('pc', 'laptop', 'proyector', 'impresora', 'red', 'monitor', 'ups', 'otro')) DEFAULT 'pc',
      brand TEXT,
      model TEXT,
      location TEXT NOT NULL,
      specs TEXT,
      status TEXT CHECK(status IN ('operativo', 'mantenimiento_pendiente', 'en_reparacion', 'de_baja')) DEFAULT 'operativo',
      last_service_date TEXT,
      last_service_summary TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code);
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
    CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location);
    CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

    -- Hoja de vida / Historial de servicios e intervenciones por equipo
    CREATE TABLE IF NOT EXISTS inventory_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      service_date TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      technician TEXT DEFAULT 'Santiago',
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_services_equipment_id ON inventory_services(equipment_id);

    -- Reportes semanales guardados para supervisores
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_code TEXT UNIQUE NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      title TEXT NOT NULL,
      hours_assigned REAL DEFAULT 0,
      hours_completed REAL DEFAULT 0,
      completion_percentage REAL DEFAULT 0,
      problems_occurred TEXT,
      repaired_completed TEXT,
      working_on TEXT,
      pending_work TEXT,
      raw_data_json TEXT,
      generated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_code ON weekly_reports(week_code);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_start_date ON weekly_reports(start_date);
  `);
}

// Helpers para consultar y actualizar settings
export function getSetting(key, defaultValue = null) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}
