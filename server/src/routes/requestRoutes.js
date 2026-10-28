import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { config } from '../config.js';

export const publicRequestRouter = express.Router();
export const adminRequestRouter = express.Router();

// Multer para fotos opcionales enviadas por profesores
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadsDir)) {
      fs.mkdirSync(config.uploadsDir, { recursive: true });
    }
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const uniqueName = `solicitud-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB máx
});

// ==========================================
// RUTAS PÚBLICAS (Para Profesores / Coordinadores)
// ==========================================

// POST /api/public/requests (Libre, sin cuenta)
publicRequestRouter.post('/', upload.single('photo'), (req, res) => {
  const db = getDb();
  const { requester_name, location, type = 'falla', description } = req.body;

  if (!requester_name || !requester_name.trim()) {
    return res.status(400).json({ error: 'Por favor indica tu nombre o quién solicita.' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Por favor describe qué necesitas o cuál es el problema.' });
  }

  const validTypes = ['falla', 'material', 'mejora', 'sugerencia'];
  const cleanType = validTypes.includes(type) ? type : 'falla';
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const insertStmt = db.prepare(`
    INSERT INTO requests (requester_name, location, type, description, photo_url, status)
    VALUES (?, ?, ?, ?, ?, 'pendiente')
  `);

  const result = insertStmt.run(
    requester_name.trim(),
    location ? location.trim() : null,
    cleanType,
    description.trim(),
    photoUrl
  );

  const requestId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

  res.status(201).json({
    success: true,
    message: '¡Tu solicitud ha sido recibida con éxito! Santiago la revisará en la próxima sesión.',
    request: created
  });
});

// GET /api/public/requests (Consulta pública de estado para los profesores)
publicRequestRouter.get('/', (req, res) => {
  const db = getDb();
  // Mostrar las últimas 50 solicitudes para que los profes vean si la suya ya fue atendida
  const rows = db.prepare(`
    SELECT id, requester_name, location, type, description, photo_url, status, admin_note, created_at, resolved_at
    FROM requests
    ORDER BY id DESC
    LIMIT 50
  `).all();

  res.json(rows);
});

// ==========================================
// RUTAS PRIVADAS (Para Santiago / Admin)
// ==========================================

// GET /api/requests (Panel de Santiago)
adminRequestRouter.get('/', (req, res) => {
  const db = getDb();
  const { status, type, q } = req.query;

  let query = 'SELECT * FROM requests WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (q) {
    query += ' AND (requester_name LIKE ? OR location LIKE ? OR description LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY id DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/requests/:id
adminRequestRouter.get('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const record = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!record) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  res.json(record);
});

// PATCH /api/requests/:id (Actualizar estado o notas de Santiago)
adminRequestRouter.patch('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const current = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  const { status, admin_note } = req.body;
  const validStatuses = ['pendiente', 'en_proceso', 'resuelta', 'descartada'];

  let newStatus = current.status;
  if (status && validStatuses.includes(status)) {
    newStatus = status;
  }

  let resolvedAt = current.resolved_at;
  if (newStatus === 'resuelta' && !resolvedAt) {
    resolvedAt = new Date().toISOString();
  } else if (newStatus !== 'resuelta') {
    resolvedAt = null;
  }

  const newNote = admin_note !== undefined ? (admin_note ? admin_note.trim() : null) : current.admin_note;

  db.prepare(`
    UPDATE requests
    SET status = ?, admin_note = ?, resolved_at = ?
    WHERE id = ?
  `).run(newStatus, newNote, resolvedAt, id);

  const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  res.json(updated);
});

// POST /api/requests/:id/convert-to-task (Convertir en Tarea del Tablero Kanban)
adminRequestRouter.post('/:id/convert-to-task', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const requestRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!requestRecord) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  // Mapear tipo de solicitud a categoría de tarea
  const categoryMap = {
    falla: 'soporte',
    material: 'compra',
    mejora: 'mejora',
    sugerencia: 'soporte'
  };
  const category = categoryMap[requestRecord.type] || 'soporte';

  // Obtener posición máxima en 'todo'
  const maxPosRow = db.prepare("SELECT MAX(position) as max_pos FROM tasks WHERE status = 'todo'").get();
  const position = (maxPosRow?.max_pos || 0) + 1;

  // Crear la tarea
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      title, description, category, status, priority, location, requested_by, position, purchase_status
    ) VALUES (?, ?, ?, 'todo', 'media', ?, ?, ?, ?)
  `);

  const taskTitle = `[Solicitud] ${requestRecord.description.slice(0, 60)}${requestRecord.description.length > 60 ? '...' : ''}`;
  const fullDescription = `${requestRecord.description}\n\n(Solicitud #${requestRecord.id} enviada por ${requestRecord.requester_name})`;

  const taskResult = insertTask.run(
    taskTitle,
    fullDescription,
    category,
    requestRecord.location,
    requestRecord.requester_name,
    position,
    category === 'compra' ? 'por_cotizar' : null
  );

  const taskId = Number(taskResult.lastInsertRowid);

  // Registrar evento de auditoría en la tarea
  db.prepare(`
    INSERT INTO task_events (task_id, type, to_value, note)
    VALUES (?, 'created', 'todo', ?)
  `).run(taskId, `Creada desde solicitud de ${requestRecord.requester_name}`);

  // Actualizar la solicitud: pasar a 'en_proceso' y vincular task_id
  db.prepare(`
    UPDATE requests
    SET status = 'en_proceso',
        task_id = ?,
        admin_note = coalesce(admin_note, '') || ' Agendada como Tarea #' || ?
    WHERE id = ?
  `).run(taskId, taskId, id);

  const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  res.json({
    success: true,
    task: createdTask,
    request: updatedRequest
  });
});

// DELETE /api/requests/:id
adminRequestRouter.delete('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const result = db.prepare('DELETE FROM requests WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  res.json({ success: true, message: 'Solicitud eliminada.' });
});
