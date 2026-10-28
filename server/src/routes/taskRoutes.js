import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

const VALID_CATEGORIES = ['compra', 'instalacion', 'mantenimiento', 'soporte', 'mejora'];
const VALID_STATUSES = ['todo', 'doing', 'waiting', 'done'];
const VALID_PRIORITIES = ['alta', 'media', 'baja'];
const VALID_PURCHASE_STATUSES = ['por_cotizar', 'cotizado', 'aprobado', 'comprado', 'recibido'];

// GET /api/tasks ?status=&category=&q=
router.get('/', (req, res) => {
  const db = getDb();
  const { status, category, q } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    query += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ? OR requested_by LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY position ASC, id DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// POST /api/tasks
router.post('/', (req, res) => {
  const db = getDb();
  const {
    title,
    description,
    category,
    status = 'todo',
    priority = 'media',
    location,
    requested_by,
    waiting_reason,
    due_date,
    est_cost,
    currency = 'USD',
    supplier,
    purchase_status
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'El título de la tarea es obligatorio.' });
  }

  const cleanCategory = category && VALID_CATEGORIES.includes(category) ? category : 'soporte';
  let cleanStatus = status && VALID_STATUSES.includes(status) ? status : 'todo';
  const cleanPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'media';

  const cleanPurchaseStatus = purchase_status && VALID_PURCHASE_STATUSES.includes(purchase_status)
    ? purchase_status
    : (cleanCategory === 'compra' ? 'por_cotizar' : null);

  let cleanWaitingReason = waiting_reason;
  // Sincronización inteligente inicial para compras
  if (cleanCategory === 'compra') {
    if (cleanPurchaseStatus === 'cotizado' && cleanStatus === 'todo') {
      cleanStatus = 'waiting';
      cleanWaitingReason = cleanWaitingReason || 'Esperando aprobación de cotización por directiva';
    } else if (cleanPurchaseStatus === 'comprado' && cleanStatus === 'todo') {
      cleanStatus = 'waiting';
      cleanWaitingReason = cleanWaitingReason || 'Material comprado: esperando llegada/entrega';
    } else if (cleanPurchaseStatus === 'recibido') {
      cleanStatus = 'done';
    }
  }

  if (cleanStatus === 'waiting' && (!cleanWaitingReason || !cleanWaitingReason.trim())) {
    return res.status(400).json({ error: 'El motivo es obligatorio cuando el estado es Esperando.' });
  }

  const doneAt = cleanStatus === 'done' ? new Date().toISOString() : null;

  // Obtener la siguiente posición para el estado
  const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM tasks WHERE status = ?').get(cleanStatus);
  const position = (maxPosRow?.max_pos || 0) + 1;

  const insertStmt = db.prepare(`
    INSERT INTO tasks (
      title, description, category, status, priority, location,
      requested_by, waiting_reason, due_date, position, done_at,
      est_cost, currency, supplier, purchase_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    title.trim(),
    description || null,
    cleanCategory,
    cleanStatus,
    cleanPriority,
    location || null,
    requested_by || null,
    cleanStatus === 'waiting' ? cleanWaitingReason?.trim() : null,
    due_date || null,
    position,
    doneAt,
    est_cost !== undefined && est_cost !== null && est_cost !== '' ? parseFloat(est_cost) : null,
    currency || 'USD',
    supplier || null,
    cleanPurchaseStatus
  );

  const taskId = Number(result.lastInsertRowid);

  // Registrar evento de creación
  db.prepare(`
    INSERT INTO task_events (task_id, type, to_value, note)
    VALUES (?, 'created', ?, 'Tarea creada')
  `).run(taskId, cleanStatus);

  const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.status(201).json(createdTask);
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) return res.status(400).json({ error: 'ID inválido.' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });

  const events = db.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY id DESC').all(taskId);

  const sessions = db.prepare(`
    SELECT s.*, st.minutes, st.note as task_note
    FROM sessions s
    JOIN session_tasks st ON s.id = st.session_id
    WHERE st.task_id = ?
    ORDER BY s.date DESC, s.sched_start DESC
  `).all(taskId);

  const evidence = db.prepare('SELECT * FROM evidence WHERE task_id = ? ORDER BY id DESC').all(taskId);

  res.json({
    ...task,
    events,
    sessions,
    evidence
  });
});

// PATCH /api/tasks/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) return res.status(400).json({ error: 'ID inválido.' });

  const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!currentTask) return res.status(404).json({ error: 'Tarea no encontrada.' });

  const updates = { ...req.body };
  const allowedFields = [
    'title', 'description', 'category', 'status', 'priority', 'location',
    'requested_by', 'waiting_reason', 'due_date', 'position', 'est_cost',
    'currency', 'supplier', 'purchase_status'
  ];

  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
    return res.status(400).json({ error: 'Categoría inválida.' });
  }
  if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
    return res.status(400).json({ error: 'Prioridad inválida.' });
  }
  if (updates.purchase_status && !VALID_PURCHASE_STATUSES.includes(updates.purchase_status)) {
    return res.status(400).json({ error: 'Estado de compra inválido.' });
  }

  // Sincronización inteligente de compra <-> tablero Kanban
  const isCompra = (updates.category || currentTask.category) === 'compra';
  if (isCompra) {
    if (updates.purchase_status) {
      if (updates.purchase_status === 'recibido' && !updates.status) {
        updates.status = 'done';
      } else if (updates.purchase_status === 'aprobado' && !updates.status && currentTask.status === 'waiting') {
        updates.status = 'todo';
        updates.waiting_reason = null;
      } else if (updates.purchase_status === 'cotizado' && !updates.status) {
        updates.status = 'waiting';
        updates.waiting_reason = updates.waiting_reason || 'Esperando aprobación de cotización por directiva';
      } else if (updates.purchase_status === 'comprado' && !updates.status) {
        updates.status = 'waiting';
        updates.waiting_reason = updates.waiting_reason || 'Material comprado: esperando llegada/entrega';
      } else if (updates.purchase_status === 'por_cotizar' && !updates.status && currentTask.status === 'done') {
        updates.status = 'todo';
      }
    } else if (updates.status) {
      if (updates.status === 'done' && currentTask.purchase_status !== 'recibido') {
        updates.purchase_status = 'recibido';
      }
    }
  }

  const targetStatus = updates.status || currentTask.status;
  if (targetStatus === 'waiting') {
    const reason = updates.waiting_reason !== undefined ? updates.waiting_reason : currentTask.waiting_reason;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'El motivo es obligatorio cuando el estado es Esperando.' });
    }
  }

  // Manejar cambio de estado
  let statusChanged = false;
  if (updates.status && updates.status !== currentTask.status) {
    statusChanged = true;
    if (updates.status === 'done') {
      updates.done_at = new Date().toISOString();
    } else if (currentTask.status === 'done') {
      updates.done_at = null;
    }
  }

  const setClauses = [];
  const params = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      let val = updates[field];
      if (typeof val === 'string') val = val.trim();
      if (field === 'est_cost' && val !== null && val !== '') val = parseFloat(val);
      params.push(val);
    }
  }

  if (updates.done_at !== undefined) {
    setClauses.push('done_at = ?');
    params.push(updates.done_at);
  }

  setClauses.push("updated_at = datetime('now', 'localtime')");
  params.push(taskId);

  db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  // Registrar eventos en task_events
  if (statusChanged) {
    db.prepare(`
      INSERT INTO task_events (task_id, type, from_value, to_value, note)
      VALUES (?, 'status', ?, ?, ?)
    `).run(
      taskId,
      currentTask.status,
      updates.status,
      updates.status === 'waiting' ? (updates.waiting_reason || currentTask.waiting_reason || null) : null
    );
  } else if (updates.note) {
    db.prepare(`
      INSERT INTO task_events (task_id, type, note)
      VALUES (?, 'note', ?)
    `).run(taskId, updates.note.trim());
  } else {
    db.prepare(`
      INSERT INTO task_events (task_id, type, note)
      VALUES (?, 'edit', 'Tarea editada')
    `).run(taskId);
  }

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.json(updatedTask);
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) return res.status(400).json({ error: 'ID inválido.' });

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  if (result.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada.' });

  res.json({ success: true, message: 'Tarea eliminada exitosamente.' });
});

// POST /api/tasks/:id/move { status, position, waiting_reason? }
router.post('/:id/move', (req, res) => {
  const db = getDb();
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) return res.status(400).json({ error: 'ID inválido.' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });

  const { status, position, waiting_reason } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  if (status === 'waiting' && (!waiting_reason || !waiting_reason.trim()) && (!task.waiting_reason || !task.waiting_reason.trim())) {
    return res.status(400).json({ error: 'El motivo es obligatorio al pasar a Esperando.' });
  }

  const statusChanged = status !== task.status;
  const doneAt = status === 'done' ? (task.done_at || new Date().toISOString()) : (statusChanged ? null : task.done_at);
  const newReason = status === 'waiting' ? (waiting_reason?.trim() || task.waiting_reason) : task.waiting_reason;
  const newPos = position !== undefined ? parseInt(position, 10) : task.position;

  db.prepare(`
    UPDATE tasks 
    SET status = ?, position = ?, waiting_reason = ?, done_at = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, newPos, newReason, doneAt, taskId);

  if (statusChanged) {
    db.prepare(`
      INSERT INTO task_events (task_id, type, from_value, to_value, note)
      VALUES (?, 'status', ?, ?, ?)
    `).run(taskId, task.status, status, status === 'waiting' ? newReason : null);
  }

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.json(updatedTask);
});

export default router;
