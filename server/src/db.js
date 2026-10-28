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
