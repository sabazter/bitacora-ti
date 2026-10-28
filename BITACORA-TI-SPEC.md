# Bitácora TI — Especificación para Claude Code

> **Instrucción para Claude Code:** construye esta app completa siguiendo esta especificación.
> Trabaja de forma autónoma por fases (ver "Orden de trabajo"), prueba cada fase antes de seguir y, al terminar,
> deja un resumen en `PROGRESO.md` con qué se hizo, qué se probó y qué queda pendiente.
> **No hagas SSH ni despliegues en ningún servidor**: solo desarrolla y prueba en local. El despliegue lo hace Santiago.
> Si algo de esta especificación es ambiguo, toma la decisión más simple, anótala en `PROGRESO.md` y continúa.

---

## 1. Contexto

Santiago es técnico de computación y profesor. Su jefe en el colegio le asignó horas de servicio técnico:

| Día | Horario |
|---|---|
| Lunes | 3:00 pm – 4:30 pm |
| Miércoles | 3:00 pm – 4:30 pm |
| Viernes | 10:45 am – 12:15 pm |

Son 4,5 h por semana. El jefe quiere estar al tanto del trabajo y que las horas rindan. **El jefe solo recibe reportes**: no entra a la app.

La app sirve para tres cosas:
1. **Diario de trabajo y pendientes:** compras, instalaciones, mantenimientos, soporte y mejoras.
2. **Registro de cada sesión** con evidencia (notas y fotos).
3. **Reportes semanales y mensuales** para enviar al jefe en PDF o como texto para WhatsApp o correo.

**Usuario único:** Santiago. Lo usará sobre todo desde el **teléfono** durante las sesiones y desde la PC para planificar.

**Despliegue:** servidor Ubuntu del colegio con Docker, accesible por Tailscale o Cloudflare Tunnel.

---

## 2. Stack (obligatorio)

- **Frontend:** React + Vite, sin librerías de UI pesadas. CSS propio, limpio y **mobile-first**.
- **Backend:** Node.js 22 + Express.
- **Base de datos:** SQLite, con `better-sqlite3` o `node:sqlite`. Archivo en `/data/bitacora.db`.
- **Fotos:** en disco, en `/data/uploads/`. Se comprimen **en el navegador** antes de subir: máximo 1600 px de lado, JPEG con calidad 0,8.
- **Un solo contenedor:** Express sirve la API (`/api/*`) y el build de React.
- **Zona horaria:** `TZ=America/Caracas`. Todas las fechas de sesión se manejan en hora local.
- **Idioma de la interfaz:** español.

---

## 3. Configuración (`.env`)

```env
APP_PASSWORD=cambiar-esto
SESSION_SECRET=cadena-larga-aleatoria
TZ=America/Caracas
PORT=3000
# Horario: dia(1=lun..7=dom)|inicio|fin ; separados por coma
SCHEDULE=1|15:00|16:30,3|15:00|16:30,5|10:45|12:15
# Desde qué fecha se generan sesiones (YYYY-MM-DD). Si está vacío: fecha del primer arranque.
START_DATE=
```

El horario también se puede editar desde la pantalla **Ajustes**. Lo que se guarde en la base de datos tiene prioridad sobre el `.env`.

---

## 4. Modelo de datos

### `tasks`
| Campo | Tipo / valores |
|---|---|
| id | integer PK |
| title | text, obligatorio |
| description | text |
| category | `compra` · `instalacion` · `mantenimiento` · `soporte` · `mejora` |
| status | `todo` · `doing` · `waiting` · `done` |
| priority | `alta` · `media` · `baja` (por defecto: media) |
| location | text (laboratorio, salón, oficina, equipo…) |
| requested_by | text (quién lo pidió) |
| waiting_reason | text (obligatorio cuando el estado es `waiting`) |
| due_date | date, opcional |
| position | integer (orden dentro de la columna) |
| created_at, updated_at, done_at | datetime |
| **Campos de compra** (solo para la categoría `compra`) | |
| est_cost | real |
| currency | text, por defecto `USD` |
| supplier | text |
| purchase_status | `por_cotizar` · `cotizado` · `aprobado` · `comprado` · `recibido` |

### `task_events` (historial)
`id, task_id, type (created|status|note|edit), from_value, to_value, note, created_at`

Cada cambio de estado se registra aquí automáticamente.

### `sessions`
| Campo | Tipo / valores |
|---|---|
| id | integer PK |
| date | date (única junto con `sched_start`) |
| sched_start, sched_end | time (según el horario) |
| actual_start, actual_end | time, opcionales |
| status | `pendiente` · `realizada` · `no_realizada` · `suspendida` |
| reason | text (obligatorio para `no_realizada` y `suspendida`) |
| notes | text |
| closed_at | datetime |

- **Generación automática:** cada vez que se consulta el backend (o al arrancar), se crean las sesiones que faltan desde `START_DATE` hasta hoy, más las próximas 7 días.
- `suspendida` corresponde a un feriado o evento del colegio. **No cuenta como hora asignada.**
- `no_realizada` sí cuenta como asignada pero no cumplida.

### `session_tasks`
`session_id, task_id, minutes (opcional), note`

Registra qué tareas se trabajaron en cada sesión. Al marcar una tarea en una sesión, si su estado era `todo`, pasa a `doing`.

### `evidence`
`id, session_id, task_id (nullable), filename, original_name, caption, created_at`

### `settings`
Pares clave/valor: `schedule`, `start_date`.

---

## 5. Autenticación

- Una sola contraseña (`APP_PASSWORD`). Al iniciar sesión se crea una cookie httpOnly firmada que dura 30 días.
- Todas las rutas `/api/*` excepto `/api/login` requieren esa cookie.
- Limitar los intentos de login: 5 fallidos seguidos bloquean 5 minutos.

---

## 6. Pantallas

Navegación: barra inferior en el móvil y lateral en desktop.

### 6.1 Hoy (pantalla principal)
- Tarjeta con la **sesión actual o la próxima**: fecha, horario y estado. Si está en curso, muestra el tiempo restante.
- **"Trabajé en…":** lista de tareas abiertas (`todo`, `doing`, `waiting`) con casillas para marcar. Cada una admite una nota corta opcional.
- Notas generales de la sesión.
- **Subir fotos:** usa la cámara del teléfono (`<input type="file" accept="image/*" capture="environment" multiple>`). Cada foto admite una descripción y puede asociarse a una tarea.
- Botón **"Cerrar sesión de trabajo"**: marca la sesión como `realizada`. Por defecto la hora real es la programada y se puede editar.
- Botón **"No hubo sesión"**: abre un diálogo para elegir `no_realizada` o `suspendida` y escribir el motivo.
- **Agregar tarea rápida:** título y categoría en una línea.
- Si hay sesiones pasadas que siguen `pendiente`, mostrar un aviso: "Tienes N sesiones sin cerrar".

### 6.2 Tablero
- Kanban de 4 columnas: **Por hacer · En curso · Esperando · Hecho**.
- Filtros por categoría y prioridad. Búsqueda por texto.
- En desktop las tarjetas se arrastran entre columnas. En el móvil se cambia el estado con un selector en la tarjeta.
- Al pasar una tarea a `waiting` se pide el motivo.
- La columna "Hecho" muestra solo los últimos 30 días, con un enlace a "ver todas".
- Cada tarjeta tiene un color o ícono por categoría, una etiqueta de prioridad y la ubicación.
- Al tocar una tarjeta se abre el detalle: se editan todos los campos y se ven su historial (`task_events`), las sesiones donde se trabajó y sus fotos.

### 6.3 Compras
- Tabla o lista de las tareas con categoría `compra`, agrupadas por `purchase_status`.
- Totales del costo estimado: pendiente de aprobar, aprobado sin comprar y comprado este mes.

### 6.4 Bitácora
- Historial de sesiones, de la más reciente a la más antigua, filtrable por mes.
- Cada sesión muestra fecha, horario, estado, tareas trabajadas, notas y miniaturas de las fotos (al tocarlas se ven en grande).
- Se pueden editar las sesiones pasadas.

### 6.5 Reportes
- Selector **Semana / Mes**, con flechas para navegar entre periodos.
- Contenido del reporte:
  - **Horas:** asignadas (las sesiones que no están suspendidas, multiplicadas por su duración), cumplidas (las sesiones realizadas, con su hora real), % de cumplimiento, sesiones suspendidas con su motivo y sesiones no realizadas con su motivo.
  - **Completado:** tareas pasadas a `done` en el periodo, agrupadas por categoría.
  - **En curso:** tareas en `doing`.
  - **Bloqueado / esperando:** tareas en `waiting`, con su motivo.
  - **Compras pendientes:** las que no están en `comprado` ni `recibido`, con su costo estimado y el total.
  - **Requiere decisión del jefe:** compras en `cotizado` (esperando aprobación) y tareas en espera cuyo motivo incluye "aprobación".
  - Hasta 6 fotos de evidencia del periodo.
- Botón **"Descargar PDF"**: vista de impresión con una hoja de estilos `@media print` limpia y encabezado "Reporte de Servicio Técnico — [periodo] — Santiago". Usar `window.print()`; no hace falta generar el PDF en el servidor.
- Botón **"Copiar resumen"**: copia al portapapeles un texto corto pensado para WhatsApp. Ejemplo:

```
📋 Servicio técnico — Semana 27/10 al 31/10
⏱ Horas: 4,5 / 4,5 (100%)
✅ Hecho (3): Instalación proyector Lab 2; Limpieza 10 PCs Lab 1; Cambio de toner impresora sala profesores
🔧 En curso (2): Cableado aula 5B; Actualización Windows Lab 2
⏳ Esperando (1): Switch Lab 1 — falta compra
🛒 Compras pendientes: 2 (~USD 85) — 1 requiere su aprobación
```

### 6.6 Ajustes
- Editar el horario semanal (días y horas) y la fecha de inicio.
- **Exportar respaldo:** descarga un JSON con todos los datos (sin las fotos).
- Cambiar contraseña: no hace falta, se cambia en el `.env`.

---

## 7. API (referencia)

```
POST   /api/login              { password }
POST   /api/logout
GET    /api/me

GET    /api/tasks              ?status=&category=&q=
POST   /api/tasks
GET    /api/tasks/:id          (incluye events, sessions, evidence)
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/move     { status, position, waiting_reason? }

GET    /api/sessions           ?from=&to=
GET    /api/sessions/current   (actual o próxima + pendientes sin cerrar)
GET    /api/sessions/:id
PATCH  /api/sessions/:id       (status, reason, notes, actual_start/end)
PUT    /api/sessions/:id/tasks [{ task_id, minutes?, note? }]

POST   /api/evidence           multipart: file, session_id, task_id?, caption?
DELETE /api/evidence/:id
GET    /uploads/:file          (protegido por la cookie)

GET    /api/reports            ?period=week|month&date=YYYY-MM-DD
GET    /api/reports/text       ?period=&date=   → texto plano para copiar

GET    /api/settings
PUT    /api/settings
GET    /api/export
```

---

## 8. Docker

- **Dockerfile multi-stage:** (1) build del frontend con Vite, (2) imagen final `node:22-alpine` con el backend y `web/dist`.
- **`docker-compose.yml`:**

```yaml
services:
  bitacora:
    build: .
    container_name: bitacora-ti
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
```

- Incluir un **healthcheck** contra `/api/health`.
- Incluir `.env.example` y `.dockerignore`.
- **Script de respaldo** `scripts/backup.sh`: copia `data/` a `backups/bitacora-YYYYMMDD.tar.gz` y conserva los últimos 14 respaldos. Debe poder ejecutarse con cron.

---

## 9. Estructura del proyecto

```
bitacora-ti/
├── server/          # Express + SQLite
│   └── src/
├── web/             # React + Vite
│   └── src/
├── scripts/backup.sh
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md        # en español
└── PROGRESO.md      # lo escribe Claude Code al terminar
```

---

## 10. Orden de trabajo (fases)

1. **Base:** backend, base de datos, login, CRUD de tareas, tablero kanban y generación de sesiones.
2. **Pantalla Hoy:** marcar tareas trabajadas, notas, cerrar sesión, "no hubo sesión" y tarea rápida.
3. **Evidencia:** subida de fotos con compresión en el navegador, bitácora y detalle de tarea.
4. **Compras y Reportes:** vista de compras, reporte semanal y mensual, impresión a PDF y copiar resumen.
5. **Ajustes, Docker y README:** horario editable, exportación, Dockerfile, compose, script de respaldo y documentación.
6. **Pruebas finales:** build de Docker, cargar datos de ejemplo con `npm run seed` (unas 10 tareas y 2 semanas de sesiones) y verificar el flujo completo. Los datos de ejemplo **no** se cargan en producción.

---

## 11. Criterios de aceptación

- [ ] `docker compose up -d --build` levanta la app en el puerto 3000 sin errores.
- [ ] Los datos sobreviven a `docker compose down && docker compose up -d`.
- [ ] Las sesiones de lunes, miércoles y viernes aparecen solas con el horario correcto, en hora de Caracas.
- [ ] Desde el teléfono se puede abrir la sesión de hoy, marcar tareas, subir 2 fotos y cerrarla.
- [ ] El reporte semanal calcula bien las horas: las suspendidas no cuentan como asignadas y las no realizadas cuentan como asignadas pero no cumplidas.
- [ ] "Copiar resumen" produce el texto en el formato del ejemplo.
- [ ] La vista de impresión cabe en 1 o 2 hojas carta, sin menús ni botones.
- [ ] Sin la cookie de sesión, la API y las fotos devuelven 401.
- [ ] El README explica: instalación, `.env`, acceso por Tailscale, respaldo con cron y cómo cambiar el horario.

---

## 12. Despliegue en el servidor del colegio (lo hace Santiago)

```bash
# En el servidor
git clone <repo-privado> bitacora-ti && cd bitacora-ti
cp .env.example .env && nano .env      # poner APP_PASSWORD y SESSION_SECRET
docker compose up -d --build
# Respaldo diario a las 11 pm
(crontab -l; echo "0 23 * * * cd $PWD && ./scripts/backup.sh") | crontab -
```

Acceso: `http://<ip-tailscale-del-servidor>:3000`, o mediante un Cloudflare Tunnel con dominio propio.
