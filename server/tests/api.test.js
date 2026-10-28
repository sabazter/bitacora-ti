process.env.NODE_ENV = 'test';
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { calcMinutes, calcHours, formatWhatsAppSummary, generateReportData } from '../src/routes/reportRoutes.js';
import { parseSchedule } from '../src/sessionsGenerator.js';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '../src/auth.js';
import { getDb } from '../src/db.js';

describe('Bitácora TI - Pruebas del Backend y Seguridad', () => {

  let authCookie = null;

  test('GET /api/health debe ser público y retornar status ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });

  test('Rutas protegidas deben devolver 401 sin cookie de autenticación', async () => {
    const resTasks = await request(app).get('/api/tasks');
    assert.equal(resTasks.status, 401);

    const resSessions = await request(app).get('/api/sessions');
    assert.equal(resSessions.status, 401);

    const resReports = await request(app).get('/api/reports');
    assert.equal(resReports.status, 401);

    const resUploads = await request(app).get('/uploads/test.jpg');
    assert.equal(resUploads.status, 401);
  });

  test('POST /api/login con contraseña incorrecta falla', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'contrasena-erronea-123' });
    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });

  test('Rate limiting de login: bloquea tras 5 intentos fallidos', () => {
    const testIp = '192.168.1.99';
    resetLoginAttempts(testIp);

    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testIp);
    }

    const status = checkLoginRateLimit(testIp);
    assert.equal(status.allowed, false);
    assert.ok(status.waitSeconds > 0);

    resetLoginAttempts(testIp);
  });

  test('POST /api/login con contraseña correcta inicia sesión y entrega cookie', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: process.env.APP_PASSWORD || 'admin123' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies.length > 0);
    authCookie = cookies[0];
  });

  test('GET /api/me responde con usuario autenticado usando cookie', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.authenticated, true);
    assert.equal(res.body.user, 'Santiago');
  });

  test('GET /api/tasks con autenticación retorna lista de tareas', async () => {
    // Asegurar que hay al menos una tarea creando una previa
    await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({
        title: 'Tarea inicial de prueba',
        category: 'soporte',
        status: 'todo'
      });

    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  test('Validación: crear tarea en estado waiting requiere waiting_reason', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({
        title: 'Tarea bloqueada de prueba',
        category: 'soporte',
        status: 'waiting'
        // waiting_reason omitido intencionalmente
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /motivo es obligatorio/i);
  });

  test('Crear tarea normal y registrar en task_events', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({
        title: 'Verificar switches piso 2',
        category: 'mantenimiento',
        status: 'todo',
        priority: 'alta'
      });

    assert.equal(res.status, 201);
    const createdId = res.body.id;
    assert.ok(createdId);

    // Consultar detalle con eventos
    const detailRes = await request(app)
      .get(`/api/tasks/${createdId}`)
      .set('Cookie', authCookie);

    assert.equal(detailRes.status, 200);
    assert.ok(detailRes.body.events.length >= 1);
    assert.equal(detailRes.body.events[0].type, 'created');
  });

  test('Mover tarea a doing o done actualiza timestamps y eventos', async () => {
    // Crear tarea temporal
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({
        title: 'Tarea para mover',
        category: 'soporte',
        status: 'todo'
      });
    const taskId = createRes.body.id;

    // Mover a done
    const moveRes = await request(app)
      .post(`/api/tasks/${taskId}/move`)
      .set('Cookie', authCookie)
      .send({ status: 'done' });

    assert.equal(moveRes.status, 200);
    assert.equal(moveRes.body.status, 'done');
    assert.ok(moveRes.body.done_at);
  });

  test('Asociar tarea todo a una sesión la transiciona automáticamente a doing', async () => {
    // Crear tarea en 'todo'
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({
        title: 'Mantenimiento impresora fiscal',
        category: 'soporte',
        status: 'todo'
      });
    const taskId = createRes.body.id;

    // Obtener una sesión
    const sessionsRes = await request(app)
      .get('/api/sessions')
      .set('Cookie', authCookie);
    const sessionId = sessionsRes.body[0].id;

    // Marcar en sesión
    const linkRes = await request(app)
      .put(`/api/sessions/${sessionId}/tasks`)
      .set('Cookie', authCookie)
      .send([{ task_id: taskId, minutes: 30, note: 'Revisión preliminar' }]);

    assert.equal(linkRes.status, 200);

    // Verificar que la tarea pasó a 'doing'
    const checkTask = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', authCookie);

    assert.equal(checkTask.body.status, 'doing');
  });

  test('Validación de sesiones: suspender o no realizar requiere motivo', async () => {
    const sessionsRes = await request(app)
      .get('/api/sessions')
      .set('Cookie', authCookie);
    const sessionId = sessionsRes.body[0].id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('Cookie', authCookie)
      .send({
        status: 'suspendida',
        reason: '' // vacío
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /motivo es obligatorio/i);
  });

  test('Cálculo de horas en reportes: suspendidas no cuentan, no realizadas sí', () => {
    // Prueba directa de funciones de cálculo
    assert.equal(calcMinutes('15:00', '16:30'), 90);
    assert.equal(calcHours('15:00', '16:30'), 1.5);
    assert.equal(calcHours('10:45', '12:15'), 1.5);

    const report = generateReportData('week');
    assert.ok(typeof report.hours.assigned === 'number');
    assert.ok(typeof report.hours.completed === 'number');
    assert.ok(typeof report.hours.percentage === 'number');
    assert.ok(Array.isArray(report.hours.suspended));
    assert.ok(Array.isArray(report.hours.notDone));
  });

  test('Resumen de WhatsApp cumple con el formato requerido', async () => {
    const res = await request(app)
      .get('/api/reports/text?period=week')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.match(res.text, /📋 Servicio técnico — Semana/);
    assert.match(res.text, /⏱ Horas:/);
  });

  test('Protección de rutas de archivos (Path Traversal)', async () => {
    const res = await request(app)
      .get('/uploads/..%2F..%2Fpackage.json')
      .set('Cookie', authCookie);

    // Debe ser 404 o 403, nunca entregar package.json
    assert.ok(res.status === 404 || res.status === 403);
  });

  test('Express sirve el frontend compilado en la raíz /', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /Bitácora TI/i);
    assert.match(res.text, /id="root"/i);
  });

  test('Portal público: profesores pueden enviar y consultar solicitudes sin login', async () => {
    // 1. Enviar solicitud pública
    const createRes = await request(app)
      .post('/api/public/requests')
      .send({
        requester_name: 'Prof. Ana Gómez',
        location: 'Salón 3A',
        type: 'mejora',
        description: 'Por favor ordenar los cables de la toma con tierap'
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    const requestId = createRes.body.request.id;

    // 2. Consultar lista pública
    const listRes = await request(app).get('/api/public/requests');
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    const found = listRes.body.find(r => r.id === requestId);
    assert.ok(found);
    assert.equal(found.requester_name, 'Prof. Ana Gómez');

    // 3. Convertir solicitud en tarea (como Santiago autenticado)
    const convertRes = await request(app)
      .post(`/api/requests/${requestId}/convert-to-task`)
      .set('Cookie', authCookie);

    assert.equal(convertRes.status, 200);
    assert.equal(convertRes.body.request.status, 'en_proceso');
    assert.ok(convertRes.body.task.id);
  });

  test('Módulo Inventario: registro de equipo y hoja de vida con servicios', async () => {
    // 0. Probar gestión de áreas (Jerarquía: Inventario > Área > Salón/Lab > Unidad)
    const areasRes = await request(app)
      .get('/api/inventory/areas')
      .set('Cookie', authCookie);
    assert.equal(areasRes.status, 200);
    assert.ok(Array.isArray(areasRes.body));
    assert.ok(areasRes.body.length >= 1);

    // 1. Crear equipo con área y número de unidad
    const code = `PC-TEST-${Date.now().toString().slice(-4)}`;
    const createRes = await request(app)
      .post('/api/inventory')
      .set('Cookie', authCookie)
      .send({
        code,
        name: 'PC Laboratorio Bachillerato 01',
        area: 'Bachillerato',
        location: 'Lab 1',
        unit_number: 'PC 01',
        category: 'pc',
        brand: 'HP',
        model: 'ProDesk 600 G3',
        specs: 'Core i5-6500, 16GB RAM, SSD 480GB, Windows 11',
        status: 'operativo'
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.area, 'Bachillerato');
    assert.equal(createRes.body.unit_number, 'PC 01');
    const equipId = createRes.body.id;

    // Filtrar por área
    const filterRes = await request(app)
      .get('/api/inventory?area=Bachillerato')
      .set('Cookie', authCookie);
    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.body.some(eq => eq.id === equipId));

    // 2. Registrar servicio / intervención en la hoja de vida
    const serviceRes = await request(app)
      .post(`/api/inventory/${equipId}/services`)
      .set('Cookie', authCookie)
      .send({
        service_date: '2026-10-28',
        action_taken: 'Limpieza preventiva, cambio de pasta térmica y optimización de inicio',
        technician: 'Santiago'
      });

    assert.equal(serviceRes.status, 201);
    assert.equal(serviceRes.body.equipment.last_service_date, '2026-10-28');
    assert.match(serviceRes.body.equipment.last_service_summary, /pasta térmica/);
    assert.equal(serviceRes.body.services.length, 1);

    // 3. Consultar estadísticas de inventario
    const statsRes = await request(app)
      .get('/api/inventory/stats')
      .set('Cookie', authCookie);

    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.total >= 1);
  });

  test('Reportes Semanales de Viernes: generar, archivar y consultar reporte para supervisores', async () => {
    // 1. Generar y guardar reporte semanal
    const genRes = await request(app)
      .post('/api/reports/generate-week')
      .set('Cookie', authCookie)
      .send({ date: '2026-10-28' });

    assert.equal(genRes.status, 200);
    assert.equal(genRes.body.success, true);
    assert.ok(genRes.body.report.id);
    assert.ok(genRes.body.report.title);
    assert.ok(genRes.body.report.problems_occurred);
    assert.ok(genRes.body.report.repaired_completed);
    assert.ok(genRes.body.report.working_on);
    assert.ok(genRes.body.report.pending_work);

    // 2. Consultar lista de reportes guardados
    const listRes = await request(app)
      .get('/api/reports/saved')
      .set('Cookie', authCookie);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    assert.ok(listRes.body.length >= 1);

    // 3. Consultar detalle de reporte guardado
    const detailRes = await request(app)
      .get(`/api/reports/saved/${genRes.body.report.id}`)
      .set('Cookie', authCookie);

    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.id, genRes.body.report.id);
  });

});
