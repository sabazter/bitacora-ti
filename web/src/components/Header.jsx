import React from 'react';
import { LogOut, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header({ activeTab }) {
  const { logout, user } = useAuth();

  const tabTitles = {
    hoy: 'Sesión de Hoy',
    tablero: 'Tablero de Tareas',
    solicitudes: 'Solicitudes de Profesores',
    inventario: 'Inventario de Equipos (~150)',
    compras: 'Gestión de Compras',
    bitacora: 'Historial de Bitácora',
    reportes: 'Reportes de Servicio',
    ajustes: 'Ajustes y Respaldo'
  };

  return (
    <header className="top-header no-print">
      <div className="top-header-title">
        <Wrench size={20} color="#2563eb" style={{ display: 'inline-block' }} />
        <span>{tabTitles[activeTab] || 'Bitácora TI'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>{user || 'Santiago'}</span>
        <button 
          className="btn btn-outline btn-sm" 
          onClick={logout}
          title="Cerrar sesión"
          style={{ padding: '0.3rem 0.5rem' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
