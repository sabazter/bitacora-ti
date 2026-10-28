import React from 'react';
import { X } from 'lucide-react';

export function Lightbox({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 300, backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div 
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -40,
            right: 0,
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={28} />
        </button>

        <img
          src={`/uploads/${photo.filename}`}
          alt={photo.caption || photo.original_name || 'Evidencia'}
          style={{
            maxWidth: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
        />

        {photo.caption && (
          <div style={{ marginTop: '0.75rem', color: '#ffffff', textAlign: 'center', fontSize: '15px' }}>
            {photo.caption}
          </div>
        )}
        <div style={{ marginTop: '0.25rem', color: '#94a3b8', fontSize: '12px' }}>
          {photo.created_at ? new Date(photo.created_at).toLocaleString() : ''}
        </div>
      </div>
    </div>
  );
}
