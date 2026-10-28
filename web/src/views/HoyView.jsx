import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  Plus, 
  Save, 
  X, 
  ChevronRight, 
  XCircle, 
  UploadCloud,
  Check 
} from 'lucide-react';
import { api } from '../api';
import { compressImage } from '../utils/imageCompressor';

export function HoyView({ onOpenTask, onSelectPhoto }) {
  const [data, setData] = useState(null);
  const [openTasks, setOpenTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Tarea rápida
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState('soporte');
  const [isAddingQuick, setIsAddingQuick] = useState(false);

  // Estados de edición de sesión actual
  const [sessionNotes, setSessionNotes] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [taskNotes, setTaskNotes] = useState({});

  // Diálogo para cerrar sesión
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');

  // Diálogo "No hubo sesión"
  const [showNoSessionModal, setShowNoSessionModal] = useState(false);
  const [noSessionStatus, setNoSessionStatus] = useState('no_realizada');
  const [noSessionReason, setNoSessionReason] = useState('');

  // Subida de fotos
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoTaskId, setPhotoTaskId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [currentRes, tasksRes] = await Promise.all([
        api.getCurrentSession(),
        api.getTasks()
      ]);

      setData(currentRes);
      if (currentRes.session) {
        setSessionNotes(currentRes.session.notes || '');
        setActualStart(currentRes.session.actual_start || currentRes.session.sched_start);
        setActualEnd(currentRes.session.actual_end || currentRes.session.sched_end);

        const currentTaskMap = new Set();
        const currentNoteMap = {};
        for (const t of currentRes.tasksWorked || []) {
          currentTaskMap.add(t.task_id);
          if (t.note) currentNoteMap[t.task_id] = t.note;
        }
        setSelectedTaskIds(currentTaskMap);
        setTaskNotes(currentNoteMap);
      }

      // Filtrar solo tareas abiertas (todo, doing, waiting)
      setOpenTasks(tasksRes.filter(t => t.status !== 'done'));
    } catch (err) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = taskId => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setSelectedTaskIds(next);
  };

  const handleSaveSessionWork = async () => {
    if (!data?.session) return;
    try {
      const tasksPayload = Array.from(selectedTaskIds).map(id => ({
        task_id: id,
        note: taskNotes[id] || null
      }));

      await Promise.all([
        api.updateSession(data.session.id, { notes: sessionNotes }),
        api.updateSessionTasks(data.session.id, tasksPayload)
      ]);

      setMessage('Progreso guardado correctamente.');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message || 'Error al guardar progreso');
    }
  };

  const handleQuickAddTask = async e => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsAddingQuick(true);
    try {
      const newTask = await api.createTask({
        title: quickTitle.trim(),
        category: quickCategory,
        status: 'todo'
      });
      setQuickTitle('');
      // Agregar a tareas trabajadas de hoy por conveniencia
      setSelectedTaskIds(prev => new Set([...prev, newTask.id]));
      loadData();
    } catch (err) {
      setError(err.message || 'Error al crear tarea');
    } finally {
      setIsAddingQuick(false);
    }
  };

  const handleCloseSession = async () => {
    if (!data?.session) return;
    try {
      // Guardar tareas y notas primero
      const tasksPayload = Array.from(selectedTaskIds).map(id => ({
        task_id: id,
        note: taskNotes[id] || null
      }));
      await api.updateSessionTasks(data.session.id, tasksPayload);

      // Cerrar sesión como realizada
      await api.updateSession(data.session.id, {
        status: 'realizada',
        actual_start: actualStart,
        actual_end: actualEnd,
        notes: sessionNotes
      });

      setShowCloseModal(false);
      setMessage('Sesión de trabajo cerrada como realizada.');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message || 'Error al cerrar sesión');
    }
  };

  const handleNoSession = async () => {
    if (!data?.session) return;
    if (!noSessionReason.trim()) {
      alert('Debes indicar un motivo para cancelar o suspender la sesión.');
      return;
    }

    try {
      await api.updateSession(data.session.id, {
        status: noSessionStatus,
        reason: noSessionReason.trim(),
        notes: sessionNotes
      });

      setShowNoSessionModal(false);
      setNoSessionReason('');
      setMessage('Estado de la sesión actualizado.');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message || 'Error al actualizar sesión');
    }
  };

  const handlePhotoUpload = async e => {
    const files = e.target.files;
    if (!files || files.length === 0 || !data?.session) return;

    setUploadingPhoto(true);
    try {
      for (const file of files) {
        // Comprimir en el navegador antes de subir (máx 1600px, JPEG 0.8)
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('session_id', data.session.id);
        if (photoTaskId) formData.append('task_id', photoTaskId);
        if (photoCaption) formData.append('caption', photoCaption);

        await api.uploadEvidence(formData);
      }
      setPhotoCaption('');
      setPhotoTaskId('');
      setMessage('Foto(s) subida(s) y comprimida(s) con éxito.');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message || 'Error al subir foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        Cargando sesión actual...
      </div>
    );
  }

  const session = data?.session;

  return (
    <div className="page-wrapper">
      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Aviso de sesiones pendientes del pasado */}
      {data?.unclosedPastCount > 0 && (
        <div className="alert alert-warning" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <AlertTriangle size={18} />
            <span>Tienes {data.unclosedPastCount} sesión(es) pasadas sin cerrar</span>
          </div>
          <div style={{ fontSize: '13px', color: '#78350f' }}>
            {data.unclosedPastSessions.map(s => (
              <span key={s.id} style={{ display: 'inline-block', marginRight: '0.75rem' }}>
                • {s.date} ({s.sched_start}-{s.sched_end})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tarjeta de Sesión Actual / Próxima */}
      {session ? (
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="card-header">
            <div>
              <span className={`badge badge-${session.status}`} style={{ textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                {session.status.replace('_', ' ')}
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {session.date}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 600 }}>
                <Clock size={16} />
                <span>{session.sched_start} – {session.sched_end}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Horario Asignado</div>
            </div>
          </div>

          {session.status === 'pendiente' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <button 
                className="btn btn-success" 
                onClick={() => setShowCloseModal(true)}
                style={{ flex: 1 }}
              >
                <CheckCircle size={18} />
                <span>Cerrar sesión de trabajo</span>
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowNoSessionModal(true)}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <XCircle size={18} />
                <span>No hubo sesión</span>
              </button>
            </div>
          )}

          {session.status === 'realizada' && (
            <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginTop: '0.5rem' }}>
              ✓ Sesión cerrada como realizada (Horas: {session.actual_start || session.sched_start} a {session.actual_end || session.sched_end}).
            </div>
          )}

          {session.reason && (
            <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '6px', color: '#991b1b', fontSize: '13px', marginTop: '0.5rem' }}>
              <strong>Motivo:</strong> {session.reason}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          No hay sesiones programadas en este momento.
        </div>
      )}

      {/* Agregar Tarea Rápida */}
      <div className="card">
        <form onSubmit={handleQuickAddTask} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Nueva tarea rápida..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="form-control"
            value={quickCategory}
            onChange={e => setQuickCategory(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="soporte">Soporte</option>
            <option value="mantenimiento">Mantenim.</option>
            <option value="instalacion">Instalación</option>
            <option value="compra">Compra</option>
            <option value="mejora">Mejora</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={isAddingQuick}>
            <Plus size={18} />
            <span style={{ display: 'none' }}>Agregar</span>
          </button>
        </form>
      </div>

      {/* Checklist "Trabajé en..." */}
      {session && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CheckCircle size={18} color="#2563eb" />
              <span>Trabajé en hoy...</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSessionWork}>
              <Save size={14} />
              <span>Guardar cambios</span>
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.75rem' }}>
            Marca las tareas en las que avanzaste durante esta sesión. Pasar tareas de 'Por hacer' las pondrá automáticamente 'En curso'.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {openTasks.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>No hay tareas abiertas pendientes.</div>
            ) : (
              openTasks.map(task => {
                const isChecked = selectedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    style={{
                      border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      background: isChecked ? '#eff6ff' : '#ffffff',
                      borderRadius: '8px',
                      padding: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTask(task.id)}
                        style={{ width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className={`cat-badge cat-${task.category}`}>{task.category}</span>
                          <span 
                            style={{ fontWeight: 600, fontSize: '14px', cursor: 'pointer', color: '#1e293b' }}
                            onClick={() => onOpenTask && onOpenTask(task.id, task.category)}
                          >
                            {task.title}
                          </span>
                        </div>
                        {task.location && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            📍 {task.location}
                          </div>
                        )}
                        {isChecked && (
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Nota corta sobre lo trabajado (opcional)..."
                            value={taskNotes[task.id] || ''}
                            onChange={e => setTaskNotes({ ...taskNotes, [task.id]: e.target.value })}
                            style={{ marginTop: '0.5rem', fontSize: '13px', padding: '0.35rem 0.5rem' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Notas generales de la sesión */}
          <div style={{ marginTop: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Notas generales de la sesión</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Detalla qué hiciste en general, novedades o situaciones ocurridas..."
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
            />
          </div>

          {/* Subir Evidencia Fotográfica */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Camera size={18} color="#2563eb" />
                <span>Fotos de evidencia ({data?.evidence?.length || 0})</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.75rem' }}>
              Se comprimen automáticamente en el teléfono antes de subir (máx 1600px).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Descripción de la foto (opcional)"
                value={photoCaption}
                onChange={e => setPhotoCaption(e.target.value)}
                style={{ fontSize: '13px' }}
              />
              <select
                className="form-control"
                value={photoTaskId}
                onChange={e => setPhotoTaskId(e.target.value)}
                style={{ fontSize: '13px' }}
              >
                <option value="">Vincular a tarea (opcional)</option>
                {openTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <label className="btn btn-outline btn-block" style={{ cursor: 'pointer', borderStyle: 'dashed' }}>
              <UploadCloud size={18} />
              <span>{uploadingPhoto ? 'Comprimiendo y subiendo...' : 'Tomar o subir foto(s)'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                style={{ display: 'none' }}
              />
            </label>

            {data?.evidence && data.evidence.length > 0 && (
              <div className="photo-grid" style={{ marginTop: '0.75rem' }}>
                {data.evidence.map(photo => (
                  <img
                    key={photo.id}
                    src={`/uploads/${photo.filename}`}
                    alt={photo.caption || 'Evidencia'}
                    className="photo-thumb"
                    onClick={() => onSelectPhoto && onSelectPhoto(photo)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Cerrar Sesión de Trabajo */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 600 }}>Cerrar Sesión de Trabajo</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCloseModal(false)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '1rem' }}>
                La sesión se marcará como <strong>Realizada</strong>. Verifica las horas reales cumplidas:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Hora inicio real</label>
                  <input
                    type="time"
                    className="form-control"
                    value={actualStart}
                    onChange={e => setActualStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Hora fin real</label>
                  <input
                    type="time"
                    className="form-control"
                    value={actualEnd}
                    onChange={e => setActualEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Tareas marcadas para esta sesión: <strong>{selectedTaskIds.size}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCloseModal(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={handleCloseSession}>Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: No Hubo Sesión */}
      {showNoSessionModal && (
        <div className="modal-overlay" onClick={() => setShowNoSessionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 600 }}>Registrar que no hubo sesión</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowNoSessionModal(false)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo de ausencia *</label>
                <select
                  className="form-control"
                  value={noSessionStatus}
                  onChange={e => setNoSessionStatus(e.target.value)}
                >
                  <option value="no_realizada">No realizada (cuenta como hora asignada pero no cumplida)</option>
                  <option value="suspendida">Suspendida (feriado o evento del colegio, no cuenta como asignada)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo obligatorio *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Explica por qué no se llevó a cabo la sesión..."
                  value={noSessionReason}
                  onChange={e => setNoSessionReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowNoSessionModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleNoSession}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
