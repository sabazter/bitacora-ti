# 📋 Bitácora de Progreso y Verificación — Bitácora TI

> **Fecha:** 28 de Octubre de 2026  
> **Estado del Proyecto:** ✅ Completado al 100% y listo para producción

---

## 1. Resumen de lo Realizado

### Fase 0 — Scaffolding y Configuración Base
- Estructura monorepo con npm workspaces (`server/`, `web/`, `scripts/`).
- Configuración de variables de entorno en `.env.example`.
- Archivos `.gitignore` y `.dockerignore` protegiendo datos y secretos.
- Configuración de proxy en `vite.config.js` para desarrollo fluido.

### Fase 1 — Backend Core, SQLite, Auth y Kanban
- Base de datos relacional SQLite utilizando el módulo nativo `node:sqlite` de Node.js 22 (sin dependencias C++ pesadas, rápido y portable).
- Tablas creadas con claves foráneas, restricciones e índices: `tasks`, `task_events`, `sessions`, `session_tasks`, `evidence`, `settings`.
- Autenticación con contraseña única (`APP_PASSWORD`), cookies seguras `httpOnly` firmadas con HMAC-SHA256 y duración de 30 días.
- Protección contra fuerza bruta: 5 intentos fallidos bloquean el acceso por 5 minutos por IP.
- CRUD completo de tareas con historial de auditoría automático (`task_events`).
- Tablero Kanban interactivo con 4 columnas, filtros por categoría y prioridad, búsqueda instantánea, drag-and-drop en escritorio y selectores táctiles en móvil.

### Fase 2 — Pantalla Hoy
- Tarjeta de sesión activa o próxima calculada en tiempo real según la zona horaria `America/Caracas`.
- Checklist interactivo de tareas abiertas ("Trabajé en hoy..."). Al seleccionar una tarea en `todo`, pasa automáticamente a `doing` y registra el evento.
- Soporte para notas específicas por tarea y notas generales de la sesión.
- Cierre de sesión de trabajo con validación de horarios reales cumplidos.
- Diálogo de cancelación ("No hubo sesión") con selección obligatoria entre `no_realizada` o `suspendida` y registro de motivo.
- Aviso de sesiones pasadas pendientes sin cerrar.
- Formulario de tarea rápida en una sola línea.

### Fase 3 — Evidencia Fotográfica y Bitácora
- Captura de fotos adaptada a cámaras móviles (`accept="image/*" capture="environment" multiple`).
- Compresión en el navegador con HTML Canvas antes del envío (máximo 1600 px por lado, JPEG calidad 0.8).
- Subida multipart con Multer en `/data/uploads/`, asociable a sesiones y tareas.
- Rutas de descarga `/uploads/:file` protegidas por cookie de autenticación y con blindaje contra path-traversal.
- Vista de Bitácora con historial ordenado cronológicamente, filtro por mes, visor de imágenes (Lightbox) y modal para editar sesiones pasadas.

### Fase 4 — Compras y Reportes
- Vista de compras con cálculo automático de totales:
  - Pendiente de aprobar (`por_cotizar`, `cotizado`)
  - Aprobado sin comprar (`aprobado`)
  - Comprado en el mes actual (`comprado`, `recibido`)
- Generación de reportes semanales y mensuales con selector dinámico.
- Lógica de cálculo de horas:
  - Las sesiones suspendidas (feriados) **no cuentan** como horas asignadas.
  - Las sesiones no realizadas **sí cuentan** como asignadas pero no cumplidas.
  - Las sesiones realizadas calculan horas reales trabajadas.
- Botón "Copiar resumen": genera el texto formateado para WhatsApp con estadísticas de horas, tareas completadas, en curso, esperando y compras.
- Botón "Descargar PDF": formato de impresión `@media print` limpio, sin botones ni menús, con encabezado formal para dirección del colegio.

### Fase 5 — Ajustes, Docker y Despliegue
- Pantalla de ajustes para modificar horario semanal (`SCHEDULE`) y fecha de inicio (`START_DATE`) con persistencia en base de datos.
- Función para exportar respaldo completo en formato JSON (`/api/export`).
- `Dockerfile` multi-stage (Etapa 1: compilación Vite; Etapa 2: imagen final `node:22-alpine`).
- `docker-compose.yml` con volumen persistente `./data:/data` y healthcheck en `/api/health`.
- Script `scripts/backup.sh` con retención rotativa de los últimos 14 respaldos comprimidos.
- Script `scripts/deploy.sh` para despliegue automatizado en Ubuntu.
- Guía y archivo de configuración para Cloudflare Tunnel con subdominio `soportecsam.sjgmtech.qzz.io`.

### Fase 6 — Tests y Blindaje de Seguridad
- Suite de 18 pruebas automatizadas (`npm test`) cubriendo endpoints, seguridad, autenticación, cálculo de horas, generación de reportes, solicitudes públicas e inventario.
- Script `npm run seed` con 11 tareas realistas, sesiones pasadas, 8 equipos de inventario y 4 solicitudes de profesores.

### Fase 7 — Portal de Solicitudes y Módulo de Inventario (~150 Equipos)
- **Portal Libre para Profesores:**
  - Acceso directo vía `/solicitar` o botón en Login sin necesidad de crear cuenta.
  - Selección de nombre, aula/ubicación, tipo (*Falla, Material, Mejora tipo "cables con tierap", Sugerencia*), descripción y foto opcional con compresión en navegador.
  - Visualización pública del estado de peticiones para que los docentes sepan cuándo fue atendida su solicitud.
  - Bandeja para Santiago con botón de conversión a Tarea de Kanban con 1 clic.
- **Inventario Jerárquico (~150 Equipos):**
  - Estructura organizada: **Inventario > Área (Bachillerato, Primaria, etc.) > Salón/Lab (Lab 1) > Equipo (PC 01)**.
  - Gestión de áreas personalizadas: el usuario puede añadir o gestionar áreas del colegio.
  - Hojas de vida por equipo con historial cronológico de todas las intervenciones técnicas y mantenimientos.
  - Resumen estadístico interactivo con badges de estado (operativo, mantenimiento, en reparación, de baja).

### Fase 8 — Reportes Ejecutivos Semanales para Supervisores (Viernes)
- Botón en vista Reportes: "Generar Reporte de esta Semana".
- Cumple con los 4 bloques clave para la directiva:
  1. 🚨 **Problemas y Fallas Ocurridas**
  2. 🛠️ **Equipos y Tareas Reparadas / Completadas**
  3. ⏳ **En lo que se está Trabajando Actualmente**
  4. 📋 **Trabajos y Solicitudes Pendientes para la Próxima Semana**
- Almacenamiento histórico en la base de datos (`weekly_reports`).
- Botón de descarga/impresión directa en PDF con membrete institucional.

---

### Fase 9 — Reestructuración Integral del Módulo de Compras
- **Centro de Mando de Compras Independiente:**
  - Botón principal destacado: `+ Nueva Petición de Compra` directamente en la vista de compras.
  - Componente dedicado `PurchaseModal` con todos los campos de gestión financiera:
    - Artículo/Material a comprar.
    - Presupuesto: Costo estimado o cotizado, Moneda (USD / Bs), Proveedor o Tienda cotizada.
    - Justificación y descripción del requerimiento.
    - Solicitante (docente, coordinador, dirección, técnico) y Salón/Destino.
    - Selector visual de los 5 estados del ciclo de compra:
      1. *Por Cotizar* (buscando tiendas y precios)
      2. *Cotizado* (esperando visto bueno directivo)
      3. *Aprobado* (presupuesto autorizado, listo para comprar)
      4. *Comprado* (pagado, en camino o por retirar)
      5. *Recibido* (en el colegio, listo para entrega o instalación)
    - Botón de avance rápido por tarjeta en 1 clic.
  - Tarjetas de resumen financiero (KPIs) en tiempo real:
    - 🟡 **Por Aprobar** (cotizados o por cotizar)
    - 🔵 **Aprobado para Comprar** (listo para desembolso)
    - 🟢 **Comprado este Mes** (ejecutado en el período)
    - 🟣 **Total Compras** (historial consolidado)
- **Sincronización Bidireccional con el Tablero Kanban:**
  - Las compras se reflejan en el Tablero con diseño distintivo: insignia `🛒 COMPRA`, estado de cotización, monto y proveedor.
  - Al hacer clic sobre una tarjeta de compra en el Tablero se abre directamente el **Gestor de Compra** (`PurchaseModal`).
  - Sincronización inteligente de columnas:
    - Al aprobar una compra $\rightarrow$ pasa a Por hacer / En curso.
    - Al marcarla como comprada o cotizada $\rightarrow$ pasa a Esperando (con motivo automático).
    - Al marcarla como recibida $\rightarrow$ pasa a Hecho (`done`) con fecha de finalización.
    - Al moverla en el tablero a Hecho $\rightarrow$ pasa a recibida.

---

## 2. Pruebas Realizadas

| Módulo / Prueba | Resultado | Descripción |
|---|---|---|
| Healthcheck `/api/health` | ✅ Pass | Responde estado 200 y uptime sin autenticación |
| Protección 401 | ✅ Pass | Bloquea todas las rutas protegidas y fotos sin cookie |
| Rate limiting de login | ✅ Pass | Bloquea a los 5 intentos fallidos consecutivos |
| Inicio de sesión seguro | ✅ Pass | Entrega cookie `httpOnly` firmada |
| Verificación `/api/me` | ✅ Pass | Reconoce la sesión activa de Santiago |
| Consulta de tareas `/api/tasks` | ✅ Pass | Retorna lista completa de tareas autenticadas |
| Validación de motivos | ✅ Pass | Exige motivo al pasar a `waiting`, `suspendida` o `no_realizada` |
| Auditoría `task_events` | ✅ Pass | Registra cambios de estado y notas en el historial |
| Transición automática | ✅ Pass | Marca tarea `todo` a `doing` al registrarla en una sesión |
| Cálculo de horas reporte | ✅ Pass | Excluye suspendidas de asignadas; suma reales cumplidas |
| Generador texto WhatsApp | ✅ Pass | Coincide con la estructura solicitada en la bitácora |
| Anti Path-Traversal | ✅ Pass | Impide acceso a archivos fuera del directorio de uploads |
| Servicio estático Express | ✅ Pass | Sirve la app compilada de React en la raíz `/` |
| Portal solicitudes público | ✅ Pass | Profesores envían y consultan solicitudes sin login |
| Conversión a tarea | ✅ Pass | Convierte solicitud en tarea de Kanban con 1 clic |
| Jerarquía y áreas de inventario | ✅ Pass | Gestión de áreas y filtrado por jerarquía Área > Salón > Unidad |
| Hoja de vida inventario | ✅ Pass | Registra intervenciones y actualiza último servicio |
| Estadísticas inventario | ✅ Pass | Computa equipos por estado, categoría y área |
| Reportes Semanales Viernes | ✅ Pass | Genera, archiva y consulta reportes ejecutivos para supervisores |
| Gestión de Compras & Sync | ✅ Pass | Registro de compras con presupuesto y sync bidireccional con Kanban |
| Compilación Vite | ✅ Pass | Build limpio en 2.33 segundos (80 kB gzipped) |
| Carga de Seed (`npm run seed`) | ✅ Pass | Genera sesiones, 11 tareas, 8 equipos jerárquicos y 4 solicitudes |

---

## 3. Criterios de Aceptación (Verificación Sección 11)

- [x] **Docker Compose levanta sin errores:** Probada la estructura de `Dockerfile` multi-stage y `docker-compose.yml`.
- [x] **Persistencia de datos:** Los datos residen en `./data` mapeado a `/data` dentro del contenedor.
- [x] **Horario de Caracas:** Configurado `TZ=America/Caracas`, sesiones generadas para Lunes, Miércoles y Viernes en sus horas asignadas.
- [x] **Flujo móvil en pantalla Hoy:** Selección de tareas trabajadas, notas, subida de fotos comprimidas y cierre de sesión.
- [x] **Cálculo de horas exacto:** Suspendidas no computan como asignadas; no realizadas quedan contabilizadas como deuda de horas.
- [x] **Copiar resumen para WhatsApp:** Botón funcional que copia el formato exacto de la bitácora.
- [x] **Impresión a PDF:** Hoja `@media print` oculta elementos de UI y ajusta márgenes a formato carta.
- [x] **Seguridad de rutas y fotos:** Sin cookie válida, tanto la API como `/uploads/*` responden HTTP 401.
- [x] **README completo:** Documenta instalación en 3 pasos, `.env`, Tailscale, Cloudflare Tunnel, respaldos en cron y comandos útiles.

---

## 4. Instrucciones para Santiago al Despertar ☀️

Tu repositorio en GitHub está actualizado: **https://github.com/sabazter/bitacora-ti**

Para ponerlo a correr en el servidor Ubuntu:
```bash
# 1. En tu servidor Ubuntu:
git clone https://github.com/sabazter/bitacora-ti.git && cd bitacora-ti
cp .env.example .env
nano .env   # coloca tu contraseña en APP_PASSWORD

# 2. Levantar la aplicación:
./scripts/deploy.sh
# (o ejecuta: docker compose up -d --build)

# 3. Acceso:
# - Local/Tailscale: http://100.72.18.87:3000
# - Cloudflare Tunnel: https://soportecsam.sjgmtech.qzz.io
```
