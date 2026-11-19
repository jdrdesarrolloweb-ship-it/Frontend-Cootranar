import { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Layout } from '../../components/layout/Layout';
import taquillaApiService from '../../../infrastructure/services/taquillaApi';
import { asientosApiService } from '../../../infrastructure/services/asientosApi';
import { ModalReprogramarTiquete } from '../../components/viajes/ModalReprogramarTiquete';
import {
  MapaAsientosGestionTiquetes,
  type AsientoGestionUI,
  type TiqueteEnAsiento,
} from '../../components/viajes/MapaAsientosGestionTiquetes';
import { formatFechaCalendario } from '../../../shared/utils/formatters';
import { DatePicker } from '@/components/ui/date-picker';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtFecha = (f: string) => formatFechaCalendario(f);

const fmtHora = (h: string) => {
  if (!h) return '—';
  const [hh, mm] = String(h).split(':').map(Number);
  if (Number.isNaN(hh)) return h;
  const p = hh >= 12 ? 'p.m.' : 'a.m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm || 0).padStart(2, '0')} ${p}`;
};

const fmtMoneda = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtDoc = (tipo?: string, num?: string) => `${tipo ?? ''} ${num ?? ''}`.trim() || '—';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ViajeResumen {
  idviaje: number;
  codigoviaje?: string;
  nombreruta?: string;
  ciudadorigen: string;
  ciudaddestino: string;
  nombreagenciaorigen?: string;
  nombreagenciadestino?: string;
  fechasalida: string;
  horasalida: string;
  numeromovil: string;
  placa: string;
  nombretipobus: string;
  asientoslibres: number;
  totalasientos: number;
  asientoslibrestramo?: number;
  tipoResultado?: 'DIRECTO' | 'DE_PASO';
  idruta?: number;
  idtipobus?: number;
  distribucionasientos?: unknown;
}

interface Tiquete extends TiqueteEnAsiento {
  estado?: string;
  valorcobrado: number;
  formapago?: string;
  fechaventa?: string;
  idusuario?: number;
  correo?: string;
  telefono?: string;
  urlpdf?: string | null;
  vecesreprogramado?: number;
  fechaultimareprogramacion?: string | null;
}

// ── Modal de Detalle del Cliente y Tiquete ────────────────────────────────────
function ModalDetalleCliente({
  tiquete,
  viaje,
  onClose,
  onValidar,
  validando,
  onDescargarPdf,
  descargandoPdfId,
  onReprogramar,
  onLiberarInasistencia,
  liberandoInasistencia,
}: {
  tiquete: Tiquete;
  viaje: ViajeResumen | null;
  onClose: () => void;
  onValidar: (t: Tiquete) => void;
  validando: boolean;
  onDescargarPdf: (t: Tiquete) => void;
  descargandoPdfId: number | null;
  onReprogramar: (t: Tiquete) => void;
  onLiberarInasistencia: (t: Tiquete) => void;
  liberandoInasistencia: boolean;
}) {
  const descargando = descargandoPdfId === tiquete.idtiquete;
  const esValido = Boolean(tiquete.validado);
  const [confirmandoLiberar, setConfirmandoLiberar] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.58)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Franja superior corporativa */}
        <div
          style={{
            height: '6px',
            width: '100%',
            background: 'linear-gradient(90deg, #0e3a8c 0%, #1d4ed8 55%, #c62828 100%)',
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#0e3a8c',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.85, lineHeight: 1 }}>
                Silla
              </span>
              <span style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.15 }}>
                {tiquete.numeroasiento}
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {tiquete.codigotiquete || `Tiquete #${tiquete.idtiquete}`}
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: esValido ? '#dcfce7' : '#fef3c7',
                    color: esValido ? '#166534' : '#92400e',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: esValido ? '#16a34a' : '#f59e0b',
                    }}
                  />
                  {esValido ? 'Validado' : 'Pendiente'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                Piso {tiquete.piso || 1}
                {tiquete.espoltrona ? ' · Poltrona VIP' : ' · Estándar'}
                {viaje ? ` · Móvil ${viaje.numeromovil} (${viaje.placa})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '20px 24px', maxHeight: '68vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Información del Pasajero */}
          <div
            style={{
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              padding: '16px',
            }}
          >
            <p
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#0e3a8c',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>person</span>
              Información del Pasajero
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '12px' }}>
              <div className="sm:col-span-2">
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Nombre completo
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  {`${tiquete.nombre ?? ''} ${tiquete.apellido ?? ''}`.trim() || 'Sin nombre registrado'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Documento
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>
                  {fmtDoc(tiquete.tipodocumento, tiquete.numerodocumento)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Teléfono
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {tiquete.telefono || 'No registrado'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Correo electrónico
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', wordBreak: 'break-all' }}>
                  {tiquete.correo || 'No registrado'}
                </span>
              </div>
            </div>
          </div>

          {/* Información del Tramo y Pago */}
          <div
            style={{
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              padding: '16px',
            }}
          >
            <p
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#0e3a8c',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>confirmation_number</span>
              Detalle del Tiquete
            </p>

            {/* Tramo visual */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '14px',
              }}
            >
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                {tiquete.origentramo || viaje?.ciudadorigen || 'Origen'}
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#c62828', margin: '0 auto' }}>
                arrow_forward
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                {tiquete.destinotramo || viaje?.ciudaddestino || 'Destino'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Valor pagado
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0e3a8c' }}>
                  {fmtMoneda(tiquete.valorcobrado)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Forma de pago
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {tiquete.formapago || 'CONTADO'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  Hora salida
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                  {viaje ? fmtHora(viaje.horasalida) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmación de liberación por inasistencia */}
          {confirmandoLiberar && (
            <div
              style={{
                borderRadius: '14px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#c62828', fontSize: '20px', flexShrink: 0 }}>
                  person_off
                </span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', margin: '0 0 3px' }}>
                    ¿Liberar el Asiento #{tiquete.numeroasiento} por inasistencia?
                  </p>
                  <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0, lineHeight: 1.4 }}>
                    El pasajero no se presentó a tiempo. El asiento quedará <strong>LIBRE</strong> inmediatamente para que la empresa pueda revenderlo en taquilla o plataforma.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmandoLiberar(false)}
                  disabled={liberandoInasistencia}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onLiberarInasistencia(tiquete)}
                  disabled={liberandoInasistencia}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: '#c62828',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: liberandoInasistencia ? 'not-allowed' : 'pointer',
                    opacity: liberandoInasistencia ? 0.65 : 1,
                  }}
                >
                  <span className={`material-symbols-outlined ${liberandoInasistencia ? 'animate-spin' : ''}`} style={{ fontSize: '15px' }}>
                    {liberandoInasistencia ? 'progress_activity' : 'event_seat'}
                  </span>
                  <span>{liberandoInasistencia ? 'Liberando...' : 'Sí, liberar para reventa'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => onDescargarPdf(tiquete)}
            disabled={!tiquete.urlpdf || descargando}
            style={{
              flex: '1 1 155px',
              padding: '10px 14px',
              borderRadius: '11px',
              border: 'none',
              background: '#0e3a8c',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: !tiquete.urlpdf || descargando ? 'not-allowed' : 'pointer',
              opacity: !tiquete.urlpdf || descargando ? 0.55 : 1,
            }}
            title={tiquete.urlpdf ? 'Descargar copia PDF del tiquete' : 'PDF no disponible para este tiquete'}
          >
            <span className={`material-symbols-outlined ${descargando ? 'animate-spin' : ''}`} style={{ fontSize: '17px' }}>
              {descargando ? 'progress_activity' : 'download'}
            </span>
            <span>{descargando ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onReprogramar(tiquete);
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '11px',
              border: '1px solid #f59e0b',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>event_repeat</span>
            <span>Reprogramar</span>
          </button>

          {/* Un pasajero ya validado como abordado no puede marcarse como inasistencia */}
          {!esValido && (
          <button
            type="button"
            onClick={() => setConfirmandoLiberar(true)}
            disabled={liberandoInasistencia}
            style={{
              padding: '10px 14px',
              borderRadius: '11px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#c62828',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Liberar el asiento para poder revenderlo porque el pasajero no asistió a tiempo"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>person_off</span>
            <span>No asistió (Liberar)</span>
          </button>
          )}

          {!esValido && (
            <button
              type="button"
              onClick={() => onValidar(tiquete)}
              disabled={validando}
              style={{
                padding: '10px 14px',
                borderRadius: '11px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: validando ? 'not-allowed' : 'pointer',
                opacity: validando ? 0.65 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>verified</span>
              <span>{validando ? 'Validando...' : 'Validar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ── Página Principal: Gestión de Tiquetes (Flujo 2 Pantallas) ─────────────────
export const GestionTiquetesPage = () => {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [numeroTiquete, setNumeroTiquete] = useState('');

  const [viajes, setViajes] = useState<ViajeResumen[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(false);
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ViajeResumen | null>(null);

  const [tiquetes, setTiquetes] = useState<Tiquete[]>([]);
  const [asientosBus, setAsientosBus] = useState<AsientoGestionUI[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [filtroPasajero, setFiltroPasajero] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'validado'>('todos');

  const [tiqueteDetalle, setTiqueteDetalle] = useState<Tiquete | null>(null);
  const [tiqueteReprogramar, setTiqueteReprogramar] = useState<Tiquete | null>(null);
  const [validando, setValidando] = useState(false);
  const [liberandoInasistencia, setLiberandoInasistencia] = useState(false);
  const [descargandoPdfId, setDescargandoPdfId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const mostrarToast = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleAbrirDetalleViaje = useCallback(async (viaje: ViajeResumen, busquedaInicial?: string) => {
    setViajeSeleccionado(viaje);
    setFiltroPasajero(busquedaInicial ?? '');
    setFiltroEstado('todos');
    setTiquetes([]);
    setAsientosBus([]);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    try {
      const [resTiquetes, resAsientos] = await Promise.all([
        taquillaApiService.obtenerTiquetesViaje(viaje.idviaje),
        asientosApiService.obtenerAsientosViaje(viaje.idviaje).catch(() => null),
      ]);

      const listaTiquetes: Tiquete[] = resTiquetes.data?.data?.tiquetes || resTiquetes.data?.tiquetes || [];
      setTiquetes(listaTiquetes);

      const listaAsientos: AsientoGestionUI[] =
        resAsientos?.data?.data?.asientos || resAsientos?.data?.asientos || [];
      setAsientosBus(listaAsientos);
    } catch (err: any) {
      setErrorDetalle(err?.response?.data?.message || 'Error al cargar la información del viaje.');
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  const handleBuscarViajes = useCallback(
    async (paramsOverride?: { ciudadorigen?: string; ciudaddestino?: string; fecha?: string; numerotiquete?: string }) => {
      setCargandoViajes(true);
      setViajeSeleccionado(null);
      try {
        const params = paramsOverride ?? {
          ciudadorigen: origen.trim() || undefined,
          ciudaddestino: destino.trim() || undefined,
          fecha: fecha || undefined,
          numerotiquete: numeroTiquete.trim() || undefined,
        };
        const res = await taquillaApiService.buscarViajes(params);
        const encontrados: ViajeResumen[] = res.data?.data?.viajes || [];
        setViajes(encontrados);

        if (params.numerotiquete && encontrados.length === 1) {
          handleAbrirDetalleViaje(encontrados[0], params.numerotiquete);
        }
      } catch (err: any) {
        mostrarToast('error', err?.response?.data?.message || 'Error al buscar viajes.');
      } finally {
        setCargandoViajes(false);
      }
    },
    [origen, destino, fecha, numeroTiquete, handleAbrirDetalleViaje, mostrarToast]
  );

  useEffect(() => {
    handleBuscarViajes({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLimpiarFiltros = () => {
    setOrigen('');
    setDestino('');
    setFecha('');
    setNumeroTiquete('');
    handleBuscarViajes({});
  };

  const handleValidar = useCallback(
    async (t: Tiquete) => {
      setValidando(true);
      try {
        // Antes solo se marcaba en pantalla y no se guardaba: ahora se registra el abordaje
        // en el backend, que además acredita las millas del pasajero.
        const res = await taquillaApiService.validarAbordaje(t.idtiquete);
        setTiquetes((prev) =>
          prev.map((tk) => (tk.idtiquete === t.idtiquete ? { ...tk, validado: true } : tk))
        );
        setTiqueteDetalle((prev) =>
          prev && prev.idtiquete === t.idtiquete ? { ...prev, validado: true } : prev
        );
        mostrarToast('ok', res.data?.message || `Abordaje del asiento #${t.numeroasiento} validado.`);
      } catch (err: any) {
        mostrarToast('error', err?.response?.data?.message || 'No se pudo validar la reserva.');
      } finally {
        setValidando(false);
      }
    },
    [mostrarToast]
  );

  const handleDescargarPdf = useCallback(
    async (t: Tiquete) => {
      if (!t.urlpdf) {
        mostrarToast('error', 'Este tiquete aún no tiene un PDF generado.');
        return;
      }
      setDescargandoPdfId(t.idtiquete);
      try {
        const res = await taquillaApiService.descargarPdfTiquete(t.idtiquete);
        const signedUrl = res.data?.data?.signedUrl;
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          mostrarToast('error', 'No se pudo generar el enlace de descarga del PDF.');
        }
      } catch (err: any) {
        mostrarToast('error', err?.response?.data?.message || 'Error al descargar el PDF del tiquete.');
      } finally {
        setDescargandoPdfId(null);
      }
    },
    [mostrarToast]
  );

  const handleReprogramacionExitosa = useCallback(
    (mensaje: string) => {
      setTiqueteReprogramar(null);
      mostrarToast('ok', mensaje);
      if (viajeSeleccionado) handleAbrirDetalleViaje(viajeSeleccionado, filtroPasajero);
    },
    [viajeSeleccionado, filtroPasajero, handleAbrirDetalleViaje, mostrarToast]
  );

  const handleLiberarInasistencia = useCallback(
    async (t: Tiquete) => {
      setLiberandoInasistencia(true);
      try {
        await taquillaApiService.liberarAsientoInasistencia(t.idtiquete);
        setTiqueteDetalle(null);
        mostrarToast(
          'ok',
          `Asiento #${t.numeroasiento} liberado por inasistencia. Ya está disponible para revenderlo.`
        );
        if (viajeSeleccionado) {
          await handleAbrirDetalleViaje(viajeSeleccionado, filtroPasajero);
        }
      } catch (err: any) {
        mostrarToast(
          'error',
          err?.response?.data?.message || 'No se pudo liberar el asiento por inasistencia.'
        );
      } finally {
        setLiberandoInasistencia(false);
      }
    },
    [viajeSeleccionado, filtroPasajero, handleAbrirDetalleViaje, mostrarToast]
  );

  const hayBusquedaPasajero = filtroPasajero.trim().length > 0;

  const tiquetesFiltrados = useMemo(() => {
    const q = filtroPasajero.trim().toLowerCase();
    return tiquetes.filter((t) => {
      const nombreCompleto = `${t.nombre ?? ''} ${t.apellido ?? ''}`.toLowerCase();
      const matchTexto =
        !q ||
        nombreCompleto.includes(q) ||
        String(t.numerodocumento ?? '').toLowerCase().includes(q) ||
        String(t.codigotiquete ?? '').toLowerCase().includes(q) ||
        String(t.numeroasiento).includes(q);

      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'validado' && Boolean(t.validado)) ||
        (filtroEstado === 'pendiente' && !t.validado);

      return matchTexto && matchEstado;
    });
  }, [tiquetes, filtroPasajero, filtroEstado]);

  const tiquetesResaltadosIds = useMemo(() => {
    if (!hayBusquedaPasajero) return new Set<number>();
    return new Set(tiquetesFiltrados.map((t) => t.idtiquete));
  }, [hayBusquedaPasajero, tiquetesFiltrados]);

  const totalTiquetes = tiquetes.length;
  const totalValidados = tiquetes.filter((t) => t.validado).length;
  const totalPendientes = totalTiquetes - totalValidados;
  const ingresoTotal = tiquetes.reduce((acc, t) => acc + Number(t.valorcobrado || 0), 0);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#64748b',
    marginBottom: '6px',
  };

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <Layout>
      {/* Toast de retroalimentación */}
      {toast && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `1px solid ${toast.tipo === 'ok' ? '#86efac' : '#fca5a5'}`,
            background: toast.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
            color: toast.tipo === 'ok' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: 700,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.tipo === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.texto}</span>
        </div>
      )}

      {/* =====================================================================
          PANTALLA 1: BUSCADOR DE VIAJES + LISTADO DE VIAJES CON "VER DETALLES"
         ===================================================================== */}
      {!viajeSeleccionado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Filtros de Búsqueda */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '22px 24px',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#0e3a8c', fontSize: '20px' }}>
                    travel_explore
                  </span>
                  Buscar Viajes Programados
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                  Filtra los viajes por origen, destino, fecha o número de tiquete y entra a ver el mapa de asientos.
                </p>
              </div>
              {(origen || destino || fecha || numeroTiquete) && (
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#c62828',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt_off</span>
                  Limpiar filtros
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBuscarViajes();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end"
              style={{ gap: '14px' }}
            >
              <div className="lg:col-span-3">
                <label style={labelStyle}>Ciudad Origen</label>
                <div style={{ position: 'relative' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '18px',
                      pointerEvents: 'none',
                    }}
                  >
                    trip_origin
                  </span>
                  <input
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="Ej: Pasto"
                    style={{ ...inputBaseStyle, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label style={labelStyle}>Ciudad Destino</label>
                <div style={{ position: 'relative' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '18px',
                      pointerEvents: 'none',
                    }}
                  >
                    location_on
                  </span>
                  <input
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej: Medellín"
                    style={{ ...inputBaseStyle, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label style={labelStyle}>Fecha de Salida</label>
                <DatePicker
                  value={fecha}
                  onChange={setFecha}
                  inputClassName="h-[40px] text-sm rounded-[10px]"
                  placeholder="Todas"
                />
              </div>

              <div className="lg:col-span-2">
                <label style={labelStyle}>N° de Tiquete</label>
                <input
                  value={numeroTiquete}
                  onChange={(e) => setNumeroTiquete(e.target.value)}
                  placeholder="SETP..."
                  style={inputBaseStyle}
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={cargandoViajes}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0e3a8c',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: cargandoViajes ? 'not-allowed' : 'pointer',
                    opacity: cargandoViajes ? 0.65 : 1,
                    boxShadow: '0 4px 10px rgba(14, 58, 140, 0.2)',
                  }}
                >
                  <span className={`material-symbols-outlined ${cargandoViajes ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
                    {cargandoViajes ? 'progress_activity' : 'search'}
                  </span>
                  <span>{cargandoViajes ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Encabezado de Resultados */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {cargandoViajes
                ? 'Buscando viajes...'
                : `${viajes.length} ${viajes.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}`}
            </h3>
            <button
              type="button"
              onClick={() => handleBuscarViajes()}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0e3a8c',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
              Actualizar lista
            </button>
          </div>

          {/* Lista de Viajes en Tarjetas Responsive */}
          {cargandoViajes ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '60px 24px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '36px', color: '#0e3a8c', display: 'block', marginBottom: '10px' }}>
                progress_activity
              </span>
              <p style={{ fontSize: '13.5px', fontWeight: 600 }}>Cargando viajes disponibles...</p>
            </div>
          ) : viajes.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '60px 24px',
                textAlign: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                directions_bus
              </span>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                No se encontraron viajes
              </h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Prueba con otra ciudad, fecha o limpia los filtros para ver todos los viajes programados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '16px' }}>
              {viajes.map((v) => {
                const libres = Number(v.asientoslibrestramo ?? v.asientoslibres ?? 0);
                const total = Number(v.totalasientos ?? 0);
                const ocupados = Math.max(total - libres, 0);
                const pct = total > 0 ? Math.min(Math.round((ocupados / total) * 100), 100) : 0;
                const barHex = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
                const labelOrigen = v.nombreagenciaorigen || `Terminal ${v.ciudadorigen}`;
                const labelDestino = v.nombreagenciadestino || `Terminal ${v.ciudaddestino}`;

                return (
                  <div
                    key={v.idviaje}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '20px 22px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    {/* Ruta visual: Terminal Origen ---> Terminal Destino */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '14px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '999px',
                            background: '#eff6ff',
                            color: '#0e3a8c',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>calendar_today</span>
                          {fmtFecha(v.fechasalida)} · {fmtHora(v.horasalida)}
                        </span>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#475569',
                          }}
                        >
                          {v.nombretipobus}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                            Origen
                          </span>
                          <p style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {labelOrigen}
                          </p>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: '48px', padding: '0 6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0e3a8c', flexShrink: 0 }} />
                          <div style={{ flex: 1, borderTop: '2px dashed #cbd5e1' }} />
                          <span className="material-symbols-outlined" style={{ color: '#c62828', fontSize: '19px', flexShrink: 0 }}>
                            arrow_forward
                          </span>
                        </div>

                        <div style={{ minWidth: 0, textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                            Destino
                          </span>
                          <p style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {labelDestino}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info del Bus + Ocupación + Botón Ver Detalles */}
                    <div
                      style={{
                        paddingTop: '14px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0e3a8c' }}>directions_bus</span>
                            Móvil {v.numeromovil}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94a3b8' }}>badge</span>
                            {v.placa}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '260px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: barHex, borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                            {ocupados} vendidos · <strong style={{ color: '#16a34a' }}>{libres} libres</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAbrirDetalleViaje(v)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '11px',
                          border: 'none',
                          background: '#0e3a8c',
                          color: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          cursor: 'pointer',
                          boxShadow: '0 3px 8px rgba(14, 58, 140, 0.2)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>event_seat</span>
                        <span>Ver detalles</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PANTALLA 2: INFORMACIÓN DEL BUS + MAPA DE ASIENTOS + BUSCADOR CLIENTE
         ===================================================================== */}
      {viajeSeleccionado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barra superior de regreso y actualización */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setViajeSeleccionado(null);
                setFiltroPasajero('');
                setTiqueteDetalle(null);
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '11px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_back</span>
              <span>Volver a Viajes</span>
            </button>

            <button
              type="button"
              onClick={() => handleAbrirDetalleViaje(viajeSeleccionado, filtroPasajero)}
              disabled={cargandoDetalle}
              style={{
                padding: '9px 16px',
                borderRadius: '11px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0e3a8c',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <span className={`material-symbols-outlined ${cargandoDetalle ? 'animate-spin' : ''}`} style={{ fontSize: '17px' }}>
                refresh
              </span>
              <span>Actualizar mapa</span>
            </button>
          </div>

          {/* Tarjeta de Información del Bus y KPIs del Viaje */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: '5px', background: 'linear-gradient(90deg, #0e3a8c 0%, #1d4ed8 55%, #c62828 100%)' }} />
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              {/* Info Bus y Ruta */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 11px',
                      borderRadius: '999px',
                      background: '#eff6ff',
                      color: '#0e3a8c',
                      fontSize: '11.5px',
                      fontWeight: 800,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>directions_bus</span>
                    Móvil {viajeSeleccionado.numeromovil}
                  </span>
                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: '999px',
                      background: '#f1f5f9',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {viajeSeleccionado.placa}
                  </span>
                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: '999px',
                      background: '#fef2f2',
                      color: '#c62828',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    {viajeSeleccionado.nombretipobus}
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: '19px',
                    fontWeight: 900,
                    color: '#0f172a',
                    margin: '0 0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{viajeSeleccionado.nombreagenciaorigen || `Terminal ${viajeSeleccionado.ciudadorigen}`}</span>
                  <span className="material-symbols-outlined" style={{ color: '#c62828', fontSize: '21px' }}>
                    arrow_forward
                  </span>
                  <span>{viajeSeleccionado.nombreagenciadestino || `Terminal ${viajeSeleccionado.ciudaddestino}`}</span>
                </h2>

                <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', margin: 0 }}>
                  {fmtFecha(viajeSeleccionado.fechasalida)} · Salida {fmtHora(viajeSeleccionado.horasalida)} · Capacidad{' '}
                  {viajeSeleccionado.totalasientos} sillas
                </p>
              </div>

              {/* 4 KPIs compactos */}
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '10px' }}>
                <div style={{ padding: '10px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                    Tiquetes
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{totalTiquetes}</span>
                </div>
                <div style={{ padding: '10px 16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#15803d', display: 'block' }}>
                    Validados
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>{totalValidados}</span>
                </div>
                <div style={{ padding: '10px 16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#b45309', display: 'block' }}>
                    Pendientes
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#b45309' }}>{totalPendientes}</span>
                </div>
                <div style={{ padding: '10px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#0e3a8c', display: 'block' }}>
                    Ingreso
                  </span>
                  <span style={{ fontSize: '17px', fontWeight: 900, color: '#0e3a8c' }}>{fmtMoneda(ingresoTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error al cargar */}
          {errorDetalle && (
            <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">error</span>
              <span>{errorDetalle}</span>
            </div>
          )}

          {/* Grid Principal: Mapa de Asientos (Izq) + Buscador y Pasajeros (Der) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '22px' }}>
            {/* ── Columna Izquierda: Diseñador / Mapa Interactivo de Asientos ── */}
            <div
              className="lg:col-span-5"
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '22px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#0e3a8c', fontSize: '19px' }}>
                    event_seat
                  </span>
                  Mapa de Asientos del Bus
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Haz clic sobre cualquier asiento ocupado para ver el cliente y descargar su tiquete.
                </p>
              </div>

              <MapaAsientosGestionTiquetes
                viaje={viajeSeleccionado}
                asientos={asientosBus}
                tiquetes={tiquetes}
                tiquetesResaltadosIds={tiquetesResaltadosIds}
                hayBusquedaActiva={hayBusquedaPasajero}
                onClickAsientoOcupado={(t) => {
                  const completo = tiquetes.find((tk) => tk.idtiquete === t.idtiquete) || (t as Tiquete);
                  setTiqueteDetalle(completo);
                }}
                cargando={cargandoDetalle}
              />
            </div>

            {/* ── Columna Derecha: Buscador por Nombre o Cédula + Pasajeros ── */}
            <div className="lg:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Buscador destacado de Pasajero */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px 22px',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#c62828', fontSize: '19px' }}>
                      person_search
                    </span>
                    Ubicar Pasajero en el Bus
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Escribe el nombre o número de cédula para resaltar automáticamente su asiento en el mapa.
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        position: 'absolute',
                        left: '13px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        fontSize: '19px',
                        pointerEvents: 'none',
                      }}
                    >
                      search
                    </span>
                    <input
                      value={filtroPasajero}
                      onChange={(e) => setFiltroPasajero(e.target.value)}
                      placeholder="Buscar por nombre, cédula o N° de tiquete..."
                      style={{ ...inputBaseStyle, height: '42px', paddingLeft: '40px', paddingRight: '34px' }}
                    />
                    {filtroPasajero && (
                      <button
                        type="button"
                        onClick={() => setFiltroPasajero('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#e2e8f0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        aria-label="Limpiar búsqueda"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro de estado */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '11px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'pendiente', label: 'Pendientes' },
                        { id: 'validado', label: 'Validados' },
                      ] as const
                    ).map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setFiltroEstado(op.id)}
                        style={{
                          padding: '7px 13px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: filtroEstado === op.id ? '#0e3a8c' : 'transparent',
                          color: filtroEstado === op.id ? '#ffffff' : '#475569',
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner cuando hay coincidencias en el mapa */}
                {hayBusquedaPasajero && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '11px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: tiquetesFiltrados.length > 0 ? '#fef2f2' : '#f1f5f9',
                      border: `1px solid ${tiquetesFiltrados.length > 0 ? '#fecaca' : '#e2e8f0'}`,
                      color: tiquetesFiltrados.length > 0 ? '#c62828' : '#64748b',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {tiquetesFiltrados.length > 0 ? 'location_searching' : 'search_off'}
                    </span>
                    {tiquetesFiltrados.length > 0 ? (
                      <span>
                        {tiquetesFiltrados.length === 1
                          ? `Pasajero ubicado en el Asiento #${tiquetesFiltrados[0].numeroasiento} (resaltado en rojo en el bus).`
                          : `${tiquetesFiltrados.length} pasajeros ubicados (resaltados en rojo en los asientos ${tiquetesFiltrados
                              .map((t) => `#${t.numeroasiento}`)
                              .join(', ')}).`}
                      </span>
                    ) : (
                      <span>No se encontró ningún pasajero con "{filtroPasajero}" en este viaje.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Pasajeros del Viaje */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
                    Pasajeros con Tiquete ({tiquetesFiltrados.length})
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                    Clic para ver detalle y descargar PDF
                  </span>
                </div>

                {cargandoDetalle ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                    Cargando pasajeros...
                  </div>
                ) : tiquetesFiltrados.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                      airline_seat_recline_normal
                    </span>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#475569', margin: 0 }}>
                      {tiquetes.length === 0
                        ? 'Aún no hay tiquetes vendidos en este viaje'
                        : 'Sin pasajeros que coincidan con el filtro'}
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                    {tiquetesFiltrados.map((t, idx) => {
                      const resaltado = hayBusquedaPasajero && tiquetesResaltadosIds.has(t.idtiquete);
                      const esValido = Boolean(t.validado);

                      return (
                        <div
                          key={t.idtiquete}
                          onClick={() => setTiqueteDetalle(t)}
                          style={{
                            padding: '14px 20px',
                            borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                            background: resaltado ? '#fef2f2' : '#ffffff',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: '1 1 220px' }}>
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: resaltado ? '#c62828' : esValido ? '#16a34a' : '#0e3a8c',
                                color: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.85, lineHeight: 1 }}>
                                Silla
                              </span>
                              <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.15 }}>
                                {t.numeroasiento}
                              </span>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <p style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
                                  {`${t.nombre ?? ''} ${t.apellido ?? ''}`.trim() || 'Pasajero'}
                                </p>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: esValido ? '#dcfce7' : '#fef3c7',
                                    color: esValido ? '#166534' : '#92400e',
                                  }}
                                >
                                  {esValido ? 'Validado' : 'Pendiente'}
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {fmtDoc(t.tipodocumento, t.numerodocumento)}
                                </span>
                                {' · '}
                                <span>
                                  {t.origentramo || viajeSeleccionado.ciudadorigen} →{' '}
                                  {t.destinotramo || viajeSeleccionado.ciudaddestino}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'block' }}>
                                {fmtMoneda(t.valorcobrado)}
                              </span>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8' }}>
                                {t.codigotiquete || `#${t.idtiquete}`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTiqueteDetalle(t);
                              }}
                              style={{
                                padding: '7px 14px',
                                borderRadius: '9px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#0e3a8c',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Ver tiquete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Información del Cliente y Descarga de Tiquete */}
      {tiqueteDetalle && (
        <ModalDetalleCliente
          tiquete={tiqueteDetalle}
          viaje={viajeSeleccionado}
          onClose={() => setTiqueteDetalle(null)}
          onValidar={handleValidar}
          validando={validando}
          onDescargarPdf={handleDescargarPdf}
          descargandoPdfId={descargandoPdfId}
          onReprogramar={setTiqueteReprogramar}
          onLiberarInasistencia={handleLiberarInasistencia}
          liberandoInasistencia={liberandoInasistencia}
        />
      )}

      {/* Modal de Reprogramación */}
      {tiqueteReprogramar && (
        <ModalReprogramarTiquete
          tiquete={tiqueteReprogramar}
          viajeActual={viajeSeleccionado}
          onClose={() => setTiqueteReprogramar(null)}
          onExito={handleReprogramacionExitosa}
        />
      )}
    </Layout>
  );
};

export default GestionTiquetesPage;
