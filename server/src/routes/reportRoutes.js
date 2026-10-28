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
