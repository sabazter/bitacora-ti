import { getDb, setSetting } from './db.js';
import { ensureSessionsGenerated } from './sessionsGenerator.js';
import { config } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Iniciando carga de datos de ejemplo (seed) ---');

const db = getDb();

// Limpiar datos existentes
db.exec(`
  DELETE FROM evidence;
  DELETE FROM session_tasks;
  DELETE FROM task_events;
  DELETE FROM tasks;
  DELETE FROM sessions;
`);

// Establecer horario y fecha de inicio de hace 2 semanas
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
const startDateStr = twoWeeksAgo.toISOString().slice(0, 10);

setSetting('start_date', startDateStr);
setSetting('schedule', '1|15:00|16:30,3|15:00|16:30,5|10:45|12:15');

// Generar sesiones para las últimas 2 semanas y los próximos 7 días
ensureSessionsGenerated();

// Insertar 11 tareas realistas
const sampleTasks = [
  {
    title: 'Instalación proyector interactivo Lab 2',
    description: 'Instalar soporte de techo y conectar HDMI al CPU del profesor',
    category: 'instalacion',
    status: 'done',
    priority: 'alta',
    location: 'Laboratorio 2',
    requested_by: 'Prof. Carlos',
    done_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'Mantenimiento preventivo 10 PCs Lab 1',
    description: 'Soplado de polvo, cambio de pasta térmica y limpieza de ventiladores',
    category: 'mantenimiento',
    status: 'done',
    priority: 'media',
    location: 'Laboratorio 1',
    requested_by: 'Santiago',
    done_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'Cambio de tóner impresora sala de profesores',
    description: 'Instalar cartucho HP 85A negro y prueba de impresión',
    category: 'soporte',
    status: 'done',
    priority: 'media',
    location: 'Sala de Profesores',
    requested_by: 'Coord. María',
    done_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'Cableado estructurado red aula 5B',
    description: 'Tirar cable UTP Cat6 desde rack principal hasta punto de red del aula',
    category: 'instalacion',
    status: 'doing',
    priority: 'alta',
    location: 'Aula 5B',
    requested_by: 'Dirección'
  },
  {
    title: 'Actualización y antivirus Windows 11 Lab 2',
    description: 'Aplicar parches de seguridad y escanear equipos 1 a 15',
    category: 'mantenimiento',
    status: 'doing',
    priority: 'media',
    location: 'Laboratorio 2',
    requested_by: 'Santiago'
  },
  {
    title: 'Switch Gigabit 16 puertos para Lab 1',
    description: 'Reemplazo del switch dañado con puertos quemados por bajón eléctrico',
    category: 'compra',
    status: 'waiting',
    priority: 'alta',
    location: 'Laboratorio 1',
    requested_by: 'Santiago',
    waiting_reason: 'Falta aprobación del presupuesto por dirección',
    est_cost: 65.0,
    currency: 'USD',
    supplier: 'TecnoPro C.A.',
    purchase_status: 'cotizado'
  },
  {
    title: '3 Bobinas de cable UTP Cat6 305m',
    description: 'Para renovación de cableado en ala oeste y salones de primaria',
    category: 'compra',
    status: 'todo',
    priority: 'media',
    location: 'Depósito TI',
    requested_by: 'Santiago',
    est_cost: 120.0,
    currency: 'USD',
    supplier: 'Distribuidora Redes',
    purchase_status: 'por_cotizar'
  },
  {
    title: '2 Discos SSD Kingston 480GB para servidor local',
    description: 'Configurar RAID 1 para respaldo interno de notas y reportes',
    category: 'compra',
    status: 'doing',
    priority: 'alta',
    location: 'Servidor Central',
    requested_by: 'Santiago',
    est_cost: 70.0,
    currency: 'USD',
    supplier: 'CyberZone',
    purchase_status: 'aprobado'
  },
  {
    title: 'Crear red WiFi aislada para invitados',
    description: 'Configurar VLAN 20 en router Mikrotik con portal cautivo',
    category: 'mejora',
    status: 'todo',
    priority: 'baja',
    location: 'Toda la institución',
    requested_by: 'Dirección'
  },
  {
    title: 'Reparación fuente de poder PC Secretaría',
    description: 'Equipo no enciende, posible fusible o capacitor inflado',
    category: 'soporte',
    status: 'waiting',
    priority: 'alta',
    location: 'Secretaría',
    requested_by: 'Sra. Carmen',
    waiting_reason: 'Esperando llegada de fuente de repuesto'
  },
  {
    title: 'Optimización de arranque PCs Biblioteca',
    description: 'Desactivar servicios innecesarios e instalar bloqueador de anuncios',
    category: 'mejora',
    status: 'todo',
    priority: 'baja',
    location: 'Biblioteca',
    requested_by: 'Bibliotecaria Rosa'
  }
];

const insertTaskStmt = db.prepare(`
  INSERT INTO tasks (
    title, description, category, status, priority, location,
    requested_by, waiting_reason, done_at, est_cost, currency, supplier, purchase_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const taskIds = [];
for (const t of sampleTasks) {
  const res = insertTaskStmt.run(
    t.title,
    t.description,
    t.category,
    t.status,
    t.priority,
    t.location,
    t.requested_by,
    t.waiting_reason || null,
    t.done_at || null,
    t.est_cost || null,
    t.currency || 'USD',
    t.supplier || null,
    t.purchase_status || null
  );
  const taskId = Number(res.lastInsertRowid);
  taskIds.push(taskId);

  db.prepare(`
    INSERT INTO task_events (task_id, type, to_value, note)
    VALUES (?, 'created', ?, 'Tarea creada en seed')
  `).run(taskId, t.status);
}

// Configurar sesiones pasadas con estados realistas
const sessions = db.prepare('SELECT * FROM sessions ORDER BY date ASC, sched_start ASC').all();
console.log(`Sesiones generadas: ${sessions.length}`);

// Marcar las sesiones pasadas
const today = new Date().toISOString().slice(0, 10);
let count = 0;

for (const s of sessions) {
  if (s.date < today) {
    count++;
    if (count === 1) {
      // Primera sesión pasada: Realizada
      db.prepare(`
        UPDATE sessions 
        SET status = 'realizada', 
            actual_start = sched_start, 
            actual_end = sched_end, 
            notes = 'Mantenimiento preventivo completado con éxito en Lab 1.',
            closed_at = datetime('now')
        WHERE id = ?
      `).run(s.id);

      db.prepare('INSERT INTO session_tasks (session_id, task_id, minutes, note) VALUES (?, ?, 60, ?)')
        .run(s.id, taskIds[1], 'Limpieza de 10 PCs');
    } else if (count === 2) {
      // Segunda sesión pasada: Suspendida (feriado)
      db.prepare(`
        UPDATE sessions 
        SET status = 'suspendida', 
            reason = 'Feriado nacional escolar',
            notes = 'No hubo actividad en el colegio.'
        WHERE id = ?
      `).run(s.id);
    } else if (count === 3) {
      // Tercera sesión pasada: Realizada con evidencia
      db.prepare(`
        UPDATE sessions 
        SET status = 'realizada', 
            actual_start = sched_start, 
            actual_end = sched_end, 
            notes = 'Instalación de proyector y prueba de proyección.',
            closed_at = datetime('now')
        WHERE id = ?
      `).run(s.id);

      db.prepare('INSERT INTO session_tasks (session_id, task_id, minutes, note) VALUES (?, ?, 75, ?)')
        .run(s.id, taskIds[0], 'Fijación en techo y cableado');

      // Crear imagen de evidencia de ejemplo
      const dummyFilename = `seed-evidencia-${s.id}.jpg`;
      const dummyPath = path.join(config.uploadsDir, dummyFilename);
      // Escribir un buffer JPEG minimalista válido de 1x1 pixel
      const minimalJpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      fs.writeFileSync(dummyPath, minimalJpg);

      db.prepare(`
        INSERT INTO evidence (session_id, task_id, filename, original_name, caption)
        VALUES (?, ?, ?, 'proyector-instalado.jpg', 'Proyector calibrado en Lab 2')
      `).run(s.id, taskIds[0], dummyFilename);
    } else if (count === 4) {
      // Cuarta sesión: No realizada con motivo
      db.prepare(`
        UPDATE sessions 
        SET status = 'no_realizada', 
            reason = 'Corte eléctrico general en la zona durante la tarde',
            notes = 'No hubo energía en el colegio'
        WHERE id = ?
      `).run(s.id);
    } else {
      // Otras sesiones pasadas: Realizadas
      db.prepare(`
        UPDATE sessions 
        SET status = 'realizada', 
            actual_start = sched_start, 
            actual_end = sched_end, 
            notes = 'Soporte a profesores y revisión de periféricos.',
            closed_at = datetime('now')
        WHERE id = ?
      `).run(s.id);

      db.prepare('INSERT INTO session_tasks (session_id, task_id, minutes, note) VALUES (?, ?, 45, ?)')
        .run(s.id, taskIds[2], 'Reemplazo de tóner');
    }
  }
}

console.log('✅ Seed completado con éxito: 11 tareas, historial de sesiones y evidencia creada.');
