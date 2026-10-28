import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MapPin, 
  User, 
  Calendar,
  X
} from 'lucide-react';
import { api } from '../api';

export function TableroView({ onOpenTask }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showAllDone, setShowAllDone] = useState(false);

  // Modal para motivo de espera al mover
  const [waitingModal, setWaitingModal] = useState({ open: false, taskId: null, targetStatus: 'waiting', reason: '' });

  // Modal para crear nueva tarea
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('soporte');
  const [newPriority, setNewPriority] = useState('media');
  const [newLocation, setNewLocation] = useState('');
  const [newRequestedBy, setNewRequestedBy] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadTasks();
  }, [filterCategory, filterPriority, search]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTasks({
        category: filterCategory || undefined,
        q: search || undefined
      });
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Error al cargar tareas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async e => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.createTask({
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        location: newLocation.trim() || null,
        requested_by: newRequestedBy.trim() || null,
        description: newDescription.trim() || null,
        status: 'todo'
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewLocation('');
      setNewRequestedBy('');
      setNewDescription('');
      loadTasks();
    } catch (err) {
      alert(err.message || 'Error al crear tarea');
    }
  };

  const handleMoveStatus = async (taskId, newStatus) => {
    if (newStatus === 'waiting') {
      setWaitingModal({ open: true, taskId, targetStatus: newStatus, reason: '' });
      return;
    }

    try {
      await api.moveTask(taskId, { status: newStatus });
      loadTasks();
    } catch (err) {
      alert(err.message || 'Error al mover tarea');
    }
  };

  const confirmWaitingReason = async () => {
    if (!waitingModal.reason.trim()) {
      alert('Debes indicar un motivo de espera.');
      return;
    }

    try {
      await api.moveTask(waitingModal.taskId, {
        status: 'waiting',
        waiting_reason: waitingModal.reason.trim()
      });
      setWaitingModal({ open: false, taskId: null, targetStatus: 'waiting', reason: '' });
      loadTasks();
    } catch (err) {
      alert(err.message || 'Error al mover tarea');
    }
  };

  // Drag and Drop (Desktop)
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = e => {
    e.preventDefault();
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    handleMoveStatus(taskId, status);
  };

  // Filtrar por prioridad
  const filteredTasks = tasks.filter(t => {
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  // Agrupar por columnas
  const columns = [
    { id: 'todo', label: 'Por hacer', badgeClass: 'badge-todo' },
    { id: 'doing', label: 'En curso', badgeClass: 'badge-doing' },
    { id: 'waiting', label: 'Esperando', badgeClass: 'badge-waiting' },
    { id: 'done', label: 'Hecho', badgeClass: 'badge-done' }
  ];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const getTasksForColumn = status => {
    return filteredTasks.filter(t => {
      if (t.status !== status) return false;
      if (status === 'done' && !showAllDone) {
        if (!t.done_at && !t.updated_at) return true;
        const taskDate = new Date(t.done_at || t.updated_at);
        return taskDate >= thirtyDaysAgo;
      }
      return true;
    });
  };

  return (
    <div className="page-wrapper">
      {/* Barra superior de herramientas y filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar tareas, ubicación, solicitante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Nueva Tarea</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">Todas las categorías</option>
            <option value="compra">Compra</option>
            <option value="instalacion">Instalación</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="soporte">Soporte</option>
            <option value="mejora">Mejora</option>
          </select>

          <select
            className="form-control"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="">Cualquier prioridad</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="kanban-board">
        {columns.map(col => {
          const colTasks = getTasksForColumn(col.id);

          return (
            <div
              key={col.id}
              className="kanban-col"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="kanban-col-header">
                <span>{col.label}</span>
                <span className={`badge ${col.badgeClass}`}>{colTasks.length}</span>
              </div>

              {col.id === 'done' && (
                <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '11px', padding: '0.2rem 0.5rem', width: '100%' }}
                    onClick={() => setShowAllDone(!showAllDone)}
                  >
                    {showAllDone ? 'Mostrando todas' : 'Últimos 30 días (ver todas)'}
                  </button>
                </div>
              )}

              <div style={{ minHeight: '80px' }}>
                {colTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '12px' }}>
                    Sin tareas
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isCompra = task.category === 'compra';
                    const pStatusMap = {
                      por_cotizar: { label: 'Por Cotizar', color: '#64748b', bg: '#f1f5f9' },
                      cotizado: { label: 'Cotizado', color: '#d97706', bg: '#fef3c7' },
                      aprobado: { label: 'Aprobado', color: '#2563eb', bg: '#dbeafe' },
                      comprado: { label: 'Comprado', color: '#7c3aed', bg: '#ede9fe' },
                      recibido: { label: 'Recibido', color: '#059669', bg: '#d1fae5' }
                    };
                    const pInfo = isCompra ? pStatusMap[task.purchase_status || 'por_cotizar'] : null;

                    return (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onClick={() => onOpenTask && onOpenTask(task.id, task.category)}
                        style={isCompra ? {
                          borderLeft: '4px solid #7c3aed',
                          background: '#fcfaff'
                        } : {}}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {isCompra ? (
                              <span style={{
                                backgroundColor: '#7c3aed',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                letterSpacing: '0.3px'
                              }}>
                                🛒 COMPRA
                              </span>
                            ) : (
                              <span className={`cat-badge cat-${task.category}`}>{task.category}</span>
                            )}

                            {pInfo && (
                              <span style={{
                                backgroundColor: pInfo.bg,
                                color: pInfo.color,
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px'
                              }}>
                                {pInfo.label}
                              </span>
                            )}
                          </div>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: task.priority === 'alta' ? '#ef4444' : task.priority === 'baja' ? '#64748b' : '#3b82f6'
                          }}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', marginBottom: '0.35rem' }}>
                          {task.title}
                        </div>

                        {/* Detalles de compra (Monto y proveedor) */}
                        {isCompra && (task.est_cost || task.supplier) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f3e8ff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            color: '#6b21a8',
                            marginBottom: '0.4rem',
                            fontWeight: 600
                          }}>
                            <span>{task.supplier ? `🏢 ${task.supplier}` : 'Sin proveedor'}</span>
                            <span>{task.est_cost ? `$${task.est_cost.toFixed(2)} ${task.currency || 'USD'}` : 'Por cotizar'}</span>
                          </div>
                        )}

                        {task.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '12px', color: '#64748b' }}>
                            <MapPin size={12} />
                            <span>{task.location}</span>
                          </div>
                        )}

                        {task.status === 'waiting' && task.waiting_reason && (
                          <div style={{
                            marginTop: '0.4rem',
                            padding: '0.25rem 0.45rem',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#b45309'
                          }}>
                            <strong>Motivo:</strong> {task.waiting_reason}
                          </div>
                        )}

                        {/* Selector de estado para móviles */}
                        <div
                          style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <select
                            className="form-control"
                            value={task.status}
                            onChange={e => handleMoveStatus(task.id, e.target.value)}
                            style={{ fontSize: '11px', padding: '0.2rem 0.4rem', height: '26px' }}
                          >
                            <option value="todo">Mover: Por hacer</option>
                            <option value="doing">Mover: En curso</option>
                            <option value="waiting">Mover: Esperando</option>
                            <option value="done">Mover: Hecho</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Motivo para mover a Esperando */}
      {waitingModal.open && (
        <div className="modal-overlay" onClick={() => setWaitingModal({ open: false, taskId: null, targetStatus: 'waiting', reason: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 600 }}>Motivo de espera obligatorio</div>
              <button className="btn btn-outline btn-sm" onClick={() => setWaitingModal({ open: false, taskId: null, targetStatus: 'waiting', reason: '' })} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '0.75rem' }}>
                Indica qué o a quién estamos esperando para continuar con esta tarea:
              </p>
              <textarea
                className="form-control"
                rows={3}
                placeholder="ej. Falta compra de repuesto, esperando aprobación del director..."
                value={waitingModal.reason}
                onChange={e => setWaitingModal({ ...waitingModal, reason: e.target.value })}
                autoFocus
                required
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWaitingModal({ open: false, taskId: null, targetStatus: 'waiting', reason: '' })}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmWaitingReason}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Tarea */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 600 }}>Nueva Tarea</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateModal(false)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-body">
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="¿Qué hay que hacer?"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  >
                    <option value="soporte">Soporte</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="instalacion">Instalación</option>
                    <option value="compra">Compra</option>
                    <option value="mejora">Mejora</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Prioridad</label>
                  <select
                    className="form-control"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. Lab 1, Biblioteca"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Solicitado por</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. Prof. Carlos"
                    value={newRequestedBy}
                    onChange={e => setNewRequestedBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción opcional</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Detalles adicionales..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.5rem 0 0 0' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
