import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  Search, 
  Wrench, 
  Clock, 
  Cpu, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Save, 
  Trash2, 
  X,
  Laptop,
  Printer,
  Wifi,
  Tv,
  Layers 
} from 'lucide-react';
import { api } from '../api';

export function InventarioView() {
  const [equipmentList, setEquipmentList] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Modal Hoja de Vida / Detalle
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [equipmentDetail, setEquipmentDetail] = useState(null);

  // Formulario nuevo servicio en Hoja de Vida
  const [serviceAction, setServiceAction] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceNewStatus, setServiceNewStatus] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  // Modal registrar nuevo equipo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('pc');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSpecs, setNewSpecs] = useState('');
  const [newStatus, setNewStatus] = useState('operativo');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchTerm, filterCategory, filterStatus, filterLocation]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        api.getInventory({
          q: searchTerm || undefined,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          location: filterLocation || undefined
        }),
        api.getInventoryStats()
      ]);
      setEquipmentList(listData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async id => {
    setSelectedEquipment(id);
    setIsLoadingDetail(true);
    try {
      const detail = await api.getEquipment(id);
      setEquipmentDetail(detail);
      setServiceNewStatus(detail.status);
    } catch (err) {
      alert(err.message || 'Error al cargar equipo');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAddService = async e => {
    e.preventDefault();
    if (!serviceAction.trim() || !selectedEquipment) return;

    setIsSavingService(true);
    try {
      const res = await api.addEquipmentService(selectedEquipment, {
        service_date: serviceDate,
        action_taken: serviceAction.trim(),
        notes: serviceNotes.trim() || null,
        update_equipment_status: serviceNewStatus || undefined
      });

      setEquipmentDetail(prev => ({
        ...prev,
        ...res.equipment,
        services: res.services
      }));

      setServiceAction('');
      setServiceNotes('');
      loadData();
    } catch (err) {
      alert(err.message || 'Error al registrar servicio');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleCreateEquipment = async e => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newLocation.trim()) return;

    setIsCreating(true);
    try {
      await api.createEquipment({
        code: newCode.trim(),
        name: newName.trim(),
        category: newCategory,
        brand: newBrand.trim() || null,
        model: newModel.trim() || null,
        location: newLocation.trim(),
        specs: newSpecs.trim() || null,
        status: newStatus,
        notes: newNotes.trim() || null
      });

      setShowCreateModal(false);
      setNewCode('');
      setNewName('');
      setNewBrand('');
      setNewModel('');
      setNewLocation('');
      setNewSpecs('');
      loadData();
    } catch (err) {
      alert(err.message || 'Error al crear equipo');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEquipment = async id => {
    if (!window.confirm('¿Seguro que deseas eliminar este equipo del inventario? Se borrará también su historial.')) return;
    try {
      await api.deleteEquipment(id);
      setSelectedEquipment(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const getCategoryIcon = cat => {
    switch (cat) {
      case 'laptop': return Laptop;
      case 'proyector': return Tv;
      case 'impresora': return Printer;
      case 'red': return Wifi;
      default: return Monitor;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Tarjetas de estadísticas superiores */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="card" style={{ margin: 0, padding: '0.75rem' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Equipos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '11px', color: '#065f46' }}>Operativos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>{stats.operativo}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '11px', color: '#b45309' }}>Mantenimiento</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{stats.mantenimiento}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '11px', color: '#991b1b' }}>En Reparación</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{stats.enReparacion}</div>
          </div>
        </div>
      )}

      {/* Controles de búsqueda y filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por código (ej. PC-LAB1-01), specs, marca o aula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Nuevo Equipo</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">Todos los tipos</option>
            <option value="pc">PC de Escritorio</option>
            <option value="laptop">Laptops</option>
            <option value="proyector">Proyectores</option>
            <option value="impresora">Impresoras</option>
            <option value="red">Red / Switches / Routers</option>
            <option value="monitor">Monitores</option>
            <option value="ups">Reguladores / UPS</option>
            <option value="otro">Otros</option>
          </select>

          <select
            className="form-control"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">Cualquier estado</option>
            <option value="operativo">🟢 Operativo</option>
            <option value="mantenimiento_pendiente">🟡 Requiere Mantenimiento</option>
            <option value="en_reparacion">🟠 En Reparación</option>
            <option value="de_baja">🔴 De Baja</option>
          </select>
        </div>
      </div>

      {/* Lista de Equipos */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando inventario...</div>
      ) : equipmentList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No se encontraron equipos con los filtros seleccionados.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '0.85rem' }}>
          {equipmentList.map(eq => {
            const Icon = getCategoryIcon(eq.category);
            const statusConfig = {
              operativo: { label: 'Operativo', bg: '#ecfdf5', color: '#047857' },
              mantenimiento_pendiente: { label: 'Req. Mantenimiento', bg: '#fef3c7', color: '#b45309' },
              en_reparacion: { label: 'En Reparación', bg: '#fee2e2', color: '#dc2626' },
              de_baja: { label: 'De Baja', bg: '#f1f5f9', color: '#64748b' }
            };
            const st = statusConfig[eq.status] || statusConfig.operativo;

            return (
              <div
                key={eq.id}
                className="card"
                style={{ margin: 0, cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                onClick={() => handleOpenDetail(eq.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', letterSpacing: '0.02em' }}>
                      {eq.code}
                    </span>
                  </div>

                  <span style={{
                    backgroundColor: st.bg,
                    color: st.color,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px'
                  }}>
                    {st.label}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '0.25rem' }}>
                  {eq.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '12px', color: '#64748b', marginBottom: '0.4rem' }}>
                  <MapPin size={12} />
                  <span>{eq.location}</span>
                  {eq.brand && <span>• {eq.brand} {eq.model || ''}</span>}
                </div>

                {eq.specs && (
                  <div style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {eq.specs}
                  </div>
                )}

                {/* Último servicio */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem', fontSize: '11px', color: '#64748b' }}>
                  {eq.last_service_date ? (
                    <div>
                      <strong>Último servicio ({eq.last_service_date}):</strong>{' '}
                      <span>{eq.last_service_summary || 'Revisión'}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Sin intervenciones registradas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Hoja de Vida y Detalle del Equipo */}
      {selectedEquipment && (
        <div className="modal-overlay" onClick={() => setSelectedEquipment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {equipmentDetail ? `Hoja de Vida: ${equipmentDetail.code}` : 'Cargando...'}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedEquipment(null)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>

            {isLoadingDetail || !equipmentDetail ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando hoja de vida...</div>
            ) : (
              <div className="modal-body">
                {/* Resumen del equipo */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{equipmentDetail.name}</h3>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                        📍 <strong>Ubicación:</strong> {equipmentDetail.location} | <strong>Tipo:</strong> {equipmentDetail.category.toUpperCase()}
                      </div>
                      {equipmentDetail.brand && (
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          <strong>Marca/Modelo:</strong> {equipmentDetail.brand} {equipmentDetail.model || ''}
                        </div>
                      )}
                    </div>
                    <span className={`badge badge-${equipmentDetail.status}`} style={{ textTransform: 'capitalize' }}>
                      {equipmentDetail.status.replace('_', ' ')}
                    </span>
                  </div>

                  {equipmentDetail.specs && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' }}>
                      <strong>Especificaciones técnicas:</strong>
                      <div style={{ marginTop: '2px' }}>{equipmentDetail.specs}</div>
                    </div>
                  )}
                </div>

                {/* Formulario: Registrar nuevo servicio / mantenimiento */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1d4ed8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Wrench size={15} />
                    <span>Registrar Nuevo Mantenimiento / Intervención</span>
                  </div>

                  <form onSubmit={handleAddService}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px' }}>Fecha de intervención</label>
                        <input
                          type="date"
                          className="form-control"
                          value={serviceDate}
                          onChange={e => setServiceDate(e.target.value)}
                          style={{ fontSize: '13px' }}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px' }}>Actualizar estado del equipo</label>
                        <select
                          className="form-control"
                          value={serviceNewStatus}
                          onChange={e => setServiceNewStatus(e.target.value)}
                          style={{ fontSize: '13px' }}
                        >
                          <option value="operativo">🟢 Operativo</option>
                          <option value="mantenimiento_pendiente">🟡 Requiere Mantenimiento</option>
                          <option value="en_reparacion">🟠 En Reparación</option>
                          <option value="de_baja">🔴 De Baja</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>¿Qué trabajo o servicio se le hizo? *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ej. Cambio de pasta térmica, limpieza profunda, cambio de fuente..."
                        value={serviceAction}
                        onChange={e => setServiceAction(e.target.value)}
                        style={{ fontSize: '13px' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm btn-block"
                      disabled={isSavingService}
                    >
                      <Save size={14} />
                      <span>{isSavingService ? 'Guardando...' : 'Guardar en Hoja de Vida'}</span>
                    </button>
                  </form>
                </div>

                {/* Historial de intervenciones pasadas */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={16} />
                    <span>Historial de Servicios ({equipmentDetail.services?.length || 0})</span>
                  </div>

                  {!equipmentDetail.services || equipmentDetail.services.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '1rem' }}>
                      No hay intervenciones previas registradas para este equipo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {equipmentDetail.services.map(srv => (
                        <div key={srv.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.65rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <strong style={{ fontSize: '13px', color: '#1e293b' }}>{srv.service_date}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Técnico: {srv.technician}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155' }}>
                            {srv.action_taken}
                          </div>
                          {srv.notes && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Nota: {srv.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem', padding: '0.75rem 0 0 0' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteEquipment(equipmentDetail.id)}
                    style={{ marginRight: 'auto' }}
                  >
                    <Trash2 size={15} />
                    <span>Eliminar Equipo</span>
                  </button>
                  <button className="btn btn-outline" onClick={() => setSelectedEquipment(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Equipo */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 700 }}>Registrar Nuevo Equipo</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateModal(false)} style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEquipment} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Código / Tag *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. PC-LAB1-15, PROY-AULA3"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  >
                    <option value="pc">PC de Escritorio</option>
                    <option value="laptop">Laptop</option>
                    <option value="proyector">Proyector</option>
                    <option value="impresora">Impresora</option>
                    <option value="red">Red / Switch / Router</option>
                    <option value="monitor">Monitor</option>
                    <option value="ups">Regulador / UPS</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre descriptivo *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. PC Estudiante 15, Proyector Interactivo..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ubicación *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. Laboratorio 1, Salón 4B"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado inicial</label>
                  <select
                    className="form-control"
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                  >
                    <option value="operativo">🟢 Operativo</option>
                    <option value="mantenimiento_pendiente">🟡 Requiere Mantenimiento</option>
                    <option value="en_reparacion">🟠 En Reparación</option>
                    <option value="de_baja">🔴 De Baja</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. HP, Dell, Epson..."
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. ProDesk 600, PowerLite..."
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Especificaciones (Specs)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Core i5, 16GB RAM, SSD 480GB, Win 11"
                  value={newSpecs}
                  onChange={e => setNewSpecs(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.5rem 0 0 0' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Guardando...' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
