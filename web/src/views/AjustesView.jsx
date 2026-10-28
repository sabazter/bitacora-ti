import React, { useState, useEffect } from 'react';
import { Settings, Download, Save, Clock, Key, ShieldCheck, Check } from 'lucide-react';
import { api } from '../api';

export function AjustesView() {
  const [schedule, setSchedule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tz, setTz] = useState('America/Caracas');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSchedule(data.schedule || '');
      setStartDate(data.start_date || '');
      setTz(data.tz || 'America/Caracas');
    } catch (err) {
      setError(err.message || 'Error al cargar ajustes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async e => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateSettings({
        schedule: schedule.trim(),
        start_date: startDate ? startDate.trim() : ''
      });
      setMessage('Ajustes guardados correctamente. Las sesiones se han actualizado.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Error al guardar ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    window.open(api.exportBackupUrl, '_blank');
  };

  return (
    <div className="page-wrapper">
      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={18} color="#2563eb" />
            <span>Configuración de Horario y Sesiones</span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Cargando ajustes...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Horario Semanal de Servicio</label>
              <input
                type="text"
                className="form-control"
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                placeholder="1|15:00|16:30,3|15:00|16:30,5|10:45|12:15"
                required
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Formato: <code>dia(1=lun..7=dom)|inicio|fin</code> separados por coma.
                <br />
                Por defecto: Lunes (1) 15:00 a 16:30, Miércoles (3) 15:00 a 16:30, Viernes (5) 10:45 a 12:15.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Inicio de Generación</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Fecha desde la cual se crean automáticamente las sesiones hacia adelante.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Zona Horaria Activa</label>
              <input
                type="text"
                className="form-control"
                value={tz}
                disabled
                style={{ background: '#f8fafc', color: '#64748b' }}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Configurada en el entorno del servidor (TZ=America/Caracas).
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Ajustes'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Exportar Respaldo */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Download size={18} color="#059669" />
            <span>Respaldo de Información</span>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '1rem' }}>
          Descarga un archivo JSON completo con todas las tareas, historial de cambios, registro de sesiones y configuración de la bitácora.
        </p>

        <button className="btn btn-success" onClick={handleExport}>
          <Download size={16} />
          <span>Exportar Respaldo Completo (JSON)</span>
        </button>
      </div>

      {/* Seguridad y Contraseña */}
      <div className="card" style={{ background: '#f8fafc' }}>
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck size={18} color="#2563eb" />
            <span>Seguridad y Contraseña</span>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
          La contraseña de acceso se define en la variable <code>APP_PASSWORD</code> dentro del archivo <code>.env</code> en el servidor.
          Para cambiarla, edita el archivo <code>.env</code> y reinicia el contenedor con:
        </p>

        <pre style={{
          background: '#0f172a',
          color: '#f8fafc',
          padding: '0.75rem',
          borderRadius: '8px',
          fontSize: '12px',
          overflowX: 'auto',
          marginTop: '0.5rem'
        }}>
          docker compose restart
        </pre>
      </div>
    </div>
  );
}
