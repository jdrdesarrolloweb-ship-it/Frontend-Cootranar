import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { DatePicker } from '@/components/ui/date-picker';
import { TarjetaViaje } from '../../components/common/TarjetaViaje';
import { GridTarjetasViajeSkeleton } from '../../components/common/TarjetaViajeSkeleton';
import { usePreferencias } from '../../context/PreferenciasContext';
import { useContenidoWeb } from '../../context/ContenidoWebContext';
import { plataformaEcommerceApi, type ViajeAPI } from '../../../infrastructure/api/plataformaEcommerceApi';
import busCootranar from '../../../assets/busCootranar.png';

const POR_PAGINA_API = 50; // máximo que acepta el backend
const MAX_PAGINAS_API = 10; // hasta 500 viajes en el catálogo
const POR_PAGINA = 12;

type Orden = 'fecha' | 'precio';

interface Destino {
  nombre: string;
  imagen?: string;
  viajes: number;
  desde: number;
}

interface Ruta {
  clave: string;
  origen: string;
  destino: string;
  via: string;
  viajes: number;
  desde: number;
}

const fechaISO = (f: string) => String(f ?? '').slice(0, 10);
const fmtCop = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

/** Trae todas las páginas del catálogo público (los endpoints no requieren sesión). */
async function cargarCatalogo(): Promise<ViajeAPI[]> {
  const primera = await plataformaEcommerceApi.getViajes({ page: 1, limit: POR_PAGINA_API });
  const juntar = (r: typeof primera) => [...(r.viajesHoy ?? []), ...(r.viajesProgramados ?? [])];
  const total = Math.min(primera.paginacion?.totalPaginas ?? 1, MAX_PAGINAS_API);
  const resto = await Promise.all(
    Array.from({ length: Math.max(total - 1, 0) }, (_, i) =>
      plataformaEcommerceApi.getViajes({ page: i + 2, limit: POR_PAGINA_API })
    )
  );
  const vistos = new Set<number>();
  return [primera, ...resto].flatMap(juntar).filter((v) => !vistos.has(v.idviaje) && vistos.add(v.idviaje));
}

/**
 * Catálogo público de viajes: todos los viajes disponibles, los destinos y las
 * rutas que cubre Cootranar, con filtros. No requiere iniciar sesión; la cuenta
 * se pide al reservar asiento.
 */
export function ViajesDestinosPage() {
  const { idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const es = idioma === 'es';
  const vTextos = contenido.paginasPublicas.viajes;
  const [params, setParams] = useSearchParams();

  const [viajes, setViajes] = useState<ViajeAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const listaRef = useRef<HTMLDivElement>(null);

  // Filtros en la URL para poder compartir/volver al mismo listado
  const origen = params.get('origen') ?? '';
  const destino = params.get('destino') ?? '';
  const fecha = params.get('fecha') ?? '';
  const orden = (params.get('orden') as Orden) || 'fecha';
  const setFiltro = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor); else nuevos.delete(clave);
    setParams(nuevos, { replace: true });
    setPagina(1);
  };
  const limpiar = () => { setParams({}, { replace: true }); setPagina(1); };

  const cargar = () => {
    setCargando(true);
    setError(null);
    cargarCatalogo()
      .then(setViajes)
      .catch(() => setError(es ? 'No pudimos cargar los viajes. Intenta de nuevo.' : 'We could not load trips. Please try again.'))
      .finally(() => setCargando(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, []);

  // ── Derivados: destinos, rutas y orígenes ────────────────────────────────
  const destinos = useMemo<Destino[]>(() => {
    const mapa = new Map<string, Destino>();
    for (const v of viajes) {
      const nombre = v.ruta.destino;
      const d = mapa.get(nombre) ?? { nombre, imagen: v.imagenDestino, viajes: 0, desde: Infinity };
      d.viajes += 1;
      d.desde = Math.min(d.desde, Number(v.precio?.valor) || Infinity);
      d.imagen = d.imagen || v.imagenDestino;
      mapa.set(nombre, d);
    }
    return [...mapa.values()].sort((a, b) => b.viajes - a.viajes || a.nombre.localeCompare(b.nombre));
  }, [viajes]);

  const rutas = useMemo<Ruta[]>(() => {
    const mapa = new Map<string, Ruta>();
    for (const v of viajes) {
      const clave = `${v.ruta.origen}→${v.ruta.destino}|${v.ruta.via ?? ''}`;
      const r = mapa.get(clave) ?? { clave, origen: v.ruta.origen, destino: v.ruta.destino, via: v.ruta.via, viajes: 0, desde: Infinity };
      r.viajes += 1;
      r.desde = Math.min(r.desde, Number(v.precio?.valor) || Infinity);
      mapa.set(clave, r);
    }
    return [...mapa.values()].sort((a, b) => a.origen.localeCompare(b.origen) || a.destino.localeCompare(b.destino));
  }, [viajes]);

  const origenes = useMemo(() => [...new Set(viajes.map((v) => v.ruta.origen))].sort(), [viajes]);

  // ── Listado filtrado ─────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const lista = viajes.filter((v) =>
      (!origen || v.ruta.origen === origen) &&
      (!destino || v.ruta.destino === destino) &&
      (!fecha || fechaISO(v.fechasalida) === fecha)
    );
    return lista.sort((a, b) =>
      orden === 'precio'
        ? (Number(a.precio?.valor) || 0) - (Number(b.precio?.valor) || 0)
        : `${fechaISO(a.fechasalida)} ${a.horasalida}`.localeCompare(`${fechaISO(b.fechasalida)} ${b.horasalida}`)
    );
  }, [viajes, origen, destino, fecha, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);
  const hayFiltros = Boolean(origen || destino || fecha);

  const irALista = () => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const elegirDestino = (nombre: string) => { setFiltro('destino', destino === nombre ? '' : nombre); irALista(); };
  const elegirRuta = (r: Ruta) => {
    const nuevos = new URLSearchParams(params);
    nuevos.set('origen', r.origen);
    nuevos.set('destino', r.destino);
    setParams(nuevos, { replace: true });
    setPagina(1);
    irALista();
  };
  const cambiarPagina = (p: number) => { setPagina(p); irALista(); };

  const selectCls =
    'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25';

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 transition-colors duration-200">
      <Navbar />

      {/* Encabezado con el bus de Cootranar de fondo */}
      <section className="relative overflow-hidden bg-[#06183d] text-white">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={busCootranar}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[62%_42%]"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06183d]/92 via-[#06183d]/60 to-[#06183d]/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06183d]/80 via-transparent to-[#06183d]/30" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-white/15 border border-white/20 rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-sm">travel_explore</span>
            {es ? vTextos.etiquetaEs : vTextos.etiquetaEn}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">
            {es ? vTextos.tituloEs : vTextos.tituloEn}
          </h1>
          <p className="text-blue-100 mt-2 max-w-2xl text-sm sm:text-base">
            {es ? vTextos.subtituloEs : vTextos.subtituloEn}
          </p>
          {cargando && (
            <div className="flex flex-wrap gap-3 mt-6" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-11 w-44 rounded-xl bg-white/15 border border-white/15 animate-pulse"
                />
              ))}
            </div>
          )}
          {!cargando && !error && (
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { icono: 'directions_bus', valor: viajes.length, texto: es ? 'salidas disponibles' : 'departures' },
                { icono: 'location_on', valor: destinos.length, texto: es ? 'destinos' : 'destinations' },
                { icono: 'alt_route', valor: rutas.length, texto: es ? 'rutas' : 'routes' },
              ].map((s) => (
                <div key={s.texto} className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5">
                  <span className="material-symbols-outlined text-sky-300">{s.icono}</span>
                  <span className="text-lg font-extrabold">{s.valor}</span>
                  <span className="text-xs text-blue-100">{s.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-10">
        {cargando && (
          <div className="space-y-10" role="status" aria-label={es ? 'Cargando viajes' : 'Loading trips'}>
            {/* Skeleton: Destinos */}
            <section>
              <div className="h-7 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 animate-pulse relative overflow-hidden p-3 flex flex-col justify-end gap-2"
                  >
                    <div className="h-5 w-28 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="h-3.5 w-36 rounded bg-slate-300/80 dark:bg-slate-700/80" />
                  </div>
                ))}
              </div>
            </section>

            {/* Skeleton: Rutas */}
            <section>
              <div className="h-7 w-40 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                      <div className="space-y-2">
                        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-700/60" />
                      </div>
                    </div>
                    <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                ))}
              </div>
            </section>

            {/* Skeleton: Viajes */}
            <section className="space-y-5">
              <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse" />
              <GridTarjetasViajeSkeleton cantidad={6} />
            </section>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            <button type="button" onClick={cargar} className="mt-3 text-sm font-bold text-[#0e3a8c] dark:text-blue-400 hover:underline">
              {es ? 'Reintentar' : 'Retry'}
            </button>
          </div>
        )}

        {!cargando && !error && (
          <>
            {/* Destinos */}
            {destinos.length > 0 && (
              <section aria-labelledby="titulo-destinos">
                <h2 id="titulo-destinos" className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">
                  {es ? 'Destinos' : 'Destinations'}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {destinos.map((d) => {
                    const activo = destino === d.nombre;
                    return (
                      <button
                        key={d.nombre}
                        type="button"
                        onClick={() => elegirDestino(d.nombre)}
                        aria-pressed={activo}
                        className={`group relative h-36 rounded-2xl overflow-hidden text-left shadow-sm ring-2 transition-all ${
                          activo ? 'ring-[#0e3a8c] dark:ring-blue-400' : 'ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600'
                        }`}
                      >
                        {d.imagen ? (
                          <img src={d.imagen} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0e3a8c] to-[#1d4ed8]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <p className="font-extrabold text-base leading-tight">{d.nombre}</p>
                          <p className="text-[11px] text-white/85">
                            {d.viajes} {es ? (d.viajes === 1 ? 'salida' : 'salidas') : (d.viajes === 1 ? 'departure' : 'departures')}
                            {Number.isFinite(d.desde) && <> · {es ? 'desde' : 'from'} {fmtCop(d.desde)}</>}
                          </p>
                        </div>
                        {activo && (
                          <span className="absolute top-2 right-2 material-symbols-outlined text-white bg-[#0e3a8c] rounded-full p-0.5 text-lg">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Rutas */}
            {rutas.length > 0 && (
              <section aria-labelledby="titulo-rutas">
                <h2 id="titulo-rutas" className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">
                  {es ? 'Rutas' : 'Routes'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rutas.map((r) => (
                    <button
                      key={r.clave}
                      type="button"
                      onClick={() => elegirRuta(r)}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-[#0e3a8c]/40 dark:hover:border-blue-400/40 hover:shadow-md transition-all text-left"
                    >
                      <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400 bg-[#e8f0fe] dark:bg-white/5 rounded-xl p-2">alt_route</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{r.origen} → {r.destino}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {r.via ? `${es ? 'Vía' : 'Via'} ${r.via} · ` : ''}
                          {r.viajes} {es ? (r.viajes === 1 ? 'salida' : 'salidas') : (r.viajes === 1 ? 'departure' : 'departures')}
                        </p>
                      </div>
                      {Number.isFinite(r.desde) && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase font-bold text-slate-400">{es ? 'Desde' : 'From'}</p>
                          <p className="text-sm font-extrabold text-[#0e3a8c] dark:text-blue-300">{fmtCop(r.desde)}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Todos los viajes */}
            <section ref={listaRef} aria-labelledby="titulo-viajes" className="scroll-mt-20">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <h2 id="titulo-viajes" className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {es ? 'Todos los viajes' : 'All trips'}{' '}
                  <span className="text-sm font-bold text-slate-400">({filtrados.length})</span>
                </h2>
                {hayFiltros && (
                  <button type="button" onClick={limpiar} className="inline-flex items-center gap-1 text-sm font-bold text-[#0e3a8c] dark:text-blue-400 hover:underline">
                    <span className="material-symbols-outlined text-base">filter_alt_off</span>
                    {es ? 'Quitar filtros' : 'Clear filters'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 mb-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{es ? 'Origen' : 'From'}</span>
                  <select value={origen} onChange={(e) => setFiltro('origen', e.target.value)} className={`${selectCls} mt-1`}>
                    <option value="">{es ? 'Todos' : 'All'}</option>
                    {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{es ? 'Destino' : 'To'}</span>
                  <select value={destino} onChange={(e) => setFiltro('destino', e.target.value)} className={`${selectCls} mt-1`}>
                    <option value="">{es ? 'Todos' : 'All'}</option>
                    {destinos.map((d) => <option key={d.nombre} value={d.nombre}>{d.nombre}</option>)}
                  </select>
                </label>
                <div className="block">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{es ? 'Fecha' : 'Date'}</span>
                  <DatePicker
                    value={fecha}
                    onChange={(val) => setFiltro('fecha', val)}
                    placeholder={es ? 'Seleccionar fecha' : 'Select date'}
                    inputClassName="mt-1 h-[42px] text-sm"
                  />
                </div>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{es ? 'Ordenar por' : 'Sort by'}</span>
                  <select value={orden} onChange={(e) => setFiltro('orden', e.target.value === 'fecha' ? '' : e.target.value)} className={`${selectCls} mt-1`}>
                    <option value="fecha">{es ? 'Fecha de salida' : 'Departure date'}</option>
                    <option value="precio">{es ? 'Menor precio' : 'Lowest price'}</option>
                  </select>
                </label>
              </div>

              {filtrados.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                    {es ? 'No hay viajes con esos filtros.' : 'No trips match these filters.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {visibles.map((v) => <TarjetaViaje key={v.idviaje} viaje={v} />)}
                  </div>

                  {totalPaginas > 1 && (
                    <nav className="flex items-center justify-center gap-2 mt-8" aria-label={es ? 'Paginación' : 'Pagination'}>
                      <button
                        type="button"
                        onClick={() => cambiarPagina(paginaSegura - 1)}
                        disabled={paginaSegura === 1}
                        aria-label={es ? 'Página anterior' : 'Previous page'}
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300 px-2">
                        {paginaSegura} / {totalPaginas}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarPagina(paginaSegura + 1)}
                        disabled={paginaSegura === totalPaginas}
                        aria-label={es ? 'Página siguiente' : 'Next page'}
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </nav>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      <CinematicFooter />
    </div>
  );
}
