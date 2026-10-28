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
  Folder,
  ChevronRight,
  FolderPlus,
  ArrowLeft,
  Grid,
  List,
  Layers,
  Settings2 
} from 'lucide-react';
import { api } from '../api';

export function InventarioView() {
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'todos' | 'gestionar_areas'
  
  // Jerarquía de navegación: Inventario > Área > Ubicación/Lab
  const [selectedArea, setSelectedArea] = useState(null); // string | null
  const [selectedLocation, setSelectedLocation] = useState(null); // string | null

  const [equipmentList, setEquipmentList] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros globales
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
  const [newArea, setNewArea] = useState('Bachillerato');
  const [newLocation, setNewLocation] = useState('Lab 1');
  const [newUnitNumber, setNewUnitNumber] = useState('PC 01');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('pc');
  const [newBrand, setNewBrand] = useState('HP');
  const [newModel, setNewModel] = useState('');
  const [newSpecs, setNewSpecs] = useState('');
  const [newStatus, setNewStatus] = useState('operativo');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal / Formulario Nueva Área
  const [areaNameInput, setAreaNameInput] = useState('');
  const [areaDescInput, setAreaDescInput] = useState('');
  const [isCreatingArea, setIsCreatingArea] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchTerm, filterCategory, filterStatus, selectedArea, selectedLocation]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listData, statsData, areasData] = await Promise.all([
        api.getInventory({
          q: searchTerm || undefined,
          area: selectedArea || undefined,
          location: selectedLocation || undefined,
          category: filterCategory || undefined,
          status: filterStatus || undefined
        }),
        api.getInventoryStats(),
        api.getInventoryAreas()
      ]);
      setEquipmentList(listData);
      setStats(statsData);
      setAreasList(areasData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArea = async e => {
    e.preventDefault();
    if (!areaNameInput.trim()) return;

    setIsCreatingArea(true);
    try {
      await api.createInventoryArea({
        name: areaNameInput.trim(),
        description: areaDescInput.trim() || null
      });
      setAreaNameInput('');
      setAreaDescInput('');
      loadData();
    } catch (err) {
      alert(err.message || 'Error al crear área');
    } finally {
      setIsCreatingArea(false);
    }
  };

  const handleDeleteArea = async id => {
    if (!window.confirm('¿Seguro que deseas eliminar esta área? Los equipos asignados se moverán al área General.')) return;
    try {
      await api.deleteInventoryArea(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Error al eliminar área');
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

  // Auto-completar sugerencia de código al escribir área, salón y número
  const handleAutoCode = (area, loc, unit) => {
    const aShort = area.replace(/\s+/g, '').slice(0, 4).toUpperCase();
    const lShort = loc.replace(/\s+/g, '').toUpperCase();
    const uShort = unit.replace(/\s+/g, '').toUpperCase();
    return `${aShort}-${lShort}-${uShort}`;
  };

  const handleCreateEquipment = async e => {
    e.preventDefault();
    const code = newCode.trim() || handleAutoCode(newArea, newLocation, newUnitNumber);
    const name = newName.trim() || `${newCategory.toUpperCase()} ${newUnitNumber} (${newLocation})`;

    setIsCreating(true);
    try {
      await api.createEquipment({
        code: code.toUpperCase(),
        name,
        area: newArea.trim(),
        location: newLocation.trim(),
        unit_number: newUnitNumber.trim() || null,
        category: newCategory,
        brand: newBrand.trim() || null,
        model: newModel.trim() || null,
        specs: newSpecs.trim() || null,
        status: newStatus,
        notes: newNotes.trim() || null
      });

      setShowCreateModal(false);
      setNewCode('');
      setNewName('');
      setNewModel('');
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

  // Agrupación para la vista jerárquica:
  // Si estamos en un Área, listar sus Ubicaciones/Salones
  const locationsInSelectedArea = stats?.byLocation?.filter(l => l.area === selectedArea) || [];

  return (
    <div className="page-wrapper">
      {/* Resumen estadístico */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="card" style={{ margin: 0, padding: '0.75rem' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Equipos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '11px', color: '#065f46' }}>Operativos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>{stats.operativo}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '11px', color: '#b45309' }}>Req. Mantenimiento</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{stats.mantenimiento}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: '0.75rem', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '11px', color: '#991b1b' }}>En Reparación</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{stats.enReparacion}</div>
          </div>
        </div>
      )}

      {/* Selector de Modo de Inventario */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'areas' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => { setActiveTab('areas'); setSelectedArea(null); setSelectedLocation(null); }}
          >
            <Folder size={15} />
            <span>Por Áreas y Salones</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'todos' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => { setActiveTab('todos'); setSelectedArea(null); setSelectedLocation(null); }}
          >
            <List size={15} />
            <span>Lista Global (150)</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'gestionar_areas' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveTab('gestionar_areas')}
          >
            <Settings2 size={15} />
            <span>Gestionar Áreas</span>
          </button>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          <span>Agregar Equipo</span>
        </button>
      </div>

      {/* Buscador Rápido (siempre disponible) */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Buscar equipo por número (ej. PC 05), tag, especificación (i5, 16GB) o aula..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (e.target.value && activeTab === 'areas') {
              setActiveTab('todos'); // Si busca algo directo, cambiar a vista de resultados
            }
          }}
          style={{ paddingLeft: '2rem' }}
        />
      </div>

      {/* ========================================================
          MODO 1: NAVEGACIÓN JERÁRQUICA: ÁREA > SALÓN/LAB > EQUIPOS
          ======================================================== */}
      {activeTab === 'areas' && (
        <div>
          {/* Breadcrumb de Navegación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px', background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span
              style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
              onClick={() => { setSelectedArea(null); setSelectedLocation(null); }}
            >
              Inventario
            </span>

            {selectedArea && (
              <>
                <ChevronRight size={14} color="#94a3b8" />
                <span
                  style={{ fontWeight: 600, color: selectedLocation ? '#2563eb' : '#0f172a', cursor: selectedLocation ? 'pointer' : 'default' }}
                  onClick={() => setSelectedLocation(null)}
                >
                  {selectedArea}
                </span>
              </>
            )}

            {selectedLocation && (
              <>
                <ChevronRight size={14} color="#94a3b8" />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedLocation}
                </span>
              </>
            )}
          </div>

          {/* NIVEL 1: Listar Áreas */}
          {!selectedArea && (
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '0.75rem' }}>
                Selecciona un área para ver sus salones y laboratorios:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {areasList.map(area => (
                  <div
                    key={area.id}
                    className="card"
                    style={{ margin: 0, cursor: 'pointer', borderLeft: '4px solid #2563eb', transition: 'transform 0.1s ease' }}
                    onClick={() => setSelectedArea(area.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
                          <Folder size={20} />
                        </div>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{area.name}</strong>
                      </div>
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.5rem' }}>
                      {area.description || 'Área institucional'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
                      <span><strong>{area.location_count || 0}</strong> salones/labs</span>
                      <span><strong>{area.equipment_count || 0}</strong> equipos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NIVEL 2: Listar Salones / Labs dentro del Área Seleccionada */}
          {selectedArea && !selectedLocation && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedArea(null)}>
                  <ArrowLeft size={15} />
                  <span>Volver a Áreas</span>
                </button>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Salones y laboratorios en <strong>{selectedArea}</strong>:
                </div>
              </div>

              {locationsInSelectedArea.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Aún no hay equipos asignados a salones en esta área.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {locationsInSelectedArea.map(loc => (
                    <div
                      key={loc.location}
                      className="card"
                      style={{ margin: 0, cursor: 'pointer', borderLeft: '4px solid #10b981' }}
                      onClick={() => setSelectedLocation(loc.location)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>{loc.location}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {loc.count} equipo(s) instalado(s)
                          </div>
                        </div>
                        <ChevronRight size={18} color="#94a3b8" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NIVEL 3: Listar Equipos en Salón/Lab Específico (ej. Bachillerato > Lab 1 > PC 01, PC 02...) */}
          {selectedArea && selectedLocation && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedLocation(null)}>
                  <ArrowLeft size={15} />
                  <span>Volver a Salones de {selectedArea}</span>
                </button>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Equipos en <strong>{selectedArea} › {selectedLocation}</strong> ({equipmentList.length})
                </div>
              </div>

              {equipmentList.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No hay equipos en este espacio.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
                  {equipmentList.map(eq => (
                    <EquipmentCard key={eq.id} eq={eq} onOpenDetail={handleOpenDetail} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODO 2: LISTA GLOBAL COMPLETA CON FILTROS
          ======================================================== */}
      {activeTab === 'todos' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
              <option value="red">Red / Switches</option>
              <option value="monitor">Monitores</option>
              <option value="ups">UPS / Reguladores</option>
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
              <option value="mantenimiento_pendiente">🟡 Req. Mantenimiento</option>
              <option value="en_reparacion">🟠 En Reparación</option>
              <option value="de_baja">🔴 De Baja</option>
            </select>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando equipos...</div>
          ) : equipmentList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No se encontraron equipos con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
              {equipmentList.map(eq => (
                <EquipmentCard key={eq.id} eq={eq} onOpenDetail={handleOpenDetail} getCategoryIcon={getCategoryIcon} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODO 3: GESTIONAR ÁREAS (Para que el usuario agregue áreas)
          ======================================================== */}
      {activeTab === 'gestionar_areas' && (
        <div>
          {/* Formulario Crear Nueva Área */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FolderPlus size={18} color="#2563eb" />
              <span>Agregar Nueva Área Institucional</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '1rem' }}>
              Define las áreas del colegio para estructurar los salones y laboratorios (ej. *Bachillerato, Primaria, Preescolar, Administración, Biblioteca*).
            </p>

            <form onSubmit={handleCreateArea} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre del área (ej. Preescolar, Biblioteca)..."
                  value={areaNameInput}
                  onChange={e => setAreaNameInput(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Descripción opcional (ej. Edificio este, planta baja)..."
                  value={areaDescInput}
                  onChange={e => setAreaDescInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={isCreatingArea}>
                <Plus size={15} />
                <span>{isCreatingArea ? 'Creando...' : 'Crear Área'}</span>
              </button>
            </form>
          </div>

          {/* Lista de Áreas Existentes */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Áreas Registradas ({areasList.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {areasList.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{a.name}</strong>
                    {a.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{a.description}</div>}
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {a.equipment_count || 0} equipos registrados
                    </div>
                  </div>

                  {a.name !== 'General' && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDeleteArea(a.id)}
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      title="Eliminar área"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
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
                  {equipmentDetail ? `${equipmentDetail.code}: ${equipmentDetail.unit_number || equipmentDetail.name}` : 'Cargando...'}
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
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                        📍 <strong>Jerarquía:</strong> {equipmentDetail.area || 'General'} › {equipmentDetail.location} {equipmentDetail.unit_number ? `(Unidad: ${equipmentDetail.unit_number})` : ''}
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
                        placeholder="ej. Limpieza de polvo, cambio de pasta térmica, actualización..."
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
              {/* Jerarquía: Área > Salón/Lab > Número PC */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem' }}>
                  Jerarquía de Ubicación: Área › Salón › Número
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Área *</label>
                    <select
                      className="form-control"
                      value={newArea}
                      onChange={e => setNewArea(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      {areasList.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Salón / Lab *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ej. Lab 1, Aula 3"
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                      style={{ fontSize: '12px' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Número / Unidad *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ej. PC 01, PC 15"
                      value={newUnitNumber}
                      onChange={e => setNewUnitNumber(e.target.value)}
                      style={{ fontSize: '12px' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Código / Tag sugerido</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={handleAutoCode(newArea, newLocation, newUnitNumber)}
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Si se deja vacío: <code>{handleAutoCode(newArea, newLocation, newUnitNumber)}</code>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Equipo *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. HP, Dell, Lenovo"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. ProDesk 600 G3"
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
                  placeholder="ej. Core i5-6500, 16GB RAM, SSD 480GB, Windows 11"
                  value={newSpecs}
                  onChange={e => setNewSpecs(e.target.value)}
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

// Componente Tarjeta de Equipo Reutilizable
function EquipmentCard({ eq, onOpenDetail, getCategoryIcon }) {
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
      className="card"
      style={{ margin: 0, cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
      onClick={() => onOpenDetail(eq.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
            <Icon size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
              {eq.unit_number ? `${eq.unit_number} (${eq.code})` : eq.code}
            </span>
          </div>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '12px', color: '#475569', marginBottom: '0.35rem' }}>
        <MapPin size={12} color="#2563eb" />
        <strong>{eq.area || 'General'}</strong> › <span>{eq.location}</span>
        {eq.brand && <span style={{ color: '#94a3b8' }}>• {eq.brand} {eq.model || ''}</span>}
      </div>

      {eq.specs && (
        <div style={{ fontSize: '11px', color: '#334155', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', marginBottom: '0.4rem', lineHeight: 1.3 }}>
          {eq.specs}
        </div>
      )}

      {/* Último servicio */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.35rem', fontSize: '11px', color: '#64748b' }}>
        {eq.last_service_date ? (
          <div>
            <strong>Último servicio ({eq.last_service_date}):</strong> {eq.last_service_summary || 'Revisión'}
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>Sin intervenciones registradas</span>
        )}
      </div>
    </div>
  );
}
