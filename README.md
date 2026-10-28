# 🛠️ Bitácora TI — Soporte Técnico Escolar

Aplicación web **mobile-first** para la gestión del servicio técnico escolar de Santiago. Diseñada para registrar el trabajo diario durante las sesiones asignadas (4,5 horas semanales), documentar evidencias fotográficas, gestionar compras y generar reportes ejecutivos para la dirección del colegio en formato PDF o texto para WhatsApp.

---

## 🚀 Características Principales

- **📱 Mobile-First:** Diseñada para usarse cómodamente desde el teléfono durante las sesiones de soporte y desde la PC para planificar.
- **⏱️ Horario Automatizado:** Generación automática de sesiones en hora de Caracas (`America/Caracas`) para los días de soporte:
  - Lunes: 3:00 pm – 4:30 pm
  - Miércoles: 3:00 pm – 4:30 pm
  - Viernes: 10:45 am – 12:15 pm
- **📋 Tablero Kanban:** Organización en 4 estados (*Por hacer*, *En curso*, *Esperando*, *Hecho*) con filtros por categoría y prioridad, y drag & drop en escritorio.
- **📷 Evidencia Fotográfica Comprimida:** Captura directa con la cámara del móvil. Las imágenes se comprimen en el navegador (Canvas API, máx 1600 px, JPEG calidad 0.8) antes de subirse para optimizar ancho de banda y almacenamiento.
- **🛒 Módulo de Compras:** Seguimiento de presupuestos (`por_cotizar`, `cotizado`, `aprobado`, `comprado`, `recibido`) con totales de costos estimados en USD.
- **📊 Reportes Ejecutivos:**
  - Cálculo de horas asignadas vs. cumplidas (las sesiones suspendidas no restan cumplimiento; las no realizadas quedan justificadas).
  - Resumen listo para copiar a WhatsApp con un solo clic.
  - Exportación a PDF limpio optimizado para impresión en 1-2 páginas carta con `@media print`.
- **🔒 Blindaje de Seguridad:** Autenticación con contraseña única, cookies `httpOnly` firmadas, protección contra ataques de fuerza bruta (bloqueo tras 5 intentos fallidos), cabeceras HTTP seguras con Helmet, validación estricta de rutas de archivos (anti path-traversal) y SQLite con transacciones protegidas.

---

## 📦 Despliegue en el Servidor Ubuntu (3 pasos)

El servidor del colegio cuenta con Docker y conexión por Tailscale y Cloudflare Tunnel.

### 1. Clonar el repositorio y configurar variables
```bash
git clone https://github.com/sabazter/bitacora-ti.git
cd bitacora-ti

# Copiar el archivo de configuración y definir contraseña
cp .env.example .env
nano .env
```

Configura en tu `.env`:
```env
APP_PASSWORD=tu-contraseña-segura
SESSION_SECRET=genera-una-cadena-larga-y-aleatoria
TZ=America/Caracas
PORT=3000
SCHEDULE=1|15:00|16:30,3|15:00|16:30,5|10:45|12:15
START_DATE=
DATA_DIR=/data
```

### 2. Levantar la aplicación con Docker Compose
```bash
docker compose up -d --build
```
*(O simplemente ejecuta `./scripts/deploy.sh`)*

### 3. Programar el respaldo automático diario
Ejecuta este comando para programar el respaldo diario a las 11:00 PM en cron:
```bash
(crontab -l 2>/dev/null; echo "0 23 * * * cd $PWD && ./scripts/backup.sh >/dev/null 2>&1") | crontab -
```

---

## 🌐 Formas de Acceso

1. **Red Local / Servidor:** `http://localhost:3000`
2. **Por Tailscale:** `http://100.72.18.87:3000`
3. **Por Dominio Propio con Cloudflare Tunnel:**
   - **URL:** `https://soportecsam.sjgmtech.qzz.io`

### Configuración en Cloudflare Tunnel
Si usas el Dashboard de Cloudflare Zero Trust:
1. Accede a **Access > Tunnels** y selecciona tu túnel activo.
2. Añade un **Public Hostname**:
   - **Subdominio:** `soportecsam`
   - **Dominio:** `sjgmtech.qzz.io`
   - **Tipo:** `HTTP`
   - **URL:** `localhost:3000` (o `100.72.18.87:3000`)
3. Guarda los cambios. El certificado SSL HTTPS se gestionará de manera automática.

*(Ver `cloudflare-tunnel.example.yml` para configuración por archivo local).*

---

## 💾 Respaldos y Exportación

- **Automático:** El script `scripts/backup.sh` empaqueta la carpeta `/data` (base de datos SQLite y fotos) en `backups/bitacora-YYYYMMDD_HHMMSS.tar.gz` y retiene automáticamente los últimos 14 archivos.
- **Manual desde la App:** Desde la pantalla **Ajustes**, haz clic en **"Exportar Respaldo Completo (JSON)"** para descargar todas las tareas, historial y sesiones en un único archivo JSON.

---

## ⚙️ Desarrollo Local y Pruebas

```bash
# Instalar dependencias
npm install

# Iniciar servidor backend en desarrollo (recarga en caliente)
npm run dev

# Ejecutar suite de pruebas automáticas (16 tests de integración y seguridad)
npm run test

# Cargar base de datos con datos de prueba realistas (11 tareas + 2 semanas de sesiones)
npm run seed

# Compilar frontend para producción
npm run build
```

---

## 📁 Estructura del Código

```
bitacora-ti/
├── server/                    # Backend en Node.js 22 + Express
│   ├── src/
│   │   ├── auth.js            # Lógica de login, tokens firmados y rate limit
│   │   ├── config.js          # Configuración del entorno
│   │   ├── db.js              # SQLite con node:sqlite nativo
│   │   ├── index.js           # Servidor Express, Helmet, CORS, rutas estáticas
│   │   ├── seed.js            # Generador de datos de prueba
│   │   ├── sessionsGenerator.js # Generación automática de sesiones según horario
│   │   └── routes/            # Endpoints: auth, tareas, sesiones, compras, reportes, fotos
│   └── tests/
│       └── api.test.js        # Suite de pruebas unitarias y de integración
├── web/                       # Frontend en React + Vite
│   ├── src/
│   │   ├── api.js             # Cliente HTTP con fetch y manejo de sesión
│   │   ├── App.jsx            # Componente raíz y navegación
│   │   ├── index.css          # CSS mobile-first y estilos de impresión PDF
│   │   ├── components/        # Modal de tarea, lightbox de fotos, navegación
│   │   ├── context/           # AuthContext
│   │   ├── utils/             # Compresor de imágenes en navegador (Canvas)
│   │   └── views/             # Hoy, Tablero, Compras, Bitácora, Reportes, Ajustes, Login
├── scripts/
│   ├── backup.sh              # Script de respaldo y rotación de copias
│   └── deploy.sh              # Script de despliegue automático en Ubuntu
├── Dockerfile                 # Multi-stage build (Vite + Node Alpine)
├── docker-compose.yml         # Orquestación con persistencia y healthcheck
├── cloudflare-tunnel.example.yml # Ejemplo de regla ingress para cloudflared
├── .env.example               # Plantilla de variables de entorno
└── PROGRESO.md                # Bitácora de construcción y verificación
```
