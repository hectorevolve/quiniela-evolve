'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040B15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
          Error en el panel de administración
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Puedes intentar recargar la sección.
        </div>

        {error.message && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#fca5a5',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          }}>
            {error.message}
            {error.stack && (
              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>
                {error.stack.split('\n').slice(1, 5).join('\n')}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 9,
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 9,
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
