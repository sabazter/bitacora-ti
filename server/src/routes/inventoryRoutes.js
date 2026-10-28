import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

const VALID_CATEGORIES = ['pc', 'laptop', 'proyector', 'impresora', 'red', 'monitor', 'ups', 'otro'];
const VALID_STATUSES = ['operativo', 'mantenimiento_pendiente', 'en_reparacion', 'de_baja'];

// ==========================================
// GESTIÓN DE ÁREAS (Inventario > Área > Ubicación > Equipo)
// ==========================================

// GET /api/inventory/areas (Listar áreas con conteo de equipos)
router.get('/areas', (req, res) => {
  const db = getDb();
  const areas = db.prepare(`
    SELECT a.*, 
      (SELECT COUNT(*) FROM inventory i WHERE i.area = a.name) as equipment_count,
      (SELECT COUNT(DISTINCT location) FROM inventory i WHERE i.area = a.name) as location_count
    FROM inventory_areas a
    ORDER BY a.name ASC
  `).all();
  res.json(areas);
});

// POST /api/inventory/areas (Crear nueva área)
router.post('/areas', (req, res) => {
  const db = getDb();
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del área es obligatorio (ej. Bachillerato, Primaria).' });
  }

  const existing = db.prepare('SELECT id FROM inventory_areas WHERE lower(name) = lower(?)').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: `Ya existe un área con el nombre "${name.trim()}".` });
  }

  const insert = db.prepare('INSERT INTO inventory_areas (name, description) VALUES (?, ?)');
  const r = insert.run(name.trim(), description ? description.trim() : null);
  const created = db.prepare('SELECT * FROM inventory_areas WHERE id = ?').get(Number(r.lastInsertRowid));

  res.status(201).json(created);
});

// DELETE /api/inventory/areas/:id (Eliminar área y reasignar equipos a 'General')
router.delete('/areas/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const area = db.prepare('SELECT * FROM inventory_areas WHERE id = ?').get(id);
  if (!area) return res.status(404).json({ error: 'Área no encontrada.' });

  if (area.name === 'General') {
    return res.status(400).json({ error: 'El área General no puede ser eliminada.' });
  }

  // Reasignar equipos a 'General'
  db.prepare("UPDATE inventory SET area = 'General' WHERE area = ?").run(area.name);
  db.prepare('DELETE FROM inventory_areas WHERE id = ?').run(id);

  res.json({ success: true, message: `Área "${area.name}" eliminada. Equipos reasignados a General.` });
});

// GET /api/inventory/stats (Estadísticas y resumen de equipos)
router.get('/stats', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count;
  const operativo = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE status = 'operativo'").get().count;
  const mantenimiento = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE status = 'mantenimiento_pendiente'").get().count;
  const enReparacion = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE status = 'en_reparacion'").get().count;
  const deBaja = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE status = 'de_baja'").get().count;

  const byArea = db.prepare(`
    SELECT area, COUNT(*) as count
    FROM inventory
    GROUP BY area
    ORDER BY count DESC
  `).all();

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM inventory
    GROUP BY category
    ORDER BY count DESC
  `).all();

  const byLocation = db.prepare(`
    SELECT area, location, COUNT(*) as count
    FROM inventory
    GROUP BY area, location
    ORDER BY area ASC, location ASC
  `).all();

  res.json({
    total,
    operativo,
    mantenimiento,
    enReparacion,
    deBaja,
    byArea,
    byCategory,
    byLocation
  });
});

// GET /api/inventory (Lista de equipos con filtros y búsqueda)
router.get('/', (req, res) => {
  const db = getDb();
  const { area, category, location, status, q } = req.query;

  let query = 'SELECT * FROM inventory WHERE 1=1';
  const params = [];

  if (area) {
    query += ' AND area = ?';
    params.push(area);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (location) {
    query += ' AND location = ?';
    params.push(location);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    query += ' AND (code LIKE ? OR name LIKE ? OR brand LIKE ? OR model LIKE ? OR area LIKE ? OR location LIKE ? OR unit_number LIKE ? OR specs LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term, term, term, term, term);
  }

  query += ' ORDER BY area ASC, location ASC, unit_number ASC, code ASC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// POST /api/inventory (Crear nuevo equipo)
router.post('/', (req, res) => {
  const db = getDb();
  const {
    code,
    name,
    area = 'General',
    location,
    unit_number,
    category = 'pc',
    brand,
    model,
    specs,
    status = 'operativo',
    notes
  } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'El código o identificador del equipo es obligatorio (ej. PC-LAB1-01).' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del equipo es obligatorio.' });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'La ubicación o salón es obligatorio (ej. Lab 1, Aula 3).' });
  }

  const cleanCategory = VALID_CATEGORIES.includes(category) ? category : 'pc';
  const cleanStatus = VALID_STATUSES.includes(status) ? status : 'operativo';
  const cleanArea = area ? area.trim() : 'General';

  // Asegurar que el área exista en inventory_areas
  db.prepare('INSERT OR IGNORE INTO inventory_areas (name) VALUES (?)').run(cleanArea);

  // Verificar código único
  const existing = db.prepare('SELECT id FROM inventory WHERE code = ?').get(code.trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Ya existe un equipo registrado con el código ${code.trim().toUpperCase()}.` });
  }

  const insertStmt = db.prepare(`
    INSERT INTO inventory (
      code, name, area, location, unit_number, category, brand, model, specs, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    code.trim().toUpperCase(),
    name.trim(),
    cleanArea,
    location.trim(),
    unit_number ? unit_number.trim() : null,
    cleanCategory,
    brand ? brand.trim() : null,
    model ? model.trim() : null,
    specs ? specs.trim() : null,
    cleanStatus,
    notes ? notes.trim() : null
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM inventory WHERE id = ?').get(newId);

  res.status(201).json(created);
});

// GET /api/inventory/:id (Detalle de equipo con historial de intervenciones)
router.get('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const equipment = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  if (!equipment) return res.status(404).json({ error: 'Equipo no encontrado.' });

  const services = db.prepare(`
    SELECT s.*, ses.date as session_date, t.title as task_title
    FROM inventory_services s
    LEFT JOIN sessions ses ON s.session_id = ses.id
    LEFT JOIN tasks t ON s.task_id = t.id
    WHERE s.equipment_id = ?
    ORDER BY s.service_date DESC, s.id DESC
  `).all(id);

  res.json({
    ...equipment,
    services
  });
});

// PATCH /api/inventory/:id (Actualizar equipo)
router.patch('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const current = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Equipo no encontrado.' });

  const allowedFields = ['name', 'category', 'brand', 'model', 'area', 'location', 'unit_number', 'specs', 'status', 'notes'];
  const updates = { ...req.body };

  if (updates.area && updates.area.trim()) {
    db.prepare('INSERT OR IGNORE INTO inventory_areas (name) VALUES (?)').run(updates.area.trim());
  }

  if (updates.code && updates.code.trim().toUpperCase() !== current.code) {
    const existing = db.prepare('SELECT id FROM inventory WHERE code = ? AND id != ?').get(updates.code.trim().toUpperCase(), id);
    if (existing) {
      return res.status(400).json({ error: `El código ${updates.code.trim().toUpperCase()} ya está en uso.` });
    }
    allowedFields.push('code');
    updates.code = updates.code.trim().toUpperCase();
  }

  const setClauses = [];
  const params = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      let val = updates[field];
      if (typeof val === 'string') val = val.trim();
      params.push(val);
    }
  }

  if (setClauses.length === 0) {
    return res.json(current);
  }

  setClauses.push("updated_at = datetime('now', 'localtime')");
  params.push(id);

  db.prepare(`UPDATE inventory SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/inventory/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const result = db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Equipo no encontrado.' });

  res.json({ success: true, message: 'Equipo eliminado del inventario.' });
});

// POST /api/inventory/:id/services (Registrar servicio o intervención en hoja de vida)
router.post('/:id/services', (req, res) => {
  const db = getDb();
  const equipmentId = parseInt(req.params.id, 10);
  if (isNaN(equipmentId)) return res.status(400).json({ error: 'ID inválido.' });

  const equipment = db.prepare('SELECT id FROM inventory WHERE id = ?').get(equipmentId);
  if (!equipment) return res.status(404).json({ error: 'Equipo no encontrado.' });

  const {
    service_date = new Date().toISOString().slice(0, 10),
    action_taken,
    technician = 'Santiago',
    notes,
    session_id,
    task_id,
    update_equipment_status
  } = req.body;

  if (!action_taken || !action_taken.trim()) {
    return res.status(400).json({ error: 'Debes describir qué trabajo o servicio se le realizó al equipo.' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO inventory_services (
      equipment_id, service_date, action_taken, technician, session_id, task_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    equipmentId,
    service_date,
    action_taken.trim(),
    technician ? technician.trim() : 'Santiago',
    session_id ? parseInt(session_id, 10) : null,
    task_id ? parseInt(task_id, 10) : null,
    notes ? notes.trim() : null
  );

  // Actualizar automáticamente fecha de último servicio y resumen en la ficha del equipo
  let statusUpdateClause = '';
  const statusParams = [service_date, action_taken.trim()];

  if (update_equipment_status && VALID_STATUSES.includes(update_equipment_status)) {
    statusUpdateClause = ', status = ?';
    statusParams.push(update_equipment_status);
  }

  statusParams.push(equipmentId);

  db.prepare(`
    UPDATE inventory
    SET last_service_date = ?,
        last_service_summary = ?
        ${statusUpdateClause},
        updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(...statusParams);

  const updatedEquipment = db.prepare('SELECT * FROM inventory WHERE id = ?').get(equipmentId);
  const services = db.prepare('SELECT * FROM inventory_services WHERE equipment_id = ? ORDER BY service_date DESC, id DESC').all(equipmentId);

  res.status(201).json({
    success: true,
    equipment: updatedEquipment,
    services
  });
});

export default router;
