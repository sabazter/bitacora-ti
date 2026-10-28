import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Clock, CheckCircle2, ChevronRight, Plus } from 'lucide-react';
import { api } from '../api';

export function ComprasView({ onOpenTask }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    { id: 'por_cotizar', label: 'Por Cotizar', color: '#64748b', bg: '#f1f5f9' },
    { id: 'cotizado', label: 'Cotizado (Esperando Aprobación)', color: '#d97706', bg: '#fef3c7' },
    { id: 'aprobado', label: 'Aprobado (Sin Comprar)', color: '#2563eb', bg: '#dbeafe' },
    { id: 'comprado', label: 'Comprado (En Camino)', color: '#7c3aed', bg: '#ede9fe' },
    { id: 'recibido', label: 'Recibido', color: '#059669', bg: '#d1fae5' }
  ];

  // Cálculos de totales
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

  const handleQuickAdvance = async (e, task) => {
    e.stopPropagation();
    const flow = ['por_cotizar', 'cotizado', 'aprobado', 'comprado', 'recibido'];
    const curIndex = flow.indexOf(task.purchase_status || 'por_cotizar');
    if (curIndex < flow.length - 1) {
      const nextStatus = flow[curIndex + 1];
      try {
        await api.updateTask(task.id, {
          purchase_status: nextStatus,
          status: nextStatus === 'recibido' ? 'done' : (nextStatus === 'aprobado' ? 'doing' : task.status)
        });
        loadPurchases();
      } catch (err) {
        alert(err.message || 'Error al actualizar');
      }
    }
  };

  return (
    <div className="page-wrapper">
      {/* Resumen de totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Pendiente de Aprobar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>
            ${totalPendingApproval.toFixed(2)} USD
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Por cotizar o cotizados</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #2563eb', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Aprobado sin Comprar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8', marginTop: '0.25rem' }}>
            ${totalApproved.toFixed(2)} USD
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Listo para ejecutar compra</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981', margin: 0 }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Comprado este Mes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857', marginTop: '0.25rem' }}>
            ${totalBoughtMonth.toFixed(2)} USD
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Adquisiciones recibidas/en camino</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando compras...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {statuses.map(st => {
            const groupTasks = tasks.filter(t => (t.purchase_status || 'por_cotizar') === st.id);
            const groupTotal = groupTasks.reduce((acc, t) => acc + (t.est_cost || 0), 0);

            return (
              <div key={st.id} className="card" style={{ margin: 0 }}>
                <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      backgroundColor: st.bg,
                      color: st.color,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>({groupTasks.length})</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
                    Subtotal: ${groupTotal.toFixed(2)} USD
                  </div>
                </div>

                {groupTasks.length === 0 ? (
                  <div style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                    Sin compras en este estado
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => onOpenTask && onOpenTask(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          background: '#fafafa',
                          cursor: 'pointer',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '0.75rem', marginTop: '2px', flexWrap: 'wrap' }}>
                            {t.supplier && <span>🏢 {t.supplier}</span>}
                            {t.location && <span>📍 {t.location}</span>}
                            {t.requested_by && <span>👤 {t.requested_by}</span>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            {t.est_cost ? `$${t.est_cost.toFixed(2)} ${t.currency || 'USD'}` : 'Sin costo'}
                          </div>

                          {st.id !== 'recibido' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={e => handleQuickAdvance(e, t)}
                              title="Avanzar al siguiente estado"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
                            >
                              <span>Avanzar</span>
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
    </div>
  );
}
