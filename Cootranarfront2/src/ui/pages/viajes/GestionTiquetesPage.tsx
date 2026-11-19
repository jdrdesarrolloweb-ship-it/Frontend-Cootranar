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

// ── Modal de Detalle del Cliente y Tiquete (Portal limpio sobre toda la UI) ───
function ModalDetalleCliente({
  tiquete,
  viaje,
  onClose,
  onValidar,
  validando,
  onDescargarPdf,
  descargandoPdfId,
  onReprogramar,
}: {
  tiquete: Tiquete;
  viaje: ViajeResumen | null;
  onClose: () => void;
  onValidar: (t: Tiquete) => void;
  validando: boolean;
  onDescargarPdf: (t: Tiquete) => void;
  descargandoPdfId: number | null;
  onReprogramar: (t: Tiquete) => void;
}) {
  const descargando = descargandoPdfId === tiquete.idtiquete;
  const esValido = Boolean(tiquete.validado);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Franja superior corporativa */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0e3a8c] via-[#1d4ed8] to-[#c62828]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0e3a8c] text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-none">Silla</span>
              <span className="text-lg font-black leading-tight">{tiquete.numeroasiento}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {tiquete.codigotiquete || `Tiquete #${tiquete.idtiquete}`}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                    esValido
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${esValido ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                  {esValido ? 'Validado' : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Piso {tiquete.piso || 1}
                {tiquete.espoltrona ? ' · Poltrona VIP' : ' · Estándar'}
                {viaje ? ` · Móvil ${viaje.numeromovil} (${viaje.placa})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Información del Pasajero */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0e3a8c] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">person</span>
              Información del Pasajero
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Nombre completo</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {`${tiquete.nombre ?? ''} ${tiquete.apellido ?? ''}`.trim() || 'Sin nombre registrado'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Documento</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                  {fmtDoc(tiquete.tipodocumento, tiquete.numerodocumento)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Teléfono</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {tiquete.telefono || 'No registrado'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Correo electrónico</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs break-all">
                  {tiquete.correo || 'No registrado'}
                </span>
              </div>
            </div>
          </div>

          {/* Información del Tramo y Pago */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0e3a8c] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">confirmation_number</span>
              Detalle del Tiquete
            </p>

            {/* Tramo visual */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {tiquete.origentramo || viaje?.ciudadorigen || 'Origen'}
              </span>
              <span className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 relative mx-1">
                <span className="material-symbols-outlined text-sm text-[#0e3a8c] dark:text-blue-400 absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-50 dark:bg-slate-800 px-1">
                  arrow_forward
                </span>
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 text-right">
                {tiquete.destinotramo || viaje?.ciudaddestino || 'Destino'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Valor pagado</span>
                <span className="text-base font-black text-[#0e3a8c] dark:text-blue-400">
                  {fmtMoneda(tiquete.valorcobrado)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Forma de pago</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">
                  {tiquete.formapago || 'CONTADO'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Salida</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {viaje ? fmtHora(viaje.horasalida) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => onDescargarPdf(tiquete)}
            disabled={!tiquete.urlpdf || descargando}
            className="flex-1 min-w-[155px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c62828] hover:bg-[#a61d1d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title={tiquete.urlpdf ? 'Descargar copia PDF del tiquete' : 'PDF no disponible para este tiquete'}
          >
            <span className={`material-symbols-outlined text-base ${descargando ? 'animate-spin' : ''}`}>
              {descargando ? 'progress_activity' : 'download'}
            </span>
            <span>{descargando ? 'Generando PDF...' : 'Descargar Tiquete'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onReprogramar(tiquete);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">event_repeat</span>
            <span>Reprogramar</span>
          </button>

          {!esValido && (
            <button
              type="button"
              onClick={() => onValidar(tiquete)}
              disabled={validando}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0e3a8c] hover:bg-[#092966] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">verified</span>
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
  // Filtros pantalla 1 (Viajes)
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [numeroTiquete, setNumeroTiquete] = useState('');

  // Estado viajes
  const [viajes, setViajes] = useState<ViajeResumen[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(false);
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ViajeResumen | null>(null);

  // Estado detalle del viaje (tiquetes + asientos del bus)
  const [tiquetes, setTiquetes] = useState<Tiquete[]>([]);
  const [asientosBus, setAsientosBus] = useState<AsientoGestionUI[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Buscador de cliente dentro del bus (por nombre o cédula)
  const [filtroPasajero, setFiltroPasajero] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'validado'>('todos');

  // Modales y acciones
  const [tiqueteDetalle, setTiqueteDetalle] = useState<Tiquete | null>(null);
  const [tiqueteReprogramar, setTiqueteReprogramar] = useState<Tiquete | null>(null);
  const [validando, setValidando] = useState(false);
  const [descargandoPdfId, setDescargandoPdfId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const mostrarToast = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Abrir Pantalla 2: Detalle del viaje + mapa de asientos ────────────────
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

  // ── Buscar viajes (Pantalla 1) ────────────────────────────────────────────
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

        // Si se buscó por N° de tiquete y hay 1 viaje, abrir directo el mapa de asientos resaltando el cliente
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

  // Cargar viajes disponibles al montar la página
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

  // ── Validar tiquete ───────────────────────────────────────────────────────
  const handleValidar = useCallback(
    async (t: Tiquete) => {
      setValidando(true);
      try {
        setTiquetes((prev) =>
          prev.map((tk) => (tk.idtiquete === t.idtiquete ? { ...tk, validado: true } : tk))
        );
        setTiqueteDetalle((prev) =>
          prev && prev.idtiquete === t.idtiquete ? { ...prev, validado: true } : prev
        );
        mostrarToast('ok', `Reserva del asiento #${t.numeroasiento} validada exitosamente.`);
      } catch (err: any) {
        mostrarToast('error', err?.response?.data?.message || 'No se pudo validar la reserva.');
      } finally {
        setValidando(false);
      }
    },
    [mostrarToast]
  );

  // ── Descargar PDF del tiquete ─────────────────────────────────────────────
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

  // ── Reprogramación exitosa ────────────────────────────────────────────────
  const handleReprogramacionExitosa = useCallback(
    (mensaje: string) => {
      setTiqueteReprogramar(null);
      mostrarToast('ok', mensaje);
      if (viajeSeleccionado) handleAbrirDetalleViaje(viajeSeleccionado, filtroPasajero);
    },
    [viajeSeleccionado, filtroPasajero, handleAbrirDetalleViaje, mostrarToast]
  );

  // ── Filtrado y coincidencias en el bus por nombre o cédula ────────────────
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

  // ── Estadísticas del viaje abierto ────────────────────────────────────────
  const totalTiquetes = tiquetes.length;
  const totalValidados = tiquetes.filter((t) => t.validado).length;
  const totalPendientes = totalTiquetes - totalValidados;
  const ingresoTotal = tiquetes.reduce((acc, t) => acc + Number(t.valorcobrado || 0), 0);

  return (
    <Layout>
      {/* Toast de retroalimentación */}
      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-2.5 text-sm font-bold shadow-xs ${
            toast.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {toast.tipo === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.texto}</span>
        </div>
      )}

      {/* =====================================================================
          PANTALLA 1: BUSCADOR DE VIAJES + LISTADO DE VIAJES CON "VER DETALLES"
         ===================================================================== */}
      {!viajeSeleccionado && (
        <div className="space-y-6">
          {/* Card de Filtros de Búsqueda */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400">
                    travel_explore
                  </span>
                  Buscar Viajes Programados
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filtra los viajes por origen, destino, fecha o número de tiquete y entra a ver el mapa de asientos.
                </p>
              </div>
              {(origen || destino || fecha || numeroTiquete) && (
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="self-start sm:self-auto text-xs font-bold text-slate-500 hover:text-[#c62828] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Limpiar filtros
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBuscarViajes();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end"
            >
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Ciudad Origen
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                    trip_origin
                  </span>
                  <input
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="Ej: Pasto"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 focus:border-[#0e3a8c]"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Ciudad Destino
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                    location_on
                  </span>
                  <input
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej: Medellín"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 focus:border-[#0e3a8c]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Fecha de Salida
                </label>
                <DatePicker
                  value={fecha}
                  onChange={setFecha}
                  inputClassName="h-10 text-sm rounded-xl"
                  placeholder="Todas"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  N° de Tiquete
                </label>
                <input
                  value={numeroTiquete}
                  onChange={(e) => setNumeroTiquete(e.target.value)}
                  placeholder="SETP..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 focus:border-[#0e3a8c]"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={cargandoViajes}
                  className="w-full h-10 rounded-xl bg-[#0e3a8c] hover:bg-[#092966] disabled:opacity-60 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-lg ${cargandoViajes ? 'animate-spin' : ''}`}>
                    {cargandoViajes ? 'progress_activity' : 'search'}
                  </span>
                  <span>{cargandoViajes ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Encabezado de Resultados */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {cargandoViajes
                ? 'Buscando viajes...'
                : `${viajes.length} ${viajes.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}`}
            </h3>
            <button
              type="button"
              onClick={() => handleBuscarViajes()}
              className="text-xs font-bold text-[#0e3a8c] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Actualizar lista
            </button>
          </div>

          {/* Lista de Viajes en Tarjetas Responsive */}
          {cargandoViajes ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-16 flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-4xl text-[#0e3a8c] animate-spin mb-2">
                progress_activity
              </span>
              <p className="text-sm font-semibold">Cargando viajes disponibles...</p>
            </div>
          ) : viajes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <span className="material-symbols-outlined text-3xl">directions_bus</span>
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                No se encontraron viajes
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Prueba con otra ciudad, fecha o limpia los filtros para ver todos los viajes programados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {viajes.map((v) => {
                const libres = Number(v.asientoslibrestramo ?? v.asientoslibres ?? 0);
                const total = Number(v.totalasientos ?? 0);
                const ocupados = Math.max(total - libres, 0);
                const pct = total > 0 ? Math.min(Math.round((ocupados / total) * 100), 100) : 0;
                const barColor = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
                const labelOrigen = v.nombreagenciaorigen || `Terminal ${v.ciudadorigen}`;
                const labelDestino = v.nombreagenciadestino || `Terminal ${v.ciudaddestino}`;

                return (
                  <div
                    key={v.idviaje}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0e3a8c]/60 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    {/* Ruta visual: Terminal Origen ---> Terminal Destino */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0e3a8c] dark:text-blue-300 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {fmtFecha(v.fechasalida)} · {fmtHora(v.horasalida)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {v.nombretipobus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Origen
                          </span>
                          <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                            {labelOrigen}
                          </p>
                        </div>

                        <div className="flex-1 flex items-center gap-1 px-1 min-w-[44px]">
                          <span className="w-2 h-2 rounded-full bg-[#0e3a8c] shrink-0" />
                          <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                          <span className="material-symbols-outlined text-[#c62828] text-lg shrink-0">
                            arrow_forward
                          </span>
                        </div>

                        <div className="min-w-0 text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Destino
                          </span>
                          <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                            {labelDestino}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info del Bus + Ocupación + Botón Ver Detalles */}
                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-[#0e3a8c]">directions_bus</span>
                            Móvil {v.numeromovil}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-sm text-slate-400">badge</span>
                            {v.placa}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 max-w-[260px]">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {ocupados} vendidos · <strong className="text-emerald-600">{libres} libres</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAbrirDetalleViaje(v)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0e3a8c] hover:bg-[#092966] text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">event_seat</span>
                        <span>Ver detalles</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
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
        <div className="space-y-5">
          {/* Barra superior de regreso y actualización */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setViajeSeleccionado(null);
                setFiltroPasajero('');
                setTiqueteDetalle(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0e3a8c] text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Volver a Viajes</span>
            </button>

            <button
              type="button"
              onClick={() => handleAbrirDetalleViaje(viajeSeleccionado, filtroPasajero)}
              disabled={cargandoDetalle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0e3a8c] text-[#0e3a8c] dark:text-blue-400 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <span className={`material-symbols-outlined text-base ${cargandoDetalle ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Actualizar mapa</span>
            </button>
          </div>

          {/* Tarjeta de Información del Bus y KPIs del Viaje */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0e3a8c] via-[#1d4ed8] to-[#c62828]" />
            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Info Bus y Ruta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0e3a8c] dark:text-blue-300 text-[11px] font-extrabold">
                    <span className="material-symbols-outlined text-sm">directions_bus</span>
                    Móvil {viajeSeleccionado.numeromovil}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold">
                    {viajeSeleccionado.placa}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-[#c62828] dark:text-red-300 text-[11px] font-bold">
                    {viajeSeleccionado.nombretipobus}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>{viajeSeleccionado.nombreagenciaorigen || `Terminal ${viajeSeleccionado.ciudadorigen}`}</span>
                  <span className="material-symbols-outlined text-[#c62828] text-xl">arrow_forward</span>
                  <span>{viajeSeleccionado.nombreagenciadestino || `Terminal ${viajeSeleccionado.ciudaddestino}`}</span>
                </h2>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {fmtFecha(viajeSeleccionado.fechasalida)} · Salida {fmtHora(viajeSeleccionado.horasalida)} · Capacidad{' '}
                  {viajeSeleccionado.totalasientos} sillas
                </p>
              </div>

              {/* 4 KPIs compactos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Tiquetes
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{totalTiquetes}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Validados
                  </span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{totalValidados}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                    Pendientes
                  </span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-300">{totalPendientes}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e3a8c] dark:text-blue-400 block">
                    Ingreso
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#0e3a8c] dark:text-blue-300">
                    {fmtMoneda(ingresoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error al cargar */}
          {errorDetalle && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span>{errorDetalle}</span>
            </div>
          )}

          {/* Grid Principal: Mapa de Asientos (Izq) + Buscador y Pasajeros (Der) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Columna Izquierda: Diseñador / Mapa Interactivo de Asientos ── */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="text-center mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400 text-lg">
                    event_seat
                  </span>
                  Mapa de Asientos del Bus
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
            <div className="lg:col-span-7 space-y-4">
              {/* Buscador destacado de Pasajero */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#c62828] text-lg">person_search</span>
                    Ubicar Pasajero en el Bus
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Escribe el nombre o número de cédula para resaltar automáticamente su asiento en el mapa.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                      search
                    </span>
                    <input
                      value={filtroPasajero}
                      onChange={(e) => setFiltroPasajero(e.target.value)}
                      placeholder="Buscar por nombre, cédula o N° de tiquete..."
                      className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 focus:border-[#0e3a8c]"
                    />
                    {filtroPasajero && (
                      <button
                        type="button"
                        onClick={() => setFiltroPasajero('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
                        aria-label="Limpiar búsqueda"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro de estado */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          filtroEstado === op.id
                            ? 'bg-[#0e3a8c] text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner cuando hay coincidencias en el mapa */}
                {hayBusquedaPasajero && (
                  <div
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      tiquetesFiltrados.length > 0
                        ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[#c62828] dark:text-red-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pasajeros con Tiquete ({tiquetesFiltrados.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Clic para ver detalle y descargar PDF</span>
                </div>

                {cargandoDetalle ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                    Cargando pasajeros...
                  </div>
                ) : tiquetesFiltrados.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-2">
                      airline_seat_recline_normal
                    </span>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {tiquetes.length === 0
                        ? 'Aún no hay tiquetes vendidos en este viaje'
                        : 'Sin pasajeros que coincidan con el filtro'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
                    {tiquetesFiltrados.map((t) => {
                      const resaltado = hayBusquedaPasajero && tiquetesResaltadosIds.has(t.idtiquete);
                      const esValido = Boolean(t.validado);

                      return (
                        <div
                          key={t.idtiquete}
                          onClick={() => setTiqueteDetalle(t)}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                            resaltado
                              ? 'bg-red-50/70 dark:bg-red-950/25 hover:bg-red-50'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-white shadow-2xs ${
                                resaltado
                                  ? 'bg-[#c62828] ring-2 ring-red-300'
                                  : esValido
                                  ? 'bg-emerald-600'
                                  : 'bg-[#0e3a8c]'
                              }`}
                            >
                              <span className="text-[8px] font-bold uppercase opacity-80 leading-none">Silla</span>
                              <span className="text-sm leading-tight">{t.numeroasiento}</span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-extrabold text-slate-900 dark:text-white uppercase truncate">
                                  {`${t.nombre ?? ''} ${t.apellido ?? ''}`.trim() || 'Pasajero'}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    esValido
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  }`}
                                >
                                  {esValido ? 'Validado' : 'Pendiente'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                <span className="font-mono font-semibold">{fmtDoc(t.tipodocumento, t.numerodocumento)}</span>
                                {' · '}
                                <span>
                                  {t.origentramo || viajeSeleccionado.ciudadorigen} →{' '}
                                  {t.destinotramo || viajeSeleccionado.ciudaddestino}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-14 sm:pl-0">
                            <div className="text-left sm:text-right">
                              <span className="text-sm font-black text-slate-900 dark:text-white block">
                                {fmtMoneda(t.valorcobrado)}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                {t.codigotiquete || `#${t.idtiquete}`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTiqueteDetalle(t);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0e3a8c] hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Abrir
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
