import React, { useState } from 'react';
import { Wrench, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginView({ onOpenPublicPortal }) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setIsLoading(true);
    try {
      await login(password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            marginBottom: '0.75rem'
          }}>
            <Wrench size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Bitácora TI</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '0.25rem' }}>
            Servicio Técnico Escolar — Santiago
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Contraseña de acceso</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.5rem', height: '46px' }}
                placeholder="Ingresa la contraseña..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
              <Lock 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} 
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ height: '46px', fontSize: '15px' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Verificando...' : 'Entrar a la Bitácora'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {onOpenPublicPortal && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <button
              onClick={onOpenPublicPortal}
              className="btn btn-outline btn-block"
              style={{
                color: '#2563eb',
                borderColor: '#bfdbfe',
                backgroundColor: '#eff6ff',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <Sparkles size={16} color="#2563eb" />
              <span>Portal de Solicitudes (Profesores)</span>
            </button>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Para pedir materiales, reparaciones o mejoras sin cuenta.
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          Sistema protegido con limitación de intentos y sesión segura.
        </div>
      </div>
    </div>
  );
}
