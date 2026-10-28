import express from 'express';
import { getDb, getSetting, setSetting } from '../db.js';
import { config } from '../config.js';
import { ensureSessionsGenerated } from '../sessionsGenerator.js';

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  const schedule = getSetting('schedule', config.schedule);
  const startDate = getSetting('start_date', config.startDate);

  res.json({
    schedule,
    start_date: startDate,
    tz: config.tz
  });
});

// PUT /api/settings
router.put('/', (req, res) => {
  const { schedule, start_date } = req.body;

  if (schedule !== undefined) {
    if (typeof schedule !== 'string') {
      return res.status(400).json({ error: 'El formato del horario no es válido.' });
    }
    setSetting('schedule', schedule.trim());
  }

  if (start_date !== undefined) {
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({ error: 'La fecha de inicio debe tener el formato YYYY-MM-DD.' });
    }
    setSetting('start_date', start_date ? start_date.trim() : '');
  }

  // Regenerar sesiones con el nuevo horario/fecha
  ensureSessionsGenerated();

  res.json({
    success: true,
    schedule: getSetting('schedule', config.schedule),
    start_date: getSetting('start_date', config.startDate)
  });
});

// GET /api/export (descarga JSON de respaldo completo sin fotos)
router.get('/export', (req, res) => {
  const db = getDb();

  const data = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    settings: db.prepare('SELECT * FROM settings').all(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    task_events: db.prepare('SELECT * FROM task_events').all(),
    sessions: db.prepare('SELECT * FROM sessions').all(),
    session_tasks: db.prepare('SELECT * FROM session_tasks').all(),
    evidence: db.prepare('SELECT id, session_id, task_id, filename, original_name, caption, created_at FROM evidence').all(),
    requests: db.prepare('SELECT * FROM requests').all(),
    inventory: db.prepare('SELECT * FROM inventory').all(),
    inventory_services: db.prepare('SELECT * FROM inventory_services').all()
  };

  const filename = `bitacora-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
});

export default router;
