#!/bin/bash
# ==============================================================================
# Script de Respaldo Automatizado — Bitácora TI
# Copia la carpeta data/ a backups/bitacora-YYYYMMDD_HHMMSS.tar.gz
# Mantiene únicamente los últimos 14 respaldos para no saturar disco
# ==============================================================================

set -e

# Directorio base del proyecto
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BASE_DIR}/backups"
DATA_DIR="${BASE_DIR}/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/bitacora-${TIMESTAMP}.tar.gz"

# Crear directorio de respaldos si no existe
mkdir -p "${BACKUP_DIR}"

if [ ! -d "${DATA_DIR}" ]; then
  echo "[!] Directorio ${DATA_DIR} no existe. Nada que respaldar."
  exit 1
fi

echo "[*] Creando respaldo de datos en: ${BACKUP_FILE}"
# Realizar checkpoint de SQLite si existe archivo .db para asegurar que WAL se consolide
if command -v sqlite3 >/dev/null 2>&1 && [ -f "${DATA_DIR}/bitacora.db" ]; then
  sqlite3 "${DATA_DIR}/bitacora.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
fi

# Comprimir la carpeta data
tar -czf "${BACKUP_FILE}" -C "${BASE_DIR}" data

echo "[✓] Respaldo generado con éxito: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Rotación de respaldos: conservar solo los 14 más recientes
echo "[*] Limpiando respaldos antiguos (conservando los últimos 14)..."
cd "${BACKUP_DIR}"
ls -t bitacora-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[✓] Limpieza completada. Respaldos actuales:"
ls -lh bitacora-*.tar.gz 2>/dev/null || true
