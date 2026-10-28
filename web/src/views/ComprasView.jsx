import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Search,
  Store,
  MapPin,
  User,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { PurchaseModal } from '../components/PurchaseModal';

export function ComprasView() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales de Compra
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activePurchaseId, setActivePurchaseId] = useState(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTasks({ category: 'compra' });
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Error al cargar compras');
    } finally {
      setIsLoading(false);
    }
  };

  const statuses = [
    { id: 'por_cotizar', label: '1. Por Cotizar', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
    { id: 'cotizado', label: '2. Cotizado (Esperando Aprobación)', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    { id: 'aprobado', label: '3. Aprobado (Listo para Comprar)', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
    { id: 'comprado', label: '4. Comprado (En Camino)', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
    { id: 'recibido', label: '5. Recibido', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' }
  ];

  // Cálculos de totales y métricas financieras
  let totalPendingApproval = 0; // por_cotizar + cotizado
  let totalApproved = 0;        // aprobado
  let totalBoughtMonth = 0;     // comprado/recibido en el mes actual

  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  for (const t of tasks) {
    const cost = t.est_cost || 0;
    const pStatus = t.purchase_status || 'por_cotizar';

    if (pStatus === 'por_cotizar' || pStatus === 'cotizado') {
      totalPendingApproval += cost;
    } else if (pStatus === 'aprobado') {
      totalApproved += cost;
    } else if (pStatus === 'comprado' || pStatus === 'recibido') {
      if (t.updated_at && t.updated_at.startsWith(currentMonthStr)) {
        totalBoughtMonth += cost;
      }
    }
  }

  // Filtrar compras por búsqueda
  const filteredTasks = tasks.filter(t => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.supplier && t.supplier.toLowerCase().includes(q)) ||
      (t.requested_by && t.requested_by.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const handleQuickAdvance = async (e, task) => {
    e.stopPropagation();
    const flow = ['por_cotizar', 'cotizado', 'aprobado', 'comprado', 'recibido'];
    const curIndex = flow.indexOf(task.purchase_status || 'por_cotizar');
    if (curIndex < flow.length - 1) {
      const nextStatus = flow[curIndex + 1];
      try {
        await api.updateTask(task.id, {
          purchase_status: nextStatus,
          note: `Estado avanzado a: ${nextStatus}`
        });
        loadPurchases();
      } catch (err) {
        alert(err.message || 'Error al actualizar');
      }
    }
  };

  const nextStepActionName = {
    por_cotizar: 'Cotizar',
    cotizado: 'Aprobar',
    aprobado: 'Comprado',
    comprado: 'Recibido'
  };

  return (
    <div className="page-wrapper">
      {/* Cabecera Principal con Botón de Creación */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={24} color="#7c3aed" />
            <span>Gestión de Compras y Suministros</span>
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Presupuestos, cotizaciones, adquisiciones y control de entregas de materiales
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1.1rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
          }}
        >
          <Plus size={18} />
          <span>Nueva Petición de Compra</span>
        </button>
      </div>

      {/* Tarjetas KPI de Resumen Financiero */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', margin: 0, padding: '1rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Por Aprobar
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            ${totalPendingApproval.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.2rem' }}>
            En fase de cotización o esperando visto bueno
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #2563eb', margin: 0, padding: '1rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Aprobado para Comprar
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.25rem' }}>
            ${totalApproved.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.2rem' }}>
            Presupuesto autorizado, listo para desembolso
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981', margin: 0, padding: '1rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Comprado este Mes
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
            ${totalBoughtMonth.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.2rem' }}>
            Material adquirido o recibido en el período
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #7c3aed', margin: 0, padding: '1rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Compras
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.25rem' }}>
            {tasks.length} <span style={{ fontSize: '13px', fontWeight: 500 }}>artículos</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.2rem' }}>
            Historial de requerimientos y materiales
          </div>
        </div>
      </div>

      {/* Buscador de Compras */}
      <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Buscar artículo, proveedor, docente solicitante o ubicación..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Cargando compras y cotizaciones...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {statuses.map(st => {
            const groupTasks = filteredTasks.filter(t => (t.purchase_status || 'por_cotizar') === st.id);
            const groupTotal = groupTasks.reduce((acc, t) => acc + (t.est_cost || 0), 0);

            return (
              <div key={st.id} className="card" style={{ margin: 0, border: `1px solid ${st.border}` }}>
                <div className="card-header" style={{
                  borderBottom: '1px solid #e2e8f0',
                  background: '#fafafa',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      backgroundColor: st.bg,
                      color: st.color,
                      border: `1px solid ${st.border}`,
                      padding: '0.3rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      ({groupTasks.length} {groupTasks.length === 1 ? 'artículo' : 'artículos'})
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                    Subtotal: ${groupTotal.toFixed(2)} USD
                  </div>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                    Sin compras en este estado
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem' }}>
                    {groupTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setActivePurchaseId(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: 'pointer',
                          gap: '0.75rem',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>
                              {t.title}
                            </span>
                            {t.priority === 'alta' && (
                              <span style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px'
                              }}>
                                URGENTE
                              </span>
                            )}
                          </div>

                          {t.description && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '0.2rem', lineHeight: 1.3 }}>
                              {t.description.length > 90 ? `${t.description.slice(0, 90)}...` : t.description}
                            </div>
                          )}

                          <div style={{
                            fontSize: '12px',
                            color: '#64748b',
                            display: 'flex',
                            gap: '0.85rem',
                            marginTop: '0.4rem',
                            flexWrap: 'wrap'
                          }}>
                            {t.supplier && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Store size={13} color="#475569" />
                                <strong>{t.supplier}</strong>
                              </span>
                            )}
                            {t.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={13} color="#64748b" />
                                <span>{t.location}</span>
                              </span>
                            )}
                            {t.requested_by && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <User size={13} color="#64748b" />
                                <span>{t.requested_by}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                              {t.est_cost ? `$${t.est_cost.toFixed(2)}` : 'Sin cotizar'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {t.currency || 'USD'}
                            </div>
                          </div>

                          {st.id !== 'recibido' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={e => handleQuickAdvance(e, t)}
                              title={`Avanzar estado a ${nextStepActionName[st.id] || 'siguiente'}`}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                borderColor: st.border,
                                color: st.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <span>{nextStepActionName[st.id] || 'Avanzar'}</span>
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación de Compra */}
      {isCreateOpen && (
        <PurchaseModal
          taskId={null}
          onClose={() => setIsCreateOpen(false)}
          onSaved={loadPurchases}
        />
      )}

      {/* Modal de Edición de Compra */}
      {activePurchaseId && (
        <PurchaseModal
          taskId={activePurchaseId}
          onClose={() => setActivePurchaseId(null)}
          onSaved={loadPurchases}
          onDeleted={loadPurchases}
        />
      )}
    </div>
  );
}
