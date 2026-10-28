import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { TaskModal } from './components/TaskModal';
import { Lightbox } from './components/Lightbox';

import { HoyView } from './views/HoyView';
import { TableroView } from './views/TableroView';
import { ComprasView } from './views/ComprasView';
import { BitacoraView } from './views/BitacoraView';
import { ReportesView } from './views/ReportesView';
import { AjustesView } from './views/AjustesView';

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('hoy');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#38bdf8',
        fontWeight: 600,
        fontSize: '18px'
      }}>
        Cargando Bitácora TI...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleOpenTask = id => {
    setSelectedTaskId(id);
  };

  const handleCloseTask = () => {
    setSelectedTaskId(null);
  };

  const handleTaskUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTaskDeleted = () => {
    setSelectedTaskId(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleSelectPhoto = photo => {
    setSelectedPhoto(photo);
  };

  const handleClosePhoto = () => {
    setSelectedPhoto(null);
  };

  return (
    <div className="app-container">
      {/* Navegación (Sidebar en desktop, barra inferior en móvil) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <Header activeTab={activeTab} />

        <div key={refreshKey}>
          {activeTab === 'hoy' && (
            <HoyView
              onOpenTask={handleOpenTask}
              onSelectPhoto={handleSelectPhoto}
            />
          )}

          {activeTab === 'tablero' && (
            <TableroView
              onOpenTask={handleOpenTask}
            />
          )}

          {activeTab === 'compras' && (
            <ComprasView
              onOpenTask={handleOpenTask}
            />
          )}

          {activeTab === 'bitacora' && (
            <BitacoraView
              onSelectPhoto={handleSelectPhoto}
              onOpenTask={handleOpenTask}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              onSelectPhoto={handleSelectPhoto}
            />
          )}

          {activeTab === 'ajustes' && (
            <AjustesView />
          )}
        </div>
      </main>

      {/* Modal de Detalle y Edición de Tarea */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          onClose={handleCloseTask}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          onSelectPhoto={handleSelectPhoto}
        />
      )}

      {/* Lightbox para fotos en pantalla completa */}
      {selectedPhoto && (
        <Lightbox
          photo={selectedPhoto}
          onClose={handleClosePhoto}
        />
      )}
    </div>
  );
}

export default App;
