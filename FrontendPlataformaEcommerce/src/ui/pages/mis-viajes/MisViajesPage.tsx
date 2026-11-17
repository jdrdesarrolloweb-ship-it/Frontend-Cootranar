import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { ROUTES } from '../../../shared/constants';
import { plataformaEcommerceApi, type MiViaje } from '../../../infrastructure/api/plataformaEcommerceApi';
import { httpClient } from '../../../infrastructure/api/httpClient';
import { usePreferencias } from '../../context/PreferenciasContext';
import { abrirODescargarPdf } from '../../../shared/utils/descargarPdf';

function formatFecha(fechaISO: string, idioma: 'es' | 'en'): string {
  // fechasalida es una fecha de calendario (YYYY-MM-DD): se construye en hora local
  // para que ninguna conversión de zona horaria corra el día.
  const [y, m, d] = String(fechaISO ?? '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(idioma === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatHora(hora: string, idioma: 'es' | 'en'): string {
  if (!hora) return '';
  const [h, m] = hora.split(':');
  const hNum = parseInt(h);
  const periodo = hNum >= 12 
    ? (idioma === 'es' ? 'p. m.' : 'PM') 
    : (idioma === 'es' ? 'a. m.' : 'AM');
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${periodo}`;
}

const colorTarjeta: Record<string, string> = {
  default: 'bg-gradient-to-br from-[#0e3a8c] via-[#1347a8] to-[#072052]',
};

function getColorTarjeta(tipobus: string): string {
  return colorTarjeta[tipobus] ?? colorTarjeta.default;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MisViajesPage() {
  const { tx, idioma } = usePreferencias();
  const m = tx.misViajes;

  const [viajes, setViajes] = useState<MiViaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [fechaBusqueda, setFechaBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');

  // Descarga
  const [descargando, setDescargando] = useState<number | null>(null);

  useEffect(() => {
    plataformaEcommerceApi.getMisViajes()
      .then(setViajes)
      .catch(() => setError(idioma === 'es' ? 'No se pudieron cargar tus viajes. Intenta de nuevo.' : 'Could not load your trips. Please try again.'))
      .finally(() => setLoading(false));
  }, [idioma]);

  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const viajesFiltrados = viajes.filter(v => {
    const termino = normalize(codigoBusqueda.trim());
    const palabras = termino.split(/\s+/).filter(Boolean);
    const textoCompleto = normalize(
      `${v.codigotiquete ?? ''} ${v.origennombre ?? ''} ${v.destinonombre ?? ''} ${v.tipobus ?? ''} ${v.placa ?? ''} ${v.numeromovil ?? ''} ${v.referencia ?? ''}`
    );
    const coincideTexto = palabras.length === 0 || palabras.every(p => textoCompleto.includes(p));

    const coincideFecha = !fechaBusqueda ||
      formatFecha(v.fechasalida, idioma).toLowerCase().includes(fechaBusqueda.toLowerCase());
    const coincideEstado = estadoFiltro === 'Todos' || v.estado === estadoFiltro;
    return coincideTexto && coincideFecha && coincideEstado;
  });

  const handleDescargar = async (viaje: MiViaje) => {
    if (!viaje.tienePdf) return;
    setDescargando(viaje.idtiquete);
    try {
      await abrirODescargarPdf(async () => {
        try {
          const res = await httpClient.get<any>(`/wompi/tiquetes/${viaje.idtiquete}/pdf`);
          const url = res.data?.signedUrl || res.data?.data?.signedUrl || res.data?.url || res.data?.data?.url;
          if (url) return url;
        } catch (fetchErr) {
          console.warn('[MisViajes] No se pudo obtener URL firmada por endpoint Wompi, usando url directa:', fetchErr);
        }
        if (viaje.urlpdf) return viaje.urlpdf;
        throw new Error('No se pudo generar el enlace de descarga');
      }, `tiquete-${viaje.codigotiquete || viaje.idtiquete}.pdf`);
    } catch {
      alert(idioma === 'es' ? 'No se pudo generar el enlace de descarga. Intenta de nuevo.' : 'Could not generate download link. Please try again.');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 pb-28 sm:pb-8 transition-colors duration-200">
      <Navbar />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2 mt-2">
          <Link to={ROUTES.HOME} className="hover:text-[#1b367d] dark:hover:text-blue-400 transition-colors uppercase">{tx.navbar.home}</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-[#1b2b4e] dark:text-slate-300 uppercase">{m.titulo}</span>
        </nav>

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#1b2b4e] dark:text-slate-100 tracking-tight leading-none">{m.historial}</h1>
              {!loading && (
                <span className="bg-[#eef2f9] dark:bg-slate-800 text-[#1b367d] dark:text-blue-400 text-[11px] sm:text-[13px] font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
                  {viajes.length} {viajes.length === 1 ? (idioma === 'es' ? 'Viaje' : 'Trip') : (idioma === 'es' ? 'Viajes' : 'Trips')}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-[15px] text-slate-400 dark:text-slate-500 font-medium">
              {idioma === 'es' ? 'Revisa cronológicamente los detalles de tus trayectos.' : 'Chronologically review the details of your trips.'}
            </p>
          </div>

          <Link
            to={ROUTES.HOME}
            className="hidden sm:flex items-center gap-2 bg-[#1b367d] hover:bg-blue-900 text-white text-xs font-extrabold px-6 py-3.5 rounded-2xl transition-all uppercase tracking-wider shadow-sm hover:shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {m.comprarNuevo}
          </Link>
        </div>

        {/* Panel de filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 px-6 py-5 mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-0 w-full">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wide">
                {idioma === 'es' ? 'Ciudad, Destino o Tiquete' : 'City, Destination or Ticket'}
              </label>
              <div className="flex items-center gap-2 border border-slate-200/60 dark:border-slate-700 rounded-full px-4 py-2.5 bg-[#f0f4fd]/60 dark:bg-slate-900/40">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">search</span>
                <input
                  type="text"
                  placeholder={idioma === 'es' ? 'Ej. Popayán, Cali, Pasto o Código' : 'e.g. Popayán, Cali, Pasto or Code'}
                  value={codigoBusqueda}
                  onChange={e => setCodigoBusqueda(e.target.value)}
                  className="flex-1 text-sm font-medium outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent min-w-0"
                />
                {codigoBusqueda && (
                  <button
                    type="button"
                    onClick={() => setCodigoBusqueda('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm flex items-center justify-center p-0.5"
                    title="Borrar"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wide">{m.fechaViaje}</label>
              <div className="flex items-center gap-2 border border-slate-200/60 dark:border-slate-700 rounded-full px-4 py-2.5 bg-[#f0f4fd]/60 dark:bg-slate-900/40">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">calendar_month</span>
                <input
                  type="text"
                  placeholder={idioma === 'es' ? 'Ej. ene, 2024' : 'e.g. Jan, 2024'}
                  value={fechaBusqueda}
                  onChange={e => setFechaBusqueda(e.target.value)}
                  className="flex-1 text-sm font-medium outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent min-w-0"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2 tracking-wide">{m.estado}</label>
              <div className="flex items-center justify-between border border-slate-200/60 dark:border-slate-700 rounded-full px-4 py-2.5 bg-[#f0f4fd]/60 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">filter_list</span>
                  <select
                    value={estadoFiltro}
                    onChange={e => setEstadoFiltro(e.target.value)}
                    className="flex-1 text-sm font-medium outline-none text-slate-700 dark:text-slate-200 bg-transparent appearance-none cursor-pointer min-w-0"
                  >
                    <option value="Todos" className="dark:bg-slate-800">{m.todosEstados}</option>
                    <option value="Próximo" className="dark:bg-slate-800">{m.proximo}</option>
                    <option value="Completado" className="dark:bg-slate-800">{m.completado}</option>
                  </select>
                </div>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
              <button
                onClick={() => {}}
                className="hidden sm:inline-flex items-center justify-center bg-[#dbeafe] dark:bg-blue-955/40 hover:bg-[#cbd5e0] dark:hover:bg-slate-700 text-[#1b367d] dark:text-blue-400 text-xs font-extrabold px-6 py-3 rounded-full transition-all uppercase tracking-wider whitespace-nowrap shadow-sm"
              >
                {m.filtrar}
              </button>
              <button
                onClick={() => { setCodigoBusqueda(''); setFechaBusqueda(''); setEstadoFiltro('Todos'); }}
                className="text-xs font-extrabold text-[#1b367d] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50 px-4 py-3 rounded-full transition-colors uppercase tracking-wider whitespace-nowrap"
              >
                {m.limpiar}
              </button>
            </div>
          </div>
        </div>

        {/* Estados */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
            <p className="text-slate-400 dark:text-slate-500 font-medium">{m.cargando}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-3xl mb-2 block">error_outline</span>
            {error}
          </div>
        )}

        {!loading && !error && viajesFiltrados.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-8 sm:p-16 text-center flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-colors">
            {viajes.length === 0 ? (
              <>
                <div className="w-20 h-20 rounded-full bg-[#e8f0fe] dark:bg-blue-955/40 flex items-center justify-center mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400 text-[40px]">travel_explore</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1b2b4e] dark:text-slate-100 mb-2">{m.noViajesRegistrados}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-sm sm:max-w-md mb-8 leading-relaxed">
                  {m.infoFuturos}
                </p>
                <Link
                  to={ROUTES.HOME}
                  className="flex items-center gap-2 bg-[#0a1c43] dark:bg-blue-600 hover:bg-[#1b367d] dark:hover:bg-blue-700 text-white text-xs font-extrabold px-6 py-3.5 rounded-full transition-all uppercase tracking-wider shadow-sm hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  {m.explorarRutas}
                </Link>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-[#e8f0fe] dark:bg-blue-955/40 flex items-center justify-center mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400 text-[40px]">search_off</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1b2b4e] dark:text-slate-100 mb-2">{m.noEncontrados}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-sm sm:max-w-md mb-8 leading-relaxed">
                  {m.infoNoEncontrados}
                </p>
                <button
                  onClick={() => { setCodigoBusqueda(''); setFechaBusqueda(''); setEstadoFiltro('Todos'); }}
                  className="flex items-center gap-2 bg-[#0a1c43] dark:bg-blue-600 hover:bg-[#1b367d] dark:hover:bg-blue-700 text-white text-xs font-extrabold px-6 py-3.5 rounded-full transition-all uppercase tracking-wider shadow-sm hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                  {m.limpiarFiltros}
                </button>
              </>
            )}
          </div>
        )}

        {/* Lista de viajes (Grid compacto estilo Wallet / Boleto) */}
        {!loading && !error && viajesFiltrados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {viajesFiltrados.map(viaje => (
              <div
                key={viaje.idtiquete}
                onClick={() => {
                  if (viaje.tienePdf && descargando !== viaje.idtiquete) {
                    handleDescargar(viaje);
                  }
                }}
                onKeyDown={(e) => {
                  if (viaje.tienePdf && (e.key === 'Enter' || e.key === ' ') && descargando !== viaje.idtiquete) {
                    e.preventDefault();
                    handleDescargar(viaje);
                  }
                }}
                role={viaje.tienePdf ? 'button' : undefined}
                tabIndex={viaje.tienePdf ? 0 : undefined}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:shadow-black/30 hover:shadow-[0_16px_36px_rgba(14,58,140,0.14)] hover:border-blue-300 dark:hover:border-blue-600/60 hover:-translate-y-1 transition-all duration-300 flex flex-col ${
                  viaje.tienePdf ? 'cursor-pointer active:scale-[0.99]' : ''
                }`}
              >
                {/* ── Cabecera Azul Cootranar con franja naranja/roja superior ── */}
                <div className={`relative ${getColorTarjeta(viaje.tipobus)} text-white px-5 pt-4 pb-5`}>
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#dc2626] via-[#f97316] to-[#ea580c]" />

                  <div className="flex items-center justify-between gap-2 mt-1 mb-3.5">
                    <span className="bg-white/20 backdrop-blur-sm border border-white/15 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider truncate max-w-[55%]">
                      {viaje.tipobus}
                    </span>

                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                      viaje.estado === 'Próximo'
                        ? 'bg-[#4ade80] text-emerald-950'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {viaje.estado === 'Próximo' ? m.proximo : m.completado}
                    </span>
                  </div>

                  <p className="text-center font-mono text-xl font-bold tracking-[0.06em] text-white">
                    {viaje.codigotiquete ?? `#${viaje.idtiquete}`}
                  </p>

                  {/* Muescas laterales superiores del tiquete */}
                  <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-[#f6f6f8] dark:bg-slate-900 z-10" />
                  <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-[#f6f6f8] dark:bg-slate-900 z-10" />
                </div>

                {/* ── Cuerpo Central: Ruta + Tabla compacta de datos ── */}
                <div className="px-5 pt-5 pb-4 flex-1 flex flex-col justify-between gap-4">
                  {/* Trayecto Origen —🚌→ Destino */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight text-left min-w-0 flex-1">
                      {viaje.origennombre}
                    </p>

                    <div className="flex items-center shrink-0 px-1">
                      <span className="w-3 h-[2px] bg-[#0e3a8c] dark:bg-blue-400" />
                      <span className="material-symbols-outlined text-[20px] text-[#0e3a8c] dark:text-blue-400 mx-0.5 group-hover:translate-x-0.5 transition-transform">
                        directions_bus
                      </span>
                      <span className="material-symbols-outlined text-[15px] text-[#0e3a8c] dark:text-blue-400 -ml-0.5">
                        arrow_forward
                      </span>
                    </div>

                    <p className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight text-right min-w-0 flex-1">
                      {viaje.destinonombre}
                    </p>
                  </div>

                  {/* Caja compacta de Fecha, Hora, Asiento y Placa */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-900/30">
                    <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                      <div className="py-2 px-2.5 text-center truncate">
                        {formatFecha(viaje.fechasalida, idioma)}
                      </div>
                      <div className="py-2 px-2.5 text-center truncate">
                        {formatHora(viaje.horasalida, idioma)}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 py-2 px-3 text-center truncate">
                      {idioma === 'es' ? 'Asiento' : 'Seat'} {viaje.numeroasiento} · {viaje.placa}
                    </div>
                  </div>
                </div>

                {/* ── Separador perforado inferior (Muescas + línea punteada) ── */}
                <div className="relative flex items-center px-4">
                  <div className="w-4 h-4 rounded-full bg-[#f6f6f8] dark:bg-slate-900 -ml-6 border border-slate-200/70 dark:border-slate-700/70 shrink-0" />
                  <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700 mx-1" />
                  <div className="w-4 h-4 rounded-full bg-[#f6f6f8] dark:bg-slate-900 -mr-6 border border-slate-200/70 dark:border-slate-700/70 shrink-0" />
                </div>

                {/* ── Pie: Precio + Botón PDF compacto ── */}
                <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <p className="text-lg font-black text-[#0e3a8c] dark:text-blue-400 tracking-tight">
                    ${Number(viaje.valorcobrado).toLocaleString(idioma === 'es' ? 'es-CO' : 'en-US')} <span className="text-sm font-extrabold">COP</span>
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDescargar(viaje);
                    }}
                    disabled={!viaje.tienePdf || descargando === viaje.idtiquete}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-all shrink-0 ${
                      !viaje.tienePdf
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-[#0e3a8c] hover:bg-[#092b6b] dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {descargando === viaje.idtiquete
                      ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                      : <span className="material-symbols-outlined text-[15px]">file_download</span>
                    }
                    <span>{viaje.tienePdf ? 'PDF' : 'N/D'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
