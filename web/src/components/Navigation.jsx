import React from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  ShoppingCart, 
  BookOpen, 
  FileText, 
  Settings, 
  LogOut, 
  Wrench 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navigation({ activeTab, setActiveTab }) {
  const { logout, user } = useAuth();

  const tabs = [
    { id: 'hoy', label: 'Hoy', icon: Calendar },
    { id: 'tablero', label: 'Tablero', icon: LayoutDashboard },
    { id: 'compras', label: 'Compras', icon: ShoppingCart },
    { id: 'bitacora', label: 'Bitácora', icon: BookOpen },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* Sidebar para pantallas grandes (Desktop) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Wrench size={24} />
          <span>Bitácora TI</span>
        </div>

        <nav className="sidebar-nav">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            <strong>{user || 'Santiago'}</strong>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Técnico TI</div>
          </div>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={logout}
            title="Cerrar sesión"
            style={{ color: '#f87171', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Barra de navegación inferior para móviles */}
      <nav className="bottom-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
