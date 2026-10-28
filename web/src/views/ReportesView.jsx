import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  ShoppingCart,
  Image as ImageIcon 
} from 'lucide-react';
import { api } from '../api';

export function ReportesView({ onSelectPhoto }) {
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [period, currentDate]);

  const loadReport = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getReport(period, currentDate);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Error al generar reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const navigatePeriod = direction => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);

    if (period === 'week') {
      date.setDate(date.getDate() + (direction * 7));
    } else {
      date.setMonth(date.getMonth() + direction);
    }

    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setCurrentDate(`${ny}-${nm}-${nd}`);
  };

  const handleCopySummary = async () => {
    try {
      const text = await api.getReportText(period, currentDate);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert('Error al copiar al portapapeles');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fmtHours = h => String(h || 0).replace('.', ',');

  return (
    <div className="page-wrapper">
      {/* Encabezado especial solo visible al imprimir */}
      <div className="print-header">
        <div className="print-title">Reporte de Servicio Técnico</div>
        <div className="print-subtitle">
          {report?.range?.label} — Santiago
        </div>
      </div>

      {/* Controles de navegación y acciones */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Selector Semana / Mes */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none' }}
              onClick={() => setPeriod('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none' }}
              onClick={() => setPeriod('month')}
            >
              Mes
            </button>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={handleCopySummary}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? '¡Copiado!' : 'Copiar resumen (WhatsApp)'}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* Flechas para periodo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#ffffff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigatePeriod(-1)}>
            <ChevronLeft size={16} />
          </button>
          <strong style={{ fontSize: '15px', color: '#1e293b' }}>
            {report?.range?.label || 'Cargando...'}
          </strong>
          <button className="btn btn-outline btn-sm" onClick={() => navigatePeriod(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Generando reporte...</div>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 1. Métrica de Horas */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="#2563eb" />
                <span>Horas y Rendimiento</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: report.hours.percentage >= 100 ? '#059669' : '#2563eb' }}>
                {report.hours.percentage}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Horas Asignadas</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                  {fmtHours(report.hours.assigned)} h
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Sesiones no suspendidas</div>
              </div>

              <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '12px', color: '#065f46' }}>Horas Cumplidas</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857' }}>
                  {fmtHours(report.hours.completed)} h
                </div>
                <div style={{ fontSize: '11px', color: '#059669' }}>Sesiones realizadas</div>
              </div>
            </div>

            {/* Suspendidas o No Realizadas */}
            {report.hours.suspended.length > 0 && (
              <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>Sesiones Suspendidas ({report.hours.suspended.length}):</strong>
                {report.hours.suspended.map(s => (
                  <div key={s.id} style={{ marginLeft: '0.5rem', marginTop: '2px' }}>
                    • {s.date}: {s.reason} <em>(No cuenta como hora asignada)</em>
                  </div>
                ))}
              </div>
            )}

            {report.hours.notDone.length > 0 && (
              <div style={{ marginTop: '0.5rem', background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '13px', color: '#991b1b' }}>
                <strong>Sesiones No Realizadas ({report.hours.notDone.length}):</strong>
                {report.hours.notDone.map(s => (
                  <div key={s.id} style={{ marginLeft: '0.5rem', marginTop: '2px' }}>
                    • {s.date}: {s.reason} <em>(Cuenta como asignada no cumplida)</em>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Requiere decisión del jefe */}
          {report.tasks.bossDecisionCount > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={18} />
                <span>Requiere Decisión del Jefe ({report.tasks.bossDecisionCount})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '13px' }}>
                {report.tasks.bossDecisionList.map(t => (
                  <div key={t.id} style={{ color: '#78350f' }}>
                    • <strong>{t.title}</strong>: {t.category === 'compra' ? `Cotizado en $${t.est_cost} ${t.currency || 'USD'} — esperando aprobación` : t.waiting_reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Tareas Hechas en el periodo */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <CheckCircle2 size={18} color="#10b981" />
                <span>Tareas Completadas ({report.tasks.doneCount})</span>
              </div>
            </div>

            {report.tasks.doneCount === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin tareas completadas en este periodo.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(report.tasks.doneByCategory).map(([cat, list]) => (
                  <div key={cat}>
                    <span className={`cat-badge cat-${cat}`} style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                      {cat} ({list.length})
                    </span>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#334155' }}>
                      {list.map(t => (
                        <li key={t.id} style={{ marginBottom: '2px' }}>
                          <strong>{t.title}</strong>
                          {t.location && <span style={{ color: '#64748b' }}> — {t.location}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. En curso y Esperando */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div className="card-title">
                  <Wrench size={18} color="#0284c7" />
                  <span>En Curso ({report.tasks.doingCount})</span>
                </div>
              </div>
              {report.tasks.doingCount === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin tareas en curso.</div>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#334155' }}>
                  {report.tasks.doingList.map(t => (
                    <li key={t.id} style={{ marginBottom: '3px' }}>
                      <strong>{t.title}</strong> {t.location && <span style={{ color: '#64748b' }}>({t.location})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div className="card-title">
                  <Clock size={18} color="#d97706" />
                  <span>Esperando / Bloqueadas ({report.tasks.waitingCount})</span>
                </div>
              </div>
              {report.tasks.waitingCount === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin tareas bloqueadas.</div>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#334155' }}>
                  {report.tasks.waitingList.map(t => (
                    <li key={t.id} style={{ marginBottom: '3px' }}>
                      <strong>{t.title}</strong>: <span style={{ color: '#b45309' }}>{t.waiting_reason || 'Sin motivo'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 5. Compras Pendientes */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShoppingCart size={18} color="#7c3aed" />
                <span>Compras Pendientes ({report.tasks.pendingPurchasesCount})</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#6d28d9' }}>
                Total Est.: ${report.tasks.pendingPurchasesTotal.toFixed(2)} USD
              </div>
            </div>

            {report.tasks.pendingPurchasesCount === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>No hay compras pendientes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '13px' }}>
                {report.tasks.pendingPurchasesList.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e2e8f0', paddingBottom: '3px' }}>
                    <span>• {p.title} <em>({p.purchase_status || 'por_cotizar'})</em></span>
                    <strong>${(p.est_cost || 0).toFixed(2)} USD</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Evidencias del periodo (hasta 6 fotos) */}
          {report.evidence.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <ImageIcon size={18} color="#2563eb" />
                  <span>Evidencia Fotográfica ({report.evidence.length})</span>
                </div>
              </div>
              <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {report.evidence.map(ph => (
                  <div key={ph.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <img
                      src={`/uploads/${ph.filename}`}
                      alt={ph.caption || 'Evidencia'}
                      className="photo-thumb"
                      onClick={() => onSelectPhoto && onSelectPhoto(ph)}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ph.caption || ph.session_date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
