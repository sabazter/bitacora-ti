import React, { useState, useEffect } from 'react';
import { X, Trash2, Clock, Calendar, CheckSquare, Image as ImageIcon } from 'lucide-react';
import { api } from '../api';

export function TaskModal({ taskId, onClose, onTaskUpdated, onTaskDeleted, onSelectPhoto }) {
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Campos editables
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('soporte');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('media');
  const [location, setLocation] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [waitingReason, setWaitingReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [newNote, setNewNote] = useState('');

  // Campos de compra
  const [estCost, setEstCost] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [supplier, setSupplier] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('por_cotizar');

  useEffect(() => {
    if (!taskId) return;
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getTask(taskId);
      setTask(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategory(data.category || 'soporte');
      setStatus(data.status || 'todo');
      setPriority(data.priority || 'media');
      setLocation(data.location || '');
      setRequestedBy(data.requested_by || '');
      setWaitingReason(data.waiting_reason || '');
      setDueDate(data.due_date || '');
      setEstCost(data.est_cost !== null && data.est_cost !== undefined ? String(data.est_cost) : '');
      setCurrency(data.currency || 'USD');
      setSupplier(data.supplier || '');
      setPurchaseStatus(data.purchase_status || 'por_cotizar');
    } catch (err) {
      setError(err.message || 'Error al cargar tarea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (status === 'waiting' && !waitingReason.trim()) {
      setError('El motivo es obligatorio al estar en espera.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const updates = {
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        priority,
        location: location.trim(),
        requested_by: requestedBy.trim(),
        waiting_reason: status === 'waiting' ? waitingReason.trim() : null,
        due_date: dueDate || null,
        note: newNote.trim() || undefined
      };

      if (category === 'compra') {
        updates.est_cost = estCost ? parseFloat(estCost) : null;
        updates.currency = currency;
        updates.supplier = supplier.trim();
        updates.purchase_status = purchaseStatus;
      }

      await api.updateTask(taskId, updates);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar tarea');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    try {
      await api.deleteTask(taskId);
      if (onTaskDeleted) onTaskDeleted(taskId);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar tarea');
    }
  };

  if (!taskId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {isLoading ? 'Cargando...' : `Tarea #${taskId}`}
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando detalles...</div>
        ) : (
          <form onSubmit={handleSave} className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label className="form-label">Título *</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="todo">Por hacer</option>
                  <option value="doing">En curso</option>
                  <option value="waiting">Esperando</option>
                  <option value="done">Hecho</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            {status === 'waiting' && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#b45309' }}>Motivo de espera *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="¿Por qué está esperando? (ej. Falta compra, autorización...)"
                  value={waitingReason}
                  onChange={e => setWaitingReason(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="soporte">Soporte</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="instalacion">Instalación</option>
                  <option value="compra">Compra</option>
                  <option value="mejora">Mejora</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Lab 1, Aula 3, Rectoría"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Solicitado por</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Prof. Carlos, Dirección"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha límite</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {category === 'compra' && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#6d28d9', marginBottom: '0.5rem' }}>
                  Datos de Compra
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label className="form-label">Costo estimado</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={estCost}
                      onChange={e => setEstCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Moneda</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label">Proveedor</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Proveedor sugerido"
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Estado de Compra</label>
                    <select
                      className="form-control"
                      value={purchaseStatus}
                      onChange={e => setPurchaseStatus(e.target.value)}
                    >
                      <option value="por_cotizar">Por cotizar</option>
                      <option value="cotizado">Cotizado</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="comprado">Comprado</option>
                      <option value="recibido">Recibido</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Detalles sobre la tarea..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agregar nota al historial</label>
              <input
                type="text"
                className="form-control"
                placeholder="Escribe una nota para registrar en el historial..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
            </div>

            {/* Fotos asociadas */}
            {task?.evidence && task.evidence.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ImageIcon size={16} />
                  <span>Fotos de evidencia ({task.evidence.length})</span>
                </div>
                <div className="photo-grid">
                  {task.evidence.map(photo => (
                    <img
                      key={photo.id}
                      src={`/uploads/${photo.filename}`}
                      alt={photo.caption || 'Evidencia'}
                      className="photo-thumb"
                      onClick={() => onSelectPhoto && onSelectPhoto(photo)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sesiones donde se trabajó */}
            {task?.sessions && task.sessions.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  <Calendar size={16} />
                  <span>Sesiones trabajadas ({task.sessions.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '12px' }}>
                  {task.sessions.map(s => (
                    <div key={s.id} style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <strong>{s.date}</strong> ({s.sched_start} - {s.sched_end}) — {s.status}
                      {s.task_note && <div style={{ color: '#64748b' }}>"{s.task_note}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de eventos */}
            {task?.events && task.events.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  <Clock size={16} />
                  <span>Historial de cambios</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {task.events.map(ev => (
                    <div key={ev.id} style={{ color: '#475569', borderBottom: '1px dotted #e2e8f0', paddingBottom: '3px' }}>
                      <span style={{ color: '#94a3b8' }}>[{new Date(ev.created_at).toLocaleDateString()}]</span>{' '}
                      <strong>{ev.type}:</strong> {ev.note || `${ev.from_value || ''} ➔ ${ev.to_value || ''}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '1rem', padding: '0.75rem 0 0 0' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                style={{ marginRight: 'auto' }}
              >
                <Trash2 size={16} />
                <span>Eliminar</span>
              </button>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
