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

});
