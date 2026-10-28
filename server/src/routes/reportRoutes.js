import express from 'express';
import { getDb } from '../db.js';
import { ensureSessionsGenerated, getCurrentDateCaracas } from '../sessionsGenerator.js';

const router = express.Router();

export function calcMinutes(start, end) {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const total1 = h1 * 60 + m1;
  const total2 = h2 * 60 + m2;
  return Math.max(0, total2 - total1);
}

export function calcHours(start, end) {
  const mins = calcMinutes(start, end);
  return Math.round((mins / 60) * 10) / 10; // Redondear a 1 decimal
}

export function getPeriodRange(period = 'week', targetDateStr = null) {
  const baseDateStr = targetDateStr || getCurrentDateCaracas();
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  let startDate, endDate, label;

  if (period === 'month') {
    startDate = new Date(year, month - 1, 1, 12, 0, 0);
    endDate = new Date(year, month, 0, 12, 0, 0); // Último día del mes
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    label = `${monthNames[month - 1]} ${year}`;
  } else {
    // Semana: lunes a domingo
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(date);
    startDate.setDate(date.getDate() + diffToMonday);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const sDay = String(startDate.getDate()).padStart(2, '0');
    const sMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const eDay = String(endDate.getDate()).padStart(2, '0');
    const eMonth = String(endDate.getMonth() + 1).padStart(2, '0');

    label = `Semana ${sDay}/${sMonth} al ${eDay}/${eMonth}`;
  }

  const format = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  return {
    from: format(startDate),
    to: format(endDate),
    label,
    period
  };
}

export function generateReportData(period, targetDate) {
  ensureSessionsGenerated();
  const db = getDb();
  const range = getPeriodRange(period, targetDate);

  // 1. Obtener sesiones en el periodo
  const sessions = db.prepare(`
    SELECT * FROM sessions
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC, sched_start ASC
  `).all(range.from, range.to);

  let assignedMinutes = 0;
  let completedMinutes = 0;
  const suspendedSessions = [];
  const notDoneSessions = [];

  for (const s of sessions) {
    const schedMins = calcMinutes(s.sched_start, s.sched_end);

    if (s.status === 'suspendida') {
      // Suspendida NO cuenta como hora asignada
      suspendedSessions.push({
        id: s.id,
        date: s.date,
        sched: `${s.sched_start} - ${s.sched_end}`,
        reason: s.reason
      });
    } else {
      // Toda sesión no suspendida cuenta como asignada
      assignedMinutes += schedMins;

      if (s.status === 'realizada') {
        const actualMins = calcMinutes(
          s.actual_start || s.sched_start,
          s.actual_end || s.sched_end
        );
        completedMinutes += actualMins;
      } else if (s.status === 'no_realizada') {
        notDoneSessions.push({
          id: s.id,
          date: s.date,
          sched: `${s.sched_start} - ${s.sched_end}`,
          reason: s.reason
        });
      }
    }
  }

  const assignedHours = Math.round((assignedMinutes / 60) * 10) / 10;
  const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
  const completionPercentage = assignedMinutes > 0
    ? Math.round((completedMinutes / assignedMinutes) * 100)
    : 100;

  // 2. Tareas completadas en el periodo
  const doneTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE status = 'done'
      AND (
        (done_at IS NOT NULL AND substr(done_at, 1, 10) >= ? AND substr(done_at, 1, 10) <= ?)
        OR (done_at IS NULL AND substr(updated_at, 1, 10) >= ? AND substr(updated_at, 1, 10) <= ?)
      )
    ORDER BY done_at DESC, id DESC
  `).all(range.from, range.to, range.from, range.to);

  // Agrupar completadas por categoría
  const doneByCategory = {};
  for (const t of doneTasks) {
    const cat = t.category || 'soporte';
    if (!doneByCategory[cat]) doneByCategory[cat] = [];
    doneByCategory[cat].push(t);
  }

  // 3. Tareas en curso (doing)
  const doingTasks = db.prepare(`
    SELECT * FROM tasks WHERE status = 'doing' ORDER BY id DESC
  `).all();

  // 4. Tareas esperando (waiting)
  const waitingTasks = db.prepare(`
    SELECT * FROM tasks WHERE status = 'waiting' ORDER BY id DESC
  `).all();

  // 5. Compras pendientes (que no están en comprado ni recibido)
  const pendingPurchases = db.prepare(`
    SELECT * FROM tasks
    WHERE category = 'compra'
      AND (purchase_status IS NULL OR purchase_status NOT IN ('comprado', 'recibido'))
    ORDER BY id DESC
  `).all();

  let totalEstCost = 0;
  for (const p of pendingPurchases) {
    if (p.est_cost) totalEstCost += p.est_cost;
  }

  // 6. Requiere decisión del jefe:
  // Compras en cotizado (esperando aprobación) O tareas waiting cuyo motivo incluye 'aprobación' o 'aprobacion'
  const bossDecisionTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE (category = 'compra' AND purchase_status = 'cotizado')
       OR (status = 'waiting' AND (lower(waiting_reason) LIKE '%aprobac%' OR lower(waiting_reason) LIKE '%aprobar%'))
    ORDER BY id DESC
  `).all();

  // 7. Evidencias del periodo (hasta 6)
  const evidenceList = db.prepare(`
    SELECT e.*, s.date as session_date, t.title as task_title
    FROM evidence e
    JOIN sessions s ON e.session_id = s.id
    LEFT JOIN tasks t ON e.task_id = t.id
    WHERE s.date >= ? AND s.date <= ?
    ORDER BY e.id DESC
    LIMIT 6
  `).all(range.from, range.to);

  return {
    range,
    hours: {
      assigned: assignedHours,
      completed: completedHours,
      percentage: completionPercentage,
      suspended: suspendedSessions,
      notDone: notDoneSessions
    },
    tasks: {
      doneCount: doneTasks.length,
      doneList: doneTasks,
      doneByCategory,
      doingCount: doingTasks.length,
      doingList: doingTasks,
      waitingCount: waitingTasks.length,
      waitingList: waitingTasks,
      pendingPurchasesCount: pendingPurchases.length,
      pendingPurchasesList: pendingPurchases,
      pendingPurchasesTotal: Math.round(totalEstCost * 100) / 100,
      bossDecisionCount: bossDecisionTasks.length,
      bossDecisionList: bossDecisionTasks
    },
    evidence: evidenceList
  };
}

export function formatWhatsAppSummary(report) {
  const { range, hours, tasks } = report;

  // Formatear horas: reemplazar punto por coma para español (ej. 4,5)
  const fmtH = h => String(h).replace('.', ',');

  let text = `📋 Servicio técnico — ${range.label}\n`;
  text += `⏱ Horas: ${fmtH(hours.completed)} / ${fmtH(hours.assigned)} (${hours.percentage}%)\n`;

  // Hecho
  if (tasks.doneCount > 0) {
    const titles = tasks.doneList.map(t => t.title).join('; ');
    text += `✅ Hecho (${tasks.doneCount}): ${titles}\n`;
  } else {
    text += `✅ Hecho: Sin tareas cerradas en este periodo\n`;
  }

  // En curso
  if (tasks.doingCount > 0) {
    const titles = tasks.doingList.map(t => t.title).join('; ');
    text += `🔧 En curso (${tasks.doingCount}): ${titles}\n`;
  }

  // Esperando
  if (tasks.waitingCount > 0) {
    const items = tasks.waitingList.map(t => {
      return `${t.title}${t.waiting_reason ? ` — ${t.waiting_reason}` : ''}`;
    }).join('; ');
    text += `⏳ Esperando (${tasks.waitingCount}): ${items}\n`;
  }

  // Compras pendientes
  if (tasks.pendingPurchasesCount > 0) {
    const bossReq = tasks.bossDecisionList.filter(t => t.category === 'compra').length;
    let purchaseLine = `🛒 Compras pendientes: ${tasks.pendingPurchasesCount} (~USD ${tasks.pendingPurchasesTotal})`;
    if (bossReq > 0) {
      purchaseLine += ` — ${bossReq} requiere su aprobación`;
    }
    text += `${purchaseLine}\n`;
  }

  return text.trim();
}

// ========================================================
// REPORTE SEMANAL GUARDADO Y ARCHIVADO (ESPECIAL VIERNES)
// ========================================================

export function saveWeeklyReport(targetDate = null) {
  ensureSessionsGenerated();
  const db = getDb();
  const report = generateReportData('week', targetDate);
  const { range, hours, tasks } = report;

  const weekCode = `${range.from}_${range.to}`;
  const title = `Reporte Semanal: ${range.label}`;

  // 1. Problemas Ocurridos (sesiones no realizadas o suspendidas, fallas reportadas)
  const problems = [];
  if (hours.notDone.length > 0) {
    hours.notDone.forEach(s => problems.push(`Sesión no realizada (${s.date}): ${s.reason}`));
  }
  if (hours.suspended.length > 0) {
    hours.suspended.forEach(s => problems.push(`Sesión suspendida (${s.date}): ${s.reason}`));
  }
  // Consultar fallas reportadas por profesores en el periodo
  const teacherFaults = db.prepare(`
    SELECT * FROM requests 
    WHERE created_at >= ? AND created_at <= ? || ' 23:59:59' AND type = 'falla'
  `).all(range.from, range.to);
  teacherFaults.forEach(f => {
    problems.push(`Falla reportada por ${f.requester_name} en ${f.location || 'Colegio'}: ${f.description}`);
  });
  const problemsText = problems.length > 0 ? problems.join('\n• ') : 'Sin incidencias ni problemas críticos registrados en la semana.';

  // 2. Qué se reparó y completó
  const completed = [];
  tasks.doneList.forEach(t => {
    completed.push(`[${t.category.toUpperCase()}] ${t.title}${t.location ? ` (${t.location})` : ''}`);
  });
  // Consultar intervenciones de inventario en la semana
  const inventoryInterventions = db.prepare(`
    SELECT s.*, eq.code, eq.name, eq.location
    FROM inventory_services s
    JOIN inventory eq ON s.equipment_id = eq.id
    WHERE s.service_date >= ? AND s.service_date <= ?
  `).all(range.from, range.to);
  inventoryInterventions.forEach(inv => {
    completed.push(`[INVENTARIO] ${inv.code} (${inv.name} - ${inv.location}): ${inv.action_taken}`);
  });
  const completedText = completed.length > 0 ? completed.join('\n• ') : 'No se cerraron tareas en este periodo.';

  // 3. En qué se está trabajando (En curso)
  const working = [];
  tasks.doingList.forEach(t => {
    working.push(`${t.title}${t.location ? ` en ${t.location}` : ''}`);
  });
  const workingText = working.length > 0 ? working.join('\n• ') : 'Sin tareas en curso actualmente.';

  // 4. Qué trabajos quedan pendientes y compras
  const pending = [];
  tasks.waitingList.forEach(t => {
    pending.push(`[ESPERANDO] ${t.title}: ${t.waiting_reason || 'Sin motivo especificado'}`);
  });
  // Tareas por hacer (todo)
  const todoTasks = db.prepare("SELECT * FROM tasks WHERE status = 'todo' ORDER BY priority = 'alta' DESC, id DESC LIMIT 5").all();
  todoTasks.forEach(t => {
    pending.push(`[POR HACER] ${t.title}${t.location ? ` (${t.location})` : ''} - Prioridad: ${t.priority}`);
  });
  if (tasks.pendingPurchasesCount > 0) {
    pending.push(`[COMPRAS PENDIENTES] ${tasks.pendingPurchasesCount} requerimientos (~$${tasks.pendingPurchasesTotal} USD)`);
  }
  const pendingText = pending.length > 0 ? pending.join('\n• ') : 'Sin trabajos pendientes pendientes.';

  const insertStmt = db.prepare(`
    INSERT INTO weekly_reports (
      week_code, start_date, end_date, title, hours_assigned, hours_completed,
      completion_percentage, problems_occurred, repaired_completed, working_on, pending_work, raw_data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(week_code) DO UPDATE SET
      hours_assigned = excluded.hours_assigned,
      hours_completed = excluded.hours_completed,
      completion_percentage = excluded.completion_percentage,
      problems_occurred = excluded.problems_occurred,
      repaired_completed = excluded.repaired_completed,
      working_on = excluded.working_on,
      pending_work = excluded.pending_work,
      raw_data_json = excluded.raw_data_json,
      generated_at = datetime('now', 'localtime')
  `);

  insertStmt.run(
    weekCode,
    range.from,
    range.to,
    title,
    hours.assigned,
    hours.completed,
    hours.percentage,
    problemsText,
    completedText,
    workingText,
    pendingText,
    JSON.stringify(report)
  );

  return db.prepare('SELECT * FROM weekly_reports WHERE week_code = ?').get(weekCode);
}

// GET /api/reports/saved (Lista de reportes semanales guardados)
router.get('/saved', (req, res) => {
  const db = getDb();
  // Si hoy es viernes, asegurar que el reporte de esta semana quede generado
  const today = new Date();
  if (today.getDay() === 5) {
    try {
      saveWeeklyReport();
    } catch (e) {
      console.error('Error auto-generando reporte de viernes:', e);
    }
  }

  const reports = db.prepare(`
    SELECT id, week_code, start_date, end_date, title, hours_assigned, hours_completed, completion_percentage, generated_at
    FROM weekly_reports
    ORDER BY start_date DESC
  `).all();
  res.json(reports);
});

// GET /api/reports/saved/:id (Detalle de un reporte semanal guardado)
router.get('/saved/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const report = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(id);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });

  res.json(report);
});

// POST /api/reports/generate-week (Generar y guardar reporte semanal actual o por fecha)
router.post('/generate-week', (req, res) => {
  const { date } = req.body || {};
  const saved = saveWeeklyReport(date || null);
  res.json({
    success: true,
    message: 'Reporte semanal generado y guardado exitosamente.',
    report: saved
  });
});

// GET /api/reports ?period=week|month&date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { period = 'week', date } = req.query;
  const report = generateReportData(period, date);
  res.json(report);
});

// GET /api/reports/text ?period=&date=
router.get('/text', (req, res) => {
  const { period = 'week', date } = req.query;
  const report = generateReportData(period, date);
  const text = formatWhatsAppSummary(report);
  res.type('text/plain').send(text);
});

export default router;
