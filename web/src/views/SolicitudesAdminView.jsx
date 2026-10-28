import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  ArrowRightCircle, 
  Trash2, 
  Search, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Image as ImageIcon,
  Check,
  XCircle,
  ExternalLink 
} from 'lucide-react';
import { api } from '../api';

export function SolicitudesAdminView({ onSelectPhoto, onOpenTask }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendiente');
  const [searchTerm, setSearchTerm] = useState('');
  const [noteInputs, setNoteInputs] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRequests();
  }, [filterStatus, searchTerm]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRequests({
        status: filterStatus || undefined,
        q: searchTerm || undefined
      });
      setRequests(data);

      const notes = {};
      for (const r of data) {
        if (r.admin_note) notes[r.id] = r.admin_note;
      }
      setNoteInputs(notes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToTask = async requestId => {
    try {
      const res = await api.convertRequestToTask(requestId);
      setMessage(`¡Solicitud convertida en Tarea #${res.task.id}! Ya aparece en tu Tablero.`);
      setTimeout(() => setMessage(''), 4000);
      loadRequests();
    } catch (err) {
      alert(err.message || 'Error al convertir en tarea');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.updateRequest(requestId, {
        status: newStatus,
        admin_note: noteInputs[requestId] || undefined
      });
      setMessage('Estado de solicitud actualizado.');
      setTimeout(() => setMessage(''), 3000);
      loadRequests();
    } catch (err) {
      alert(err.message || 'Error al actualizar');
    }
  };

  const handleSaveNote = async requestId => {
    try {
      await api.updateRequest(requestId, {
        admin_note: noteInputs[requestId] || ''
      });
      setMessage('Nota guardada para los profesores.');
      setTimeout(() => setMessage(''), 3000);
      loadRequests();
    } catch (err) {
      alert(err.message || 'Error al guardar nota');
    }
  };

  const handleDelete = async requestId => {
    if (!window.confirm('¿Deseas eliminar esta solicitud?')) return;
    try {
      await api.deleteRequest(requestId);
      loadRequests();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pendiente').length;

  return (
    <div className="page-wrapper">
      {message && <div className="alert alert-info">{message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Bandeja de Solicitudes
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Peticiones enviadas por profesores y coordinadores sin cuenta.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="">Todas las solicitudes</option>
            <option value="pendiente">Solo Pendientes</option>
            <option value="en_proceso">En Proceso / Tarea</option>
            <option value="resuelta">Resueltas</option>
            <option value="descartada">Descartadas</option>
          </select>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por profesor, ubicación o requerimiento..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '2rem' }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando solicitudes...</div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No hay solicitudes en esta sección.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => {
            const isPending = req.status === 'pendiente';
            const isDone = req.status === 'resuelta';

            return (
              <div 
                key={req.id} 
                className="card"
                style={{
                  borderLeft: isPending ? '4px solid #f59e0b' : (isDone ? '4px solid #10b981' : '4px solid #2563eb')
                }}
              >
                <div className="card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`cat-badge cat-${req.type === 'material' ? 'compra' : (req.type === 'falla' ? 'soporte' : 'mejora')}`}>
                        {req.type}
                      </span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{req.requester_name}</strong>
                      {req.location && (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          📍 {req.location}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Recibida: {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>

                  <span className={`badge badge-${req.status}`} style={{ textTransform: 'capitalize' }}>
                    {req.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '14px', color: '#1e293b', marginBottom: '0.75rem', lineHeight: 1.5, background: '#fafafa', padding: '0.75rem', borderRadius: '6px' }}>
                  {req.description}
                </div>

                {req.photo_url && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <img
                      src={req.photo_url}
                      alt="Foto adjunta"
                      className="photo-thumb"
                      style={{ maxHeight: '120px', width: 'auto', borderRadius: '8px' }}
                      onClick={() => onSelectPhoto && onSelectPhoto({ filename: req.photo_url.replace('/uploads/', ''), caption: `Solicitud de ${req.requester_name}` })}
                    />
                  </div>
                )}

                {/* Nota para los profesores */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: '#64748b' }}>
                    Nota o Respuesta para el profesor (visible en la página pública):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ej. Agendada para el miércoles; cables asegurados..."
                      value={noteInputs[req.id] || ''}
                      onChange={e => setNoteInputs({ ...noteInputs, [req.id]: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleSaveNote(req.id)}
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Botones de acción rápida */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  {req.status !== 'en_proceso' && !req.task_id && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleConvertToTask(req.id)}
                      title="Crea una tarea en tu Tablero Kanban"
                    >
                      <ArrowRightCircle size={15} />
                      <span>Convertir en Tarea</span>
                    </button>
                  )}

                  {req.task_id && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onOpenTask && onOpenTask(req.task_id)}
                      style={{ color: '#2563eb' }}
                    >
                      <ExternalLink size={14} />
                      <span>Ver Tarea #{req.task_id}</span>
                    </button>
                  )}

                  {req.status !== 'resuelta' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateStatus(req.id, 'resuelta')}
                    >
                      <CheckCircle2 size={15} />
                      <span>Marcar Resuelta</span>
                    </button>
                  )}

                  {req.status !== 'descartada' && req.status !== 'resuelta' && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleUpdateStatus(req.id, 'descartada')}
                      style={{ color: '#94a3b8' }}
                    >
                      <XCircle size={15} />
                      <span>Descartar</span>
                    </button>
                  )}

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDelete(req.id)}
                    style={{ marginLeft: 'auto', color: '#ef4444', borderColor: '#fca5a5' }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
