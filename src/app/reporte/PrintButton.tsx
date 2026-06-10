'use client';
export function PrintButton() {
  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      🖨 Imprimir / PDF
    </button>
  );
}
