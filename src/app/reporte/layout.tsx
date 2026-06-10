export const metadata = { title: 'Reporte de Participación — Quiniela Evolve 2026' };

export default function ReporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { overflow: auto !important; height: auto !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                 background: #f1f5f9; color: #1e293b; min-height: 100vh; }
          @media print {
            body { background: #fff; }
            .no-print { display: none !important; }
            .group-card { break-inside: avoid; }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
