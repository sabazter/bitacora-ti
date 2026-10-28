import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Camera, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Wrench, 
  Package, 
  Sparkles, 
  Lightbulb, 
  Lock,
  MapPin,
  User,
  ListFilter
} from 'lucide-react';
import { api } from '../api';
import { compressImage } from '../utils/imageCompressor';

export function PublicSolicitudView({ onGoToLogin }) {
  const [activeSubTab, setActiveSubTab] = useState('nuevo'); // 'nuevo' | 'lista'
  
  // Campos del formulario
  const [requesterName, setRequesterName] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('falla');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Lista de solicitudes públicas
  const [publicRequests, setPublicRequests] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'lista') {
      loadPublicRequests();
    }
  }, [activeSubTab]);

  const loadPublicRequests = async () => {
    setIsLoadingList(true);
    try {
      const data = await api.getPublicRequests();
      setPublicRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handlePhotoSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!requesterName.trim() || !description.trim()) {
      setErrorMessage('Por favor completa tu nombre y la descripción de lo que necesitas.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('requester_name', requesterName.trim());
      formData.append('location', location.trim());
      formData.append('type', type);
      formData.append('description', description.trim());
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await api.submitPublicRequest(formData);

      setSuccessMessage('¡Solicitud enviada con éxito! Santiago la revisará en su próxima sesión de soporte.');
      setDescription('');
      setLocation('');
      setPhotoFile(null);
      setPhotoPreview(null);
      
      // Cambiar a la lista tras 2 segundos para ver su solicitud
      setTimeout(() => {
        setActiveSubTab('lista');
      }, 2500);

    } catch (err) {
      setErrorMessage(err.message || 'Error al enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { id: 'falla', label: 'Falla / Reparación', icon: Wrench, color: '#ef4444', desc: 'Equipo no enciende, sin internet, monitor parpadea...' },
    { id: 'material', label: 'Material o Equipo', icon: Package, color: '#8b5cf6', desc: 'Cables, proyector para clase, tóner, adaptador...' },
    { id: 'mejora', label: 'Mejora o Detalle', icon: Sparkles, color: '#0284c7', desc: '"Ordena cables con tierap", acomodar tomas...' },
    { id: 'sugerencia', label: 'Sugerencia', icon: Lightbulb, color: '#f59e0b', desc: 'Ideas o recomendaciones para las aulas o laboratorios' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '3rem' }}>
      {/* Header Escolar */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '1.75rem 1rem 1.25rem 1rem',
        textAlign: 'center',
        borderBottom: '4px solid #2563eb'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '13px', marginBottom: '0.75rem' }}>
            <Wrench size={16} color="#38bdf8" />
            <span>Soporte Técnico Escolar — Santiago</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Portal de Solicitudes y Reportes</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '0.35rem' }}>
            Para Profesores, Maestros y Coordinadores del Colegio
          </p>

          {/* Selector de Pestañas Públicas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              onClick={() => setActiveSubTab('nuevo')}
              style={{
                background: activeSubTab === 'nuevo' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              + Nueva Petición
            </button>
            <button
              onClick={() => setActiveSubTab('lista')}
              style={{
                background: activeSubTab === 'lista' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              📋 Ver Estado de Solicitudes
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ maxWidth: '600px', margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
        {activeSubTab === 'nuevo' ? (
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
              ¿Qué necesitas para tu aula o equipo?
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '1.25rem' }}>
              No necesitas crear cuenta. Solo dinos quién eres, dónde es y qué requerimiento tienes.
            </p>

            {successMessage && (
              <div className="alert alert-info" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={20} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>¿Quién eres? (Tu nombre y cargo) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Prof. María (Biología), Coord. Carlos..."
                  value={requesterName}
                  onChange={e => setRequesterName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>¿Dónde es? (Ubicación) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Aula 3B, Laboratorio 2, Sala de Profesores..."
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>¿De qué tipo se trata?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {types.map(t => {
                    const Icon = t.icon;
                    const isSelected = type === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setType(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${t.color}` : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Icon size={18} color={t.color} />
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: '#1e293b' }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>¿Qué necesitas o qué ocurrió? *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Explica con tus palabras (ej. 'ordena esos cables con tierap', 'el monitor no da video', 'necesitamos un alargue para el proyector')..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Foto de evidencia (opcional)</label>
                <label className="btn btn-outline btn-block" style={{ borderStyle: 'dashed', cursor: 'pointer', minHeight: '44px' }}>
                  <Camera size={18} color="#2563eb" />
                  <span>{photoFile ? 'Cambiar foto seleccionada' : 'Tomar o subir foto con el teléfono'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                {photoPreview && (
                  <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                    <img
                      src={photoPreview}
                      alt="Vista previa"
                      style={{ maxHeight: '160px', borderRadius: '8px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ height: '48px', fontSize: '15px', fontWeight: 600, marginTop: '1rem' }}
                disabled={isSubmitting}
              >
                <Send size={18} />
                <span>{isSubmitting ? 'Enviando petición...' : 'Enviar Solicitud a Santiago'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Solicitudes Recientes ({publicRequests.length})
              </h2>
              <button className="btn btn-outline btn-sm" onClick={loadPublicRequests}>
                Actualizar
              </button>
            </div>

            {isLoadingList ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando solicitudes...</div>
            ) : publicRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No hay solicitudes registradas recientemente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {publicRequests.map(req => {
                  const statusColors = {
                    pendiente: { bg: '#fef3c7', text: '#b45309', label: '⏳ Pendiente' },
                    en_proceso: { bg: '#e0f2fe', text: '#0369a1', label: '🔧 En Proceso' },
                    resuelta: { bg: '#d1fae5', text: '#065f46', label: '✅ Resuelta' },
                    descartada: { bg: '#f1f5f9', text: '#64748b', label: 'Descartada' }
                  };
                  const st = statusColors[req.status] || statusColors.pendiente;

                  return (
                    <div key={req.id} className="card" style={{ margin: 0, padding: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{req.requester_name}</strong>
                          {req.location && (
                            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '0.4rem' }}>
                              📍 {req.location}
                            </span>
                          )}
                        </div>
                        <span style={{
                          backgroundColor: st.bg,
                          color: st.text,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px'
                        }}>
                          {st.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4, marginBottom: '0.4rem' }}>
                        {req.description}
                      </div>

                      {req.photo_url && (
                        <div style={{ marginBottom: '0.4rem' }}>
                          <img
                            src={req.photo_url}
                            alt="Foto solicitud"
                            style={{ maxHeight: '100px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      {req.admin_note && (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '0.4rem 0.6rem',
                          fontSize: '12px',
                          color: '#0369a1'
                        }}>
                          <strong>Nota de Santiago:</strong> {req.admin_note}
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.4rem', textAlign: 'right' }}>
                        {new Date(req.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Enlace para que Santiago entre como administrador */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={onGoToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Lock size={12} />
            <span>Acceso Técnico de Santiago (Admin)</span>
          </button>
        </div>
      </main>
    </div>
  );
}
