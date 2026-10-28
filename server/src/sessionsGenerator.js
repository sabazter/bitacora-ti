import { getDb, getSetting, setSetting } from './db.js';
import { config } from './config.js';

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la zona horaria de Caracas
 */
export function getCurrentDateCaracas() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // Formato YYYY-MM-DD
}

/**
 * Parsea la cadena de horario: "1|15:00|16:30,3|15:00|16:30,5|10:45|12:15"
 * Retorna array de objetos: [{ dayOfWeek: 1, start: '15:00', end: '16:30' }, ...]
 * dayOfWeek: 1 = Lunes, ..., 7 = Domingo
 */
export function parseSchedule(scheduleStr) {
  if (!scheduleStr || typeof scheduleStr !== 'string') return [];
  return scheduleStr
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [dayStr, start, end] = part.split('|');
      return {
        dayOfWeek: parseInt(dayStr, 10),
        start: (start || '').trim(),
        end: (end || '').trim()
      };
    })
    .filter(item => !isNaN(item.dayOfWeek) && item.start && item.end);
}

/**
 * Convierte un objeto Date en YYYY-MM-DD
 */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna el día de la semana (1 = Lunes, 7 = Domingo)
 */
function getDayOfWeek1to7(d) {
  const day = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return day === 0 ? 7 : day;
}

/**
 * Genera sesiones automáticamente desde startDate hasta (hoy + 7 días)
 */
export function ensureSessionsGenerated() {
  const db = getDb();
  const todayStr = getCurrentDateCaracas();

  // Obtener horario: DB tiene prioridad sobre .env
  const dbSchedule = getSetting('schedule');
  const scheduleStr = dbSchedule || config.schedule;
  const scheduleRules = parseSchedule(scheduleStr);

  if (scheduleRules.length === 0) return;

  // Obtener start_date: DB > .env > hoy
  let startDateStr = getSetting('start_date') || config.startDate;
  if (!startDateStr) {
    startDateStr = todayStr;
    setSetting('start_date', startDateStr);
  }

  // Parsear fecha inicio y fecha fin (hoy + 7 días)
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const cursor = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

  const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
  const maxDate = new Date(todayYear, todayMonth - 1, todayDay, 12, 0, 0);
  maxDate.setDate(maxDate.getDate() + 7);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO sessions (date, sched_start, sched_end, status)
    VALUES (?, ?, ?, 'pendiente')
  `);

  while (cursor <= maxDate) {
    const curDateStr = formatDate(cursor);
    const dayOfWeek = getDayOfWeek1to7(cursor);

    const matches = scheduleRules.filter(r => r.dayOfWeek === dayOfWeek);
    for (const rule of matches) {
      insertStmt.run(curDateStr, rule.start, rule.end);
    }

    cursor.setDate(cursor.getDate() + 1);
  }
}
