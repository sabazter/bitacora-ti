import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingCart, 
  DollarSign, 
  Store, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

export function PurchaseModal({ taskId, onClose, onSaved, onDeleted }) {
  const isEditing = Boolean(taskId);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Campos del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('por_cotizar');
  const [estCost, setEstCost] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [supplier, setSupplier] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('media');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [taskData, setTaskData] = useState(null);

  const statuses = [
    { id: 'por_cotizar', label: '1. Por Cotizar', desc: 'Identificando tiendas y precios', color: '#64748b', bg: '#f1f5f9' },
    { id: 'cotizado', label: '2. Cotizado', desc: 'Esperando visto bueno directivo', color: '#d97706', bg: '#fef3c7' },
    { id: 'aprobado', label: '3. Aprobado', desc: 'Presupuesto autorizado para comprar', color: '#2563eb', bg: '#dbeafe' },
    { id: 'comprado', label: '4. Comprado', desc: 'Pagado, en camino o por retirar', color: '#7c3aed', bg: '#ede9fe' },
    { id: 'recibido', label: '5. Recibido', desc: 'En el colegio, listo para entrega/uso', color: '#059669', bg: '#d1fae5' }
  ];

  useEffect(() => {
    if (isEditing) {
      loadTask();
    } else {
      setIsLoading(false);
    }
  }, [taskId]);

  const loadTask = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getTask(taskId);
      setTaskData(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPurchaseStatus(data.purchase_status || 'por_cotizar');
      setEstCost(data.est_cost !== null && data.est_cost !== undefined ? String(data.est_cost) : '');
      setCurrency(data.currency || 'USD');
      setSupplier(data.supplier || '');
      setRequestedBy(data.requested_by || '');
      setLocation(data.location || '');
      setPriority(data.priority || 'media');
      setDueDate(data.due_date || '');
    } catch (err) {
      setError(err.message || 'Error al cargar información de la compra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El artículo o material es obligatorio.');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category: 'compra',
      priority,
      location: location.trim() || null,
      requested_by: requestedBy.trim() || null,
      due_date: dueDate || null,
      est_cost: estCost !== '' ? parseFloat(estCost) : null,
      currency,
      supplier: supplier.trim() || null,
      purchase_status: purchaseStatus
    };

    try {
      if (isEditing) {
        if (note.trim()) {
          payload.note = `[Compras] ${note.trim()}`;
        }
        await api.updateTask(taskId, payload);
      } else {
        await api.createTask(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la petición de compra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdvance = async nextStatus => {
    setIsSaving(true);
    setError('');
    try {
      await api.updateTask(taskId, {
        purchase_status: nextStatus,
        note: `Estado de compra avanzado a: ${statuses.find(s => s.id === nextStatus)?.label || nextStatus}`
      });
      setPurchaseStatus(nextStatus);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar estado');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar esta petición de compra?')) return;
    try {
      await api.deleteTask(taskId);
      if (onDeleted) onDeleted(taskId);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const nextStepMap = {
    por_cotizar: { next: 'cotizado', label: 'Marcar como Cotizado' },
    cotizado: { next: 'aprobado', label: 'Aprobar Presupuesto' },
    aprobado: { next: 'comprado', label: 'Marcar como Comprado' },
    comprado: { next: 'recibido', label: 'Confirmar Recibido' }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Encabezado */}
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#f3e8ff',
              color: '#7e22ce',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                {isEditing ? `Gestión de Compra #${taskId}` : 'Nueva Petición de Compra'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {isEditing ? 'Actualiza presupuesto, proveedor y estado del ciclo de compra' : 'Registra un material o equipo requerido para el colegio'}
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            Cargando detalles de compra...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Ciclo de Compra (Selector de Estado) */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>
                Estado de la Compra
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.4rem'
              }}>
                {statuses.map(st => {
                  const isSelected = purchaseStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPurchaseStatus(st.id)}
                      style={{
                        padding: '0.5rem 0.3rem',
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${st.color}` : '1px solid #e2e8f0',
                        background: isSelected ? st.bg : '#ffffff',
                        color: isSelected ? st.color : '#64748b',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>{st.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Artículo o Material */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Artículo o Material a Comprar *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="ej. Bobina Cable UTP Cat6 y 20 Conectores RJ45, Tóner HP 85A..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Costo y Proveedor (Bloque Financiero Destacado) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem'
            }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DollarSign size={16} color="#059669" />
                <span>Presupuesto y Cotización</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Costo Estimado o Cotizado</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={estCost}
                    onChange={e => setEstCost(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Moneda</label>
                  <select
                    className="form-control"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BS">Bs (Bolívares)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Proveedor o Tienda Cotizada</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. MercadoLibre, CompuMall, Ferretería El Centro..."
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Justificación / Descripción */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Justificación y Descripción
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Indica para qué se utilizará, qué equipo o salón se reparará con esto..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Solicitante y Destino */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Solicitado por</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Prof. Carlos, Coordinación"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Destino / Salón</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Laboratorio 1, Primaria"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Prioridad y Fecha límite */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Prioridad</label>
                <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="baja">Baja</option>
                  <option value="media">Media (Normal)</option>
                  <option value="alta">Alta (Urgente)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Fecha Requerida</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Nota de seguimiento rápida si es edición */}
            {isEditing && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Nota de Seguimiento (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Dirección autorizó el pago el martes..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            )}

            {/* Acciones de pie */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
              <div>
                {isEditing ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleDelete}
                    style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    <Trash2 size={16} />
                    <span>Eliminar</span>
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline" onClick={onClose}>
                    Cancelar
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditing && nextStepMap[purchaseStatus] && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleQuickAdvance(nextStepMap[purchaseStatus].next)}
                    disabled={isSaving}
                    style={{ borderColor: '#6366f1', color: '#4f46e5', fontWeight: 600 }}
                  >
                    <span>{nextStepMap[purchaseStatus].label}</span>
                    <ChevronRight size={16} />
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ minWidth: '130px' }}
                >
                  {isSaving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Compra')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
