# ========================================================
# Etapa 1: Compilación del frontend React + Vite
# ========================================================
FROM node:22-alpine AS build-web

WORKDIR /app/web

# Copiar configuración de dependencias del frontend
COPY web/package*.json ./
RUN npm install

# Copiar código fuente y compilar
COPY web/ ./
RUN npm run build

# ========================================================
# Etapa 2: Imagen final ligera con Node.js 22 Alpine
# ========================================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=America/Caracas
ENV DATA_DIR=/data

# Instalar utilidades básicas como tzdata y curl para el healthcheck
RUN apk add --no-cache tzdata curl

# Copiar package.json del servidor e instalar dependencias de producción
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copiar código fuente del servidor
COPY server/src ./server/src

# Copiar el build compilado del frontend hacia web/dist
COPY --from=build-web /app/web/dist ./web/dist

# Crear directorio de datos
RUN mkdir -p /data/uploads

# Exponer el puerto
EXPOSE 3000

# Verificación de salud (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de arranque
CMD ["node", "server/src/index.js"]
