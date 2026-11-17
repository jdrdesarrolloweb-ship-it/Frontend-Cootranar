import React, { useEffect, useState } from 'react';
import taquillaApiService from '../../../infrastructure/services/taquillaApi';

interface TiqueteAsiento {
  idtiquete: number;
  idasientoviaje?: number | null;
  codigotiquete: string | null;
  valorcobrado: string | number;
  fechaventa: string;
  estadofactura: string | null;
  nombre: string;
  apellido: string;
  tipodocumento: string | null;
  numerodocumento: string | null;
  correo: string | null;
  telefono: string | null;
  numeroasiento: number;
  piso: number;
  espoltrona: boolean;
  origentramo: string;
  destinotramo: string;
  formapago: string | null;
  vecesreprogramado: number;
}

interface Props {
  idViaje: number;
  idAsientoViaje: number;
  numeroAsiento: number;
  onCerrar: () => void;
}

const BLUE = '#0e3a8c';

const fmtCop = (v: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtFecha = (f: string) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Dato = ({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b', marginTop: 1 }}>{icono}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{etiqueta}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>{valor || '—'}</div>
    </div>
  </div>
);

/**
 * Información del cliente que compró un asiento ya vendido.
 * Un asiento puede tener varios tiquetes si se vendió por tramos distintos
 * (p. ej. Pasto→Túquerres y Túquerres→Tumaco); se muestran todos.
 */
export const ModalInfoAsientoVendido: React.FC<Props> = ({ idViaje, idAsientoViaje, numeroAsiento, onCerrar }) => {
  const [tiquetes, setTiquetes] = useState<TiqueteAsiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    taquillaApiService.obtenerTiquetesViaje(idViaje)
      .then((res: any) => {
        if (!activo) return;
        const todos: TiqueteAsiento[] = res?.data?.data?.tiquetes ?? [];
        // Algunas versiones del backend no devuelven idasientoviaje; el número de
        // asiento también es único dentro del viaje, así que sirve de respaldo.
        setTiquetes(todos.filter((t) =>
          t.idasientoviaje != null
            ? Number(t.idasientoviaje) === idAsientoViaje
            : Number(t.numeroasiento) === numeroAsiento
        ));
      })
      .catch((e: any) => activo && setError(e?.response?.data?.message || 'No se pudo cargar la información del asiento'))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [idViaje, idAsientoViaje, numeroAsiento]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  const verPdf = async (idTiquete: number) => {
    // Abrir la pestaña dentro del clic para que el navegador no la bloquee.
    const pestana = window.open('about:blank', '_blank');
    setDescargando(idTiquete);
    try {
      const res = await taquillaApiService.descargarPdfTiquete(idTiquete);
      const url = res.data?.data?.signedUrl;
      if (!url) throw new Error('El tiquete aún no tiene PDF generado');
      if (pestana) pestana.location.href = url; else window.open(url, '_blank');
    } catch (e: any) {
      pestana?.close();
      alert(e?.response?.data?.message || e?.message || 'No se pudo abrir el PDF');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onCerrar} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-asiento-vendido"
        style={{
          position: 'relative', background: '#fff', borderRadius: 16, width: 'min(560px, 100%)', maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            {String(numeroAsiento).padStart(2, '0')}
          </div>
          <div style={{ flex: 1 }}>
            <h3 id="titulo-asiento-vendido" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Asiento {numeroAsiento} · Vendido</h3>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>Información del cliente que lo compró</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          {cargando && <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Cargando…</p>}
          {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{error}</p>}
          {!cargando && !error && tiquetes.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>No se encontró un tiquete para este asiento.</p>
          )}

          {tiquetes.map((t, i) => (
            <div key={t.idtiquete} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginTop: i === 0 ? 0 : 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{t.nombre} {t.apellido}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>{t.origentramo} → {t.destinotramo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: BLUE }}>{fmtCop(t.valorcobrado)}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{t.formapago ?? '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <Dato icono="badge" etiqueta="Documento" valor={[t.tipodocumento, t.numerodocumento].filter(Boolean).join(' ')} />
                <Dato icono="call" etiqueta="Teléfono" valor={t.telefono} />
                <Dato icono="mail" etiqueta="Correo" valor={t.correo} />
                <Dato icono="confirmation_number" etiqueta="Tiquete" valor={t.codigotiquete ?? `#${t.idtiquete}`} />
                <Dato icono="event" etiqueta="Fecha de venta" valor={fmtFecha(t.fechaventa)} />
                <Dato icono="receipt_long" etiqueta="Factura" valor={t.estadofactura} />
                {t.espoltrona && <Dato icono="star" etiqueta="Asiento" valor="Poltrona" />}
                {Number(t.vecesreprogramado) > 0 && <Dato icono="history" etiqueta="Reprogramado" valor={`${t.vecesreprogramado} vez/veces`} />}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => verPdf(t.idtiquete)}
                  disabled={descargando === t.idtiquete}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                    border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 700,
                    cursor: descargando === t.idtiquete ? 'wait' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>picture_as_pdf</span>
                  {descargando === t.idtiquete ? 'Abriendo…' : 'Ver tiquete PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
