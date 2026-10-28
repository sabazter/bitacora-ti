import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

// Configuración de almacenamiento seguro con Multer
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
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  }
});

// Filtro estricto de tipos de archivo (solo imágenes)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WebP).'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB máximo
  }
});

// POST /api/evidence
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo de imagen.' });
  }

  const db = getDb();
  const sessionId = parseInt(req.body.session_id, 10);
  if (isNaN(sessionId)) {
    // Si falla, borrar el archivo subido
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'El ID de sesión es obligatorio.' });
  }

  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Sesión no encontrada.' });
  }

  const taskId = req.body.task_id ? parseInt(req.body.task_id, 10) : null;
  const caption = req.body.caption ? req.body.caption.trim() : null;

  const insertStmt = db.prepare(`
    INSERT INTO evidence (session_id, task_id, filename, original_name, caption)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    sessionId,
    isNaN(taskId) ? null : taskId,
    req.file.filename,
    req.file.originalname,
    caption
  );

  const evidenceId = Number(result.lastInsertRowid);
  const createdEvidence = db.prepare('SELECT * FROM evidence WHERE id = ?').get(evidenceId);

  res.status(201).json(createdEvidence);
});

// DELETE /api/evidence/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const evidenceId = parseInt(req.params.id, 10);
  if (isNaN(evidenceId)) return res.status(400).json({ error: 'ID inválido.' });

  const record = db.prepare('SELECT * FROM evidence WHERE id = ?').get(evidenceId);
  if (!record) return res.status(404).json({ error: 'Evidencia no encontrada.' });

  // Eliminar archivo de disco
  const filePath = path.join(config.uploadsDir, record.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error al eliminar archivo del disco:', e);
    }
  }

  db.prepare('DELETE FROM evidence WHERE id = ?').run(evidenceId);
  res.json({ success: true, message: 'Evidencia eliminada exitosamente.' });
});

export default router;

// Función para servir archivos de upload de forma protegida con prevención de path traversal
export function serveUploadsProtected(app) {
  app.get('/uploads/:file', requireAuth, (req, res) => {
    const filename = path.basename(req.params.file); // Prevenir path traversal
    const safePath = path.resolve(config.uploadsDir, filename);

    // Asegurar que safePath esté estrictamente dentro de config.uploadsDir
    if (!safePath.startsWith(path.resolve(config.uploadsDir))) {
      return res.status(403).json({ error: 'Acceso no permitido.' });
    }

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    res.sendFile(safePath);
  });
}
