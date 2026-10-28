import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Edit3, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../api';

export function BitacoraView({ onSelectPhoto, onOpenTask }) {
  const [sessions, setSessions] = useState([]);
  const [detailedSessions, setDetailedSessions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [editingSession, setEditingSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data);

      // Cargar detalles de las sesiones (tareas y evidencias)
      const detailMap = {};
      for (const s of data) {
        try {
          const detail = await api.getSession(s.id);
          detailMap[s.id] = detail;
        } catch (e) {
          console.error(e);
        }
      }
      setDetailedSessions(detailMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrado por mes (YYYY-MM)
  const filteredSessions = sessions.filter(s => {
    if (!selectedMonth) return true;
    return s.date.startsWith(selectedMonth);
  });

  // Generar lista de meses disponibles a partir de las sesiones
  const months = Array.from(new Set(sessions.map(s => s.date.slice(0, 7)))).sort().reverse();

  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editingSession) return;

    try {
      await api.updateSession(editingSession.id, {
        status: editingSession.status,
        actual_start: editingSession.actual_start || null,
        actual_end: editingSession.actual_end || null,
        notes: editingSession.notes || null,
        reason: (editingSession.status === 'no_realizada' || editingSession.status === 'suspendida') ? editingSession.reason : null
      });

      setEditingSession(null);
      loadSessions();
    } catch (err) {
      alert(err.message || 'Error al guardar');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Filtro por mes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          Historial de Sesiones ({filteredSessions.length})
        </h2>

        <select
          className="form-control"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">Todos los meses</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando bitácora...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredSessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No hay sesiones registradas en este periodo.
            </div>
          ) : (
            filteredSessions.map(s => {
              const detail = detailedSessions[s.id] || s;
              const tasksWorked = detail.tasksWorked || [];
              const evidence = detail.evidence || [];

              return (
                <div key={s.id} className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${s.status}`} style={{ textTransform: 'capitalize' }}>
                        {s.status.replace('_', ' ')}
                      </span>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{s.date}</strong>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        ({s.actual_start || s.sched_start} – {s.actual_end || s.sched_end})
                      </span>
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingSession({ ...detail })}
                      title="Editar sesión"
                    >
                      <Edit3 size={14} />
                      <span>Editar</span>
                    </button>
                  </div>

                  {s.reason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '13px', color: '#991b1b', marginBottom: '0.75rem' }}>
                      <strong>Motivo:</strong> {s.reason}
                    </div>
                  )}

                  {/* Tareas trabajadas en la sesión */}
                  {tasksWorked.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                        Tareas trabajadas ({tasksWorked.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {tasksWorked.map(tw => (
                          <div
                            key={tw.task_id}
                            style={{
                              padding: '0.4rem 0.6rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span
                              style={{ fontWeight: 500, color: '#1e293b', cursor: 'pointer' }}
                              onClick={() => onOpenTask && onOpenTask(tw.task_id)}
                            >
                              • {tw.title}
                            </span>
                            {tw.note && <span style={{ color: '#64748b', fontSize: '12px' }}>"{tw.note}"</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas de la sesión */}
                  {s.notes && (
                    <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                      <strong>Notas:</strong> {s.notes}
                    </div>
                  )}

                  {/* Fotos de evidencia */}
                  {evidence.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ImageIcon size={14} />
                        <span>Evidencia fotográfica ({evidence.length}):</span>
                      </div>
                      <div className="photo-grid">
                        {evidence.map(ph => (
                          <img
                            key={ph.id}
                            src={`/uploads/${ph.filename}`}
                            alt={ph.caption || 'Evidencia'}
                            className="photo-thumb"
                            onClick={() => onSelectPhoto && onSelectPhoto(ph)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Editar Sesión Pasada */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 600 }}>Editar Sesión del {editingSession.date}</div>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingSession(null)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  className="form-control"
                  value={editingSession.status}
                  onChange={e => setEditingSession({ ...editingSession, status: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="realizada">Realizada</option>
                  <option value="no_realizada">No Realizada</option>
                  <option value="suspendida">Suspendida (feriado / evento)</option>
                </select>
              </div>

              {(editingSession.status === 'no_realizada' || editingSession.status === 'suspendida') && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#b45309' }}>Motivo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingSession.reason || ''}
                    onChange={e => setEditingSession({ ...editingSession, reason: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Hora inicio real</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editingSession.actual_start || editingSession.sched_start || ''}
                    onChange={e => setEditingSession({ ...editingSession, actual_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora fin real</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editingSession.actual_end || editingSession.sched_end || ''}
                    onChange={e => setEditingSession({ ...editingSession, actual_end: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notas generales</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={editingSession.notes || ''}
                  onChange={e => setEditingSession({ ...editingSession, notes: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingSession(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
