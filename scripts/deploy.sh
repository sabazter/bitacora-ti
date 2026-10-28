#!/bin/bash
# ==============================================================================
# Script de Despliegue Automatizado — Bitácora TI
# Servidor Ubuntu con Docker
# ==============================================================================

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BASE_DIR}"

echo "============================================="
echo "   Despliegue de Bitácora TI en Servidor"
echo "============================================="

# 1. Verificar existencia de .env
if [ ! -f ".env" ]; then
  echo "[*] Creando archivo .env a partir de .env.example..."
  cp .env.example .env
  
  # Generar clave secreta aleatoria segura
  RANDOM_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 40)
  sed -i "s|cadena-larga-aleatoria-super-segura|${RANDOM_SECRET}|g" .env
  
  echo "[!] Se creó un archivo .env inicial."
  echo "[!] Recuerda ajustar APP_PASSWORD si deseas una contraseña personalizada."
fi

# 2. Asegurar permisos en scripts
chmod +x scripts/*.sh 2>/dev/null || true

# 3. Compilar y levantar contenedores con Docker Compose
echo "[*] Compilando imagen y levantando contenedor Docker..."
docker compose up -d --build

# 4. Esperar a que el healthcheck responda
echo "[*] Verificando estado del servicio..."
for i in {1..15}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "[✓] ¡Bitácora TI está funcionando correctamente en el puerto 3000!"
    break
  fi
  sleep 2
done

echo ""
echo "============================================="
echo "   Acceso a la aplicación:"
echo "   - Local:      http://localhost:3000"
echo "   - Tailscale:  http://100.72.18.87:3000"
echo "   - Dominio:    https://soportecsam.sjgmtech.qzz.io"
echo "============================================="
echo "Para programar el respaldo diario automático en cron a las 11:00 PM:"
echo "(crontab -l 2>/dev/null; echo \"0 23 * * * cd ${BASE_DIR} && ./scripts/backup.sh >/dev/null 2>&1\") | crontab -"
echo "============================================="
