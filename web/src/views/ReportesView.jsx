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
  Image as ImageIcon,
  Save,
  Archive,
  History,
  FileDown 
} from 'lucide-react';
import { api } from '../api';

export function ReportesView({ onSelectPhoto }) {
  const [viewMode, setViewMode] = useState('actual'); // 'actual' | 'historial'
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Historial de reportes semanales guardados
  const [savedReports, setSavedReports] = useState([]);
  const [selectedSavedReport, setSelectedSavedReport] = useState(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  useEffect(() => {
    if (viewMode === 'actual') {
      loadReport();
    } else {
      loadSavedReports();
    }
  }, [viewMode, period, currentDate]);

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

  const loadSavedReports = async () => {
    setIsLoadingSaved(true);
    try {
      const list = await api.getSavedReports();
      setSavedReports(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSaved(false);
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

  const handleSaveWeekReport = async () => {
    try {
      const res = await api.generateWeeklyReport(currentDate);
      setMessage(`¡Reporte semanal guardado y archivado exitosamente para supervisión!`);
      setTimeout(() => setMessage(''), 4000);
      loadSavedReports();
    } catch (err) {
      alert(err.message || 'Error al guardar reporte semanal');
    }
  };

  const handleOpenSavedDetail = async id => {
    try {
      const data = await api.getSavedReport(id);
      setSelectedSavedReport(data);
    } catch (err) {
      alert(err.message || 'Error al cargar reporte archivado');
    }
  };

  const fmtHours = h => String(h || 0).replace('.', ',');

  return (
    <div className="page-wrapper">
      {/* Encabezado especial institucional solo visible al imprimir */}
      <div className="print-header">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Servicio Técnico y Soporte de Tecnologías de Información
          </div>
          <div className="print-title" style={{ marginTop: '4px' }}>
            Reporte Ejecutivo Semanal de Actividades
          </div>
          <div className="print-subtitle" style={{ marginTop: '2px' }}>
            Periodo: {selectedSavedReport?.title || report?.range?.label} — Técnico Responsable: Santiago
          </div>
        </div>
      </div>

      {message && <div className="alert alert-info no-print">{message}</div>}
      {error && <div className="alert alert-danger no-print">{error}</div>}

      {/* Selector de Modo: Actual vs Historial de Semanas Guardadas */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            className={`btn btn-sm ${viewMode === 'actual' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => { setViewMode('actual'); setSelectedSavedReport(null); }}
          >
            <FileText size={15} />
            <span>Reporte del Periodo</span>
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'historial' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => setViewMode('historial')}
          >
            <Archive size={15} />
            <span>Semanas Guardadas (Supervisores)</span>
          </button>
        </div>

        {viewMode === 'actual' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-success btn-sm" onClick={handleSaveWeekReport} title="Guarda el consolidado de esta semana en el historial">
              <Save size={15} />
              <span>Archivar Reporte Semanal</span>
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleCopySummary}>
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copied ? '¡Copiado!' : 'WhatsApp'}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={15} />
              <span>Descargar PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* VISTA 1: REPORTE ACTUAL */}
      {viewMode === 'actual' && (
        <>
          {/* Navegación de Periodo */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                <button
                  className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ border: 'none', padding: '0.25rem 0.6rem', fontSize: '12px' }}
                  onClick={() => setPeriod('week')}
                >
                  Semana
                </button>
                <button
                  className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ border: 'none', padding: '0.25rem 0.6rem', fontSize: '12px' }}
                  onClick={() => setPeriod('month')}
                >
                  Mes
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => navigatePeriod(-1)}>
                  <ChevronLeft size={16} />
                </button>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                  {report?.range?.label || 'Cargando...'}
                </strong>
                <button className="btn btn-outline btn-sm" onClick={() => navigatePeriod(1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Generando reporte...</div>
          ) : report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 1. Métrica de Horas Semanales */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Clock size={18} color="#2563eb" />
                    <span>1. Rendimiento y Cumplimiento de Horas Asignadas</span>
                  </div>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: report.hours.percentage >= 100 ? '#059669' : '#2563eb' }}>
                    {report.hours.percentage}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Horas Asignadas</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                      {fmtHours(report.hours.assigned)} h
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Horas programadas en el colegio</div>
                  </div>

                  <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '12px', color: '#065f46' }}>Horas Cumplidas</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>
                      {fmtHours(report.hours.completed)} h
                    </div>
                    <div style={{ fontSize: '11px', color: '#059669' }}>Horas de servicio efectivas</div>
                  </div>
                </div>
              </div>

              {/* 2. Problemas e Incidencias Ocurridas */}
              <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: '#991b1b' }}>
                    <AlertCircle size={18} color="#ef4444" />
                    <span>2. Problemas e Incidencias Ocurridas</span>
                  </div>
                </div>

                {report.hours.notDone.length === 0 && report.hours.suspended.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#059669' }}>
                    ✓ No ocurrieron suspensiones ni ausencias durante las sesiones de esta semana.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '13px' }}>
                    {report.hours.suspended.map(s => (
                      <div key={s.id} style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                        ⚠️ <strong>Sesión Suspendida ({s.date}):</strong> {s.reason} <em>(Feriado o evento institucional)</em>
                      </div>
                    ))}
                    {report.hours.notDone.map(s => (
                      <div key={s.id} style={{ background: '#fef2f2', padding: '0.4rem 0.6rem', borderRadius: '4px', color: '#991b1b' }}>
                        ❌ <strong>Sesión No Realizada ({s.date}):</strong> {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Qué se reparó y completó en la semana */}
              <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: '#047857' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>3. Trabajos Completados y Reparaciones Efectuadas ({report.tasks.doneCount})</span>
                  </div>
                </div>

                {report.tasks.doneCount === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin tareas cerradas en este periodo.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {Object.entries(report.tasks.doneByCategory).map(([cat, list]) => (
                      <div key={cat}>
                        <span className={`cat-badge cat-${cat}`} style={{ marginBottom: '0.25rem', display: 'inline-block' }}>
                          {cat} ({list.length})
                        </span>
                        <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#334155' }}>
                          {list.map(t => (
                            <li key={t.id} style={{ marginBottom: '2px' }}>
                              <strong>{t.title}</strong>
                              {t.location && <span style={{ color: '#64748b' }}> — Ubicación: {t.location}</span>}
                              {t.requested_by && <span style={{ color: '#94a3b8' }}> (Solicitó: {t.requested_by})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. En qué se está trabajando actualmente */}
              <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: '#0369a1' }}>
                    <Wrench size={18} color="#0284c7" />
                    <span>4. Trabajos en Curso ({report.tasks.doingCount})</span>
                  </div>
                </div>

                {report.tasks.doingCount === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin trabajos activos en curso.</div>
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

              {/* 5. Qué trabajos quedan pendientes y requerimientos */}
              <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: '#b45309' }}>
                    <Clock size={18} color="#f59e0b" />
                    <span>5. Trabajos Pendientes y Requerimientos de Decisión</span>
                  </div>
                </div>

                {/* Requiere decisión del jefe */}
                {report.tasks.bossDecisionCount > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '13px', color: '#92400e' }}>
                      ⚠️ Requiere Aprobación o Decisión de Supervisión:
                    </strong>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#78350f', marginTop: '4px' }}>
                      {report.tasks.bossDecisionList.map(t => (
                        <li key={t.id}>
                          <strong>{t.title}</strong>: {t.category === 'compra' ? `Cotizado en $${t.est_cost} ${t.currency || 'USD'} (Falta aprobación)` : t.waiting_reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tareas en espera */}
                {report.tasks.waitingCount > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Tareas en Espera ({report.tasks.waitingCount}):
                    </div>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', color: '#334155' }}>
                      {report.tasks.waitingList.map(t => (
                        <li key={t.id}>
                          <strong>{t.title}</strong>: <span style={{ color: '#b45309' }}>{t.waiting_reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compras pendientes */}
                {report.tasks.pendingPurchasesCount > 0 && (
                  <div style={{ fontSize: '13px', color: '#475569', borderTop: '1px dotted #e2e8f0', paddingTop: '0.4rem' }}>
                    🛒 <strong>Compras pendientes:</strong> {report.tasks.pendingPurchasesCount} requerimientos con un total estimado de <strong>${report.tasks.pendingPurchasesTotal} USD</strong>.
                  </div>
                )}
              </div>

              {/* 6. Evidencias del periodo */}
              {report.evidence.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <ImageIcon size={18} color="#2563eb" />
                      <span>Evidencia Fotográfica de la Semana ({report.evidence.length})</span>
                    </div>
                  </div>
                  <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {report.evidence.map(ph => (
                      <div key={ph.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <img
                          src={`/uploads/${ph.filename}`}
                          alt={ph.caption || 'Evidencia'}
                          className="photo-thumb"
                          onClick={() => onSelectPhoto && onSelectPhoto(ph)}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                          {ph.caption || ph.session_date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* VISTA 2: HISTORIAL DE SEMANAS GUARDADAS PARA SUPERVISORES */}
      {viewMode === 'historial' && (
        <div>
          {selectedSavedReport ? (
            <div>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedSavedReport(null)}>
                  ← Volver a la lista de reportes
                </button>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={15} />
                  <span>Imprimir / Descargar PDF</span>
                </button>
              </div>

              {/* Ficha archivada formal del reporte semanal */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedSavedReport.title}
                  </h2>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    Archivado el: {new Date(selectedSavedReport.generated_at).toLocaleString()} | Técnico Responsable: Santiago
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Horas Asignadas</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>{fmtHours(selectedSavedReport.hours_assigned)} h</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '0.65rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '11px', color: '#065f46' }}>Horas Cumplidas</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#047857' }}>{fmtHours(selectedSavedReport.hours_completed)} h</div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8' }}>% Rendimiento</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2563eb' }}>{selectedSavedReport.completion_percentage}%</div>
                  </div>
                </div>

                {/* 1. Problemas */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={16} />
                    <span>Problemas e Incidencias Ocurridas:</span>
                  </h3>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#334155', background: '#fef2f2', padding: '0.65rem', borderRadius: '6px' }}>
                    • {selectedSavedReport.problems_occurred}
                  </div>
                </div>

                {/* 2. Qué se reparó */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#047857', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Qué se Reparó y Completó:</span>
                  </h3>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#334155', background: '#ecfdf5', padding: '0.65rem', borderRadius: '6px' }}>
                    • {selectedSavedReport.repaired_completed}
                  </div>
                </div>

                {/* 3. En qué se trabaja */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Wrench size={16} />
                    <span>En qué se está trabajando:</span>
                  </h3>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#334155', background: '#f0f9ff', padding: '0.65rem', borderRadius: '6px' }}>
                    • {selectedSavedReport.working_on}
                  </div>
                </div>

                {/* 4. Pendientes */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#b45309', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={16} />
                    <span>Trabajos Pendientes y Requerimientos:</span>
                  </h3>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#334155', background: '#fffbeb', padding: '0.65rem', borderRadius: '6px' }}>
                    • {selectedSavedReport.pending_work}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    Historial de Reportes Semanales Guardados ({savedReports.length})
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Consolidado oficial archivado los viernes para entrega a supervisión.
                  </p>
                </div>
              </div>

              {isLoadingSaved ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando historial de semanas...</div>
              ) : savedReports.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Aún no hay reportes semanales archivados. Puedes presionar "Archivar Reporte Semanal" desde la pestaña de periodo o esperar al viernes para su generación automática.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {savedReports.map(sr => (
                    <div
                      key={sr.id}
                      className="card"
                      style={{ margin: 0, padding: '0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
                      onClick={() => handleOpenSavedDetail(sr.id)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                          {sr.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Rango: {sr.start_date} al {sr.end_date} | Horas: {fmtHours(sr.hours_completed)} / {fmtHours(sr.hours_assigned)} h ({sr.completion_percentage}%)
                        </div>
                      </div>

                      <button className="btn btn-outline btn-sm" style={{ color: '#2563eb', borderColor: '#bfdbfe' }}>
                        <FileDown size={14} />
                        <span>Ver Ficha y PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
