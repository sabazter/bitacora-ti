import express from 'express';
import { getDb } from '../db.js';
import { ensureSessionsGenerated, getCurrentDateCaracas } from '../sessionsGenerator.js';

const router = express.Router();

const VALID_SESSION_STATUSES = ['pendiente', 'realizada', 'no_realizada', 'suspendida'];

// GET /api/sessions ?from=&to=
router.get('/', (req, res) => {
  ensureSessionsGenerated();
  const db = getDb();
  const { from, to } = req.query;

  let query = `
    SELECT s.*,
      (SELECT COUNT(*) FROM session_tasks st WHERE st.session_id = s.id) as task_count,
      (SELECT COUNT(*) FROM evidence e WHERE e.session_id = s.id) as evidence_count
    FROM sessions s
    WHERE 1=1
  `;
  const params = [];

  if (from) {
    query += ' AND s.date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND s.date <= ?';
    params.push(to);
  }

  query += ' ORDER BY s.date DESC, s.sched_start DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/sessions/current
router.get('/current', (req, res) => {
  ensureSessionsGenerated();
  const db = getDb();
  const todayStr = getCurrentDateCaracas();

  // Buscar pendientes del pasado sin cerrar (date < today AND status = 'pendiente')
  const pendingPast = db.prepare(`
    SELECT * FROM sessions
    WHERE date < ? AND status = 'pendiente'
    ORDER BY date DESC, sched_start DESC
  `).all(todayStr);

  // Buscar sesión de hoy
  let currentSession = db.prepare(`
    SELECT * FROM sessions
    WHERE date = ?
    ORDER BY sched_start ASC
    LIMIT 1
  `).get(todayStr);

  // Si no hay hoy, buscar la próxima más cercana (date >= today)
  if (!currentSession) {
    currentSession = db.prepare(`
      SELECT * FROM sessions
      WHERE date >= ?
      ORDER BY date ASC, sched_start ASC
      LIMIT 1
    `).get(todayStr);
  }

  // Si aún no hay (ej. calendario viejo), tomar la más reciente
  if (!currentSession) {
    currentSession = db.prepare(`
      SELECT * FROM sessions
      ORDER BY date DESC, sched_start DESC
      LIMIT 1
    `).get();
  }

  let tasksWorked = [];
  let evidenceList = [];

  if (currentSession) {
    tasksWorked = db.prepare(`
      SELECT st.*, t.title, t.category, t.status as current_status, t.priority, t.location
      FROM session_tasks st
      JOIN tasks t ON st.task_id = t.id
      WHERE st.session_id = ?
    `).all(currentSession.id);

    evidenceList = db.prepare('SELECT * FROM evidence WHERE session_id = ? ORDER BY id DESC').all(currentSession.id);
  }

  res.json({
    session: currentSession,
    tasksWorked,
    evidence: evidenceList,
    unclosedPastCount: pendingPast.length,
    unclosedPastSessions: pendingPast
  });
});

// GET /api/sessions/:id
router.get('/:id', (req, res) => {
  ensureSessionsGenerated();
  const db = getDb();
  const sessionId = parseInt(req.params.id, 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: 'ID inválido.' });

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

  const tasksWorked = db.prepare(`
    SELECT st.*, t.title, t.category, t.status as current_status, t.priority, t.location
    FROM session_tasks st
    JOIN tasks t ON st.task_id = t.id
    WHERE st.session_id = ?
  `).all(sessionId);

  const evidence = db.prepare('SELECT * FROM evidence WHERE session_id = ? ORDER BY id DESC').all(sessionId);

  res.json({
    ...session,
    tasksWorked,
    evidence
  });
});

// PATCH /api/sessions/:id (status, reason, notes, actual_start, actual_end)
router.patch('/:id', (req, res) => {
  const db = getDb();
  const sessionId = parseInt(req.params.id, 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: 'ID inválido.' });

  const currentSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!currentSession) return res.status(404).json({ error: 'Sesión no encontrada.' });

  const { status, reason, notes, actual_start, actual_end } = req.body;

  if (status && !VALID_SESSION_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado de sesión inválido.' });
  }

  const targetStatus = status || currentSession.status;
  if ((targetStatus === 'no_realizada' || targetStatus === 'suspendida')) {
    const finalReason = reason !== undefined ? reason : currentSession.reason;
    if (!finalReason || !finalReason.trim()) {
      return res.status(400).json({ error: 'El motivo es obligatorio para sesiones no realizadas o suspendidas.' });
    }
  }

  let closedAt = currentSession.closed_at;
  if (targetStatus === 'realizada' && !closedAt) {
    closedAt = new Date().toISOString();
  }

  // Si se cierra como realizada y no se pasaron horas reales, usar las programadas
  let actStart = actual_start !== undefined ? actual_start : currentSession.actual_start;
  let actEnd = actual_end !== undefined ? actual_end : currentSession.actual_end;
  if (targetStatus === 'realizada' && !actStart) {
    actStart = currentSession.sched_start;
  }
  if (targetStatus === 'realizada' && !actEnd) {
    actEnd = currentSession.sched_end;
  }

  db.prepare(`
    UPDATE sessions
    SET status = ?,
        reason = ?,
        notes = ?,
        actual_start = ?,
        actual_end = ?,
        closed_at = ?
    WHERE id = ?
  `).run(
    targetStatus,
    reason !== undefined ? (reason ? reason.trim() : null) : currentSession.reason,
    notes !== undefined ? (notes ? notes.trim() : null) : currentSession.notes,
    actStart,
    actEnd,
    closedAt,
    sessionId
  );

  const updatedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  res.json(updatedSession);
});

// PUT /api/sessions/:id/tasks [{ task_id, minutes?, note? }]
router.put('/:id/tasks', (req, res) => {
  const db = getDb();
  const sessionId = parseInt(req.params.id, 10);
  if (isNaN(sessionId)) return res.status(400).json({ error: 'ID inválido.' });

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

  const tasksList = req.body;
  if (!Array.isArray(tasksList)) {
    return res.status(400).json({ error: 'El cuerpo debe ser un array de tareas.' });
  }

  // Eliminar tareas actuales de la sesión
  db.prepare('DELETE FROM session_tasks WHERE session_id = ?').run(sessionId);

  const insertStmt = db.prepare(`
    INSERT INTO session_tasks (session_id, task_id, minutes, note)
    VALUES (?, ?, ?, ?)
  `);

  for (const item of tasksList) {
    const taskId = parseInt(item.task_id, 10);
    if (isNaN(taskId)) continue;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) continue;

    insertStmt.run(
      sessionId,
      taskId,
      item.minutes ? parseInt(item.minutes, 10) : null,
      item.note ? item.note.trim() : null
    );

    // Requisito del spec: "Al marcar una tarea en una sesión, si su estado era 'todo', pasa a 'doing'."
    if (task.status === 'todo') {
      db.prepare(`
        UPDATE tasks
        SET status = 'doing', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(taskId);

      db.prepare(`
        INSERT INTO task_events (task_id, type, from_value, to_value, note)
        VALUES (?, 'status', 'todo', 'doing', 'Iniciada en sesión de trabajo')
      `).run(taskId);
    }
  }

  const updatedTasks = db.prepare(`
    SELECT st.*, t.title, t.category, t.status as current_status, t.priority, t.location
    FROM session_tasks st
    JOIN tasks t ON st.task_id = t.id
    WHERE st.session_id = ?
  `).all(sessionId);

  res.json({ success: true, tasks: updatedTasks });
});

export default router;
