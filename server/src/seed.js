import { getDb, setSetting } from './db.js';
import { ensureSessionsGenerated } from './sessionsGenerator.js';
import { config } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Iniciando carga de datos de ejemplo (seed) ---');

const db = getDb();

// Limpiar datos existentes
db.exec(`
  DELETE FROM inventory_services;
  DELETE FROM inventory;
  DELETE FROM requests;
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

// Insertar equipos de inventario de ejemplo
console.log('Insertando equipos de inventario de ejemplo...');

const sampleEquipment = [
  {
    code: 'PC-LAB1-01',
    name: 'PC Profesor Lab 1',
    category: 'pc',
    brand: 'HP',
    model: 'ProDesk 600 G3',
    location: 'Laboratorio 1',
    specs: 'Intel Core i5-6500 3.2GHz, 16GB DDR4, SSD 480GB Kingston, Windows 11 Pro',
    status: 'operativo',
    last_service_date: '2026-10-20',
    last_service_summary: 'Mantenimiento preventivo, pasta térmica y actualización a Windows 11'
  },
  {
    code: 'PC-LAB1-02',
    name: 'PC Alumno Lab 1 - Puesto 02',
    category: 'pc',
    brand: 'Dell',
    model: 'OptiPlex 3050',
    location: 'Laboratorio 1',
    specs: 'Intel Core i3-7100, 8GB DDR4, SSD 240GB, Windows 10',
    status: 'operativo',
    last_service_date: '2026-10-20',
    last_service_summary: 'Limpieza de ventiladores y desfragmentación'
  },
  {
    code: 'PC-LAB1-03',
    name: 'PC Alumno Lab 1 - Puesto 03',
    category: 'pc',
    brand: 'Dell',
    model: 'OptiPlex 3050',
    location: 'Laboratorio 1',
    specs: 'Intel Core i3-7100, 8GB DDR4, HDD 500GB, Windows 10',
    status: 'mantenimiento_pendiente',
    last_service_date: '2026-08-15',
    last_service_summary: 'Disco mecánico lento, requiere migración a SSD'
  },
  {
    code: 'PROY-LAB2',
    name: 'Proyector Interactivo Lab 2',
    category: 'proyector',
    brand: 'Epson',
    model: 'PowerLite X39',
    location: 'Laboratorio 2',
    specs: '3500 lúmenes, HDMI/VGA, Lámpara 240W',
    status: 'operativo',
    last_service_date: '2026-10-25',
    last_service_summary: 'Instalación en techo y calibración de proyección con PC docente'
  },
  {
    code: 'IMP-SALAPROF',
    name: 'Impresora Sala de Profesores',
    category: 'impresora',
    brand: 'HP',
    model: 'LaserJet P1102w',
    location: 'Sala de Profesores',
    specs: 'Monocromática, Tóner CE285A (85A), USB y WiFi',
    status: 'operativo',
    last_service_date: '2026-10-26',
    last_service_summary: 'Reemplazo de cartucho de tóner y prueba de impresión en red'
  },
  {
    code: 'PC-SEC-01',
    name: 'PC Secretaria Principal',
    category: 'pc',
    brand: 'Lenovo',
    model: 'ThinkCentre M720s',
    location: 'Secretaría',
    specs: 'Intel Core i5-8400, 8GB RAM, SSD 256GB, Windows 11',
    status: 'en_reparacion',
    last_service_date: '2026-10-24',
    last_service_summary: 'Fuente de poder dañada por bajón eléctrico, esperando repuesto'
  },
  {
    code: 'SW-LAB1',
    name: 'Switch de Red Lab 1',
    category: 'red',
    brand: 'TP-Link',
    model: 'TL-SG1016D Gigabit',
    location: 'Laboratorio 1',
    specs: '16 puertos Gigabit 10/100/1000 Mbps',
    status: 'mantenimiento_pendiente',
    last_service_date: '2026-09-10',
    last_service_summary: 'Puertos 3 y 4 con fallas, cotizada sustitución'
  },
  {
    code: 'ROUTER-PPAL',
    name: 'Router Principal Mikrotik',
    category: 'red',
    brand: 'MikroTik',
    model: 'RB750Gr3 (hEX)',
    location: 'Servidor Central',
    specs: 'Dual Core 880MHz, 256MB RAM, 5 puertos GbE, RouterOS v7',
    status: 'operativo',
    last_service_date: '2026-10-05',
    last_service_summary: 'Respaldo de configuración y asignación de DHCP para nuevo rango'
  }
];

const insertEquipStmt = db.prepare(`
  INSERT INTO inventory (
    code, name, category, brand, model, location, specs, status, last_service_date, last_service_summary
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertServiceStmt = db.prepare(`
  INSERT INTO inventory_services (
    equipment_id, service_date, action_taken, technician, notes
  ) VALUES (?, ?, ?, ?, ?)
`);

for (const eq of sampleEquipment) {
  const r = insertEquipStmt.run(
    eq.code,
    eq.name,
    eq.category,
    eq.brand,
    eq.model,
    eq.location,
    eq.specs,
    eq.status,
    eq.last_service_date,
    eq.last_service_summary
  );
  const equipId = Number(r.lastInsertRowid);

  if (eq.last_service_date && eq.last_service_summary) {
    insertServiceStmt.run(
      equipId,
      eq.last_service_date,
      eq.last_service_summary,
      'Santiago',
      'Servicio inicial registrado en inventario'
    );
  }
}

// Insertar solicitudes de profesores de ejemplo
console.log('Insertando solicitudes de ejemplo...');
const sampleRequests = [
  {
    requester_name: 'Prof. Carlos Mendoza',
    location: 'Laboratorio 1',
    type: 'mejora',
    description: 'Por favor si puedes ordenar los cables detrás del escritorio con tierap para que los alumnos no los pateen.',
    status: 'pendiente'
  },
  {
    requester_name: 'Coord. María Rodríguez',
    location: 'Sala de Profesores',
    type: 'material',
    description: 'Necesitamos una resma de papel carta y verificar si queda tóner de repuesto en el depósito.',
    status: 'en_proceso',
    admin_note: 'Agendada para compra en próxima sesión'
  },
  {
    requester_name: 'Prof. Luisa Blanco',
    location: 'Aula 4A',
    type: 'falla',
    description: 'El cable HDMI del salón tiene falso contacto y la pantalla parpadea en verde cuando se mueve la laptop.',
    status: 'pendiente'
  },
  {
    requester_name: 'Sra. Carmen (Secretaría)',
    location: 'Secretaría',
    type: 'falla',
    description: 'La computadora no prende esta mañana, hace un zumbido bajo y se apaga.',
    status: 'resuelta',
    admin_note: 'Revisada: fuente de poder dañada, se dejó desmontada esperando repuesto'
  }
];

const insertReqStmt = db.prepare(`
  INSERT INTO requests (requester_name, location, type, description, status, admin_note)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const rq of sampleRequests) {
  insertReqStmt.run(
    rq.requester_name,
    rq.location,
    rq.type,
    rq.description,
    rq.status,
    rq.admin_note || null
  );
}

console.log('✅ Seed completado con éxito: 11 tareas, historial de sesiones, 8 equipos de inventario y 4 solicitudes de profesores.');
