import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from '../../context/SidebarContext';

export interface AsientoGestionUI {
  idasientoviaje: number;
  numeroasiento: number;
  piso: number;
  espoltrona: boolean;
  estado: string;
}

export interface TiqueteEnAsiento {
  idtiquete: number;
  codigotiquete?: string;
  idasientoviaje?: number;
  numeroasiento: number;
  piso?: number;
  espoltrona?: boolean;
  validado?: boolean;
  nombre?: string;
  apellido?: string;
  tipodocumento?: string;
  numerodocumento?: string;
  origentramo?: string;
  destinotramo?: string;
}

interface SlotDistribucion {
  id: number;
  numero: number | string | null;
  vacio?: boolean;
  esPasillo?: boolean;
  esBano?: boolean;
  esPoltrona?: boolean;
  piso?: number;
}

interface Props {
  viaje: { distribucionasientos?: unknown; totalasientos?: number; nombretipobus?: string } | null;
  asientos: AsientoGestionUI[];
  tiquetes: TiqueteEnAsiento[];
  /** IDs de tiquetes que coinciden con el filtro de búsqueda por nombre/cédula. */
  tiquetesResaltadosIds: Set<number>;
  /** Si hay texto de búsqueda activo. */
  hayBusquedaActiva: boolean;
  onClickAsientoOcupado: (tiquete: TiqueteEnAsiento) => void;
  cargando?: boolean;
}

const generarDistribucionDefault = (capacidad: number): SlotDistribucion[] => {
  if (!capacidad || capacidad <= 0) return [];
  const slots: SlotDistribucion[] = [];
  const tieneFila5AlFinal = capacidad % 4 !== 0 && capacidad > 4;
  const filas = tieneFila5AlFinal ? Math.ceil((capacidad - 5) / 4) + 1 : Math.ceil(capacidad / 4);

  let numero = 0;
  let id = 1;
  for (let f = 0; f < filas; f++) {
    const filaDeCinco = f === filas - 1 && tieneFila5AlFinal;
    for (let c = 0; c < 5; c++) {
      const esPasillo = c === 2 && !filaDeCinco;
      if (esPasillo) {
        slots.push({ id: id++, numero: null, vacio: true, esPasillo: true });
      } else if (numero < capacidad) {
        numero++;
        slots.push({ id: id++, numero, vacio: false, esPasillo: false });
      } else {
        slots.push({ id: id++, numero: null, vacio: true, esPasillo: false });
      }
    }
  }
  return slots;
};

const parsearDistribucion = (
  viaje: Props['viaje'],
  cantidadAsientos: number
): { distribucion: SlotDistribucion[]; columnas: number } => {
  const raw = viaje?.distribucionasientos;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && Array.isArray(parsed.distribucion) && typeof parsed.columnas === 'number') {
        return { distribucion: parsed.distribucion, columnas: parsed.columnas };
      }
    } catch {
      // Fallback a layout estándar
    }
  }
  const capacidad = cantidadAsientos || Number(viaje?.totalasientos ?? 0) || 40;
  return { distribucion: generarDistribucionDefault(capacidad), columnas: 5 };
};

export function MapaAsientosGestionTiquetes({
  viaje,
  asientos,
  tiquetes,
  tiquetesResaltadosIds,
  hayBusquedaActiva,
  onClickAsientoOcupado,
  cargando = false,
}: Props) {
  const { theme } = useSidebar();
  const isDark = theme === 'dark';

  const pisos = useMemo(() => {
    const fromAsientos = asientos.map((a) => Number(a.piso ?? 1));
    const fromTiquetes = tiquetes.map((t) => Number(t.piso ?? 1));
    const merged = [...new Set([...fromAsientos, ...fromTiquetes])].filter(Boolean).sort((a, b) => a - b);
    return merged.length > 0 ? merged : [1];
  }, [asientos, tiquetes]);

  const [pisoActual, setPisoActual] = useState<number>(1);

  // Si cambia el viaje, volver al primer piso disponible
  useEffect(() => {
    if (!pisos.includes(pisoActual)) {
      setPisoActual(pisos[0] ?? 1);
    }
  }, [pisos, pisoActual]);

  // Si hay búsqueda activa y el resultado está en otro piso, cambiar automáticamente a ese piso
  useEffect(() => {
    if (!hayBusquedaActiva || tiquetesResaltadosIds.size === 0) return;
    const primeroResaltado = tiquetes.find((t) => tiquetesResaltadosIds.has(t.idtiquete));
    if (primeroResaltado) {
      const asientoInfo = asientos.find(
        (a) =>
          (primeroResaltado.idasientoviaje && a.idasientoviaje === primeroResaltado.idasientoviaje) ||
          Number(a.numeroasiento) === Number(primeroResaltado.numeroasiento)
      );
      const pisoDestino = Number(asientoInfo?.piso ?? primeroResaltado.piso ?? 1);
      if (pisos.includes(pisoDestino) && pisoDestino !== pisoActual) {
        setPisoActual(pisoDestino);
      }
    }
  }, [hayBusquedaActiva, tiquetesResaltadosIds, tiquetes, asientos, pisos, pisoActual]);

  // Mapa rápido por numeroasiento -> Tiquete (y por idasientoviaje -> Tiquete)
  const tiquetePorAsiento = useMemo(() => {
    const mapNum = new Map<number, TiqueteEnAsiento>();
    const mapId = new Map<number, TiqueteEnAsiento>();
    for (const t of tiquetes) {
      mapNum.set(Number(t.numeroasiento), t);
      if (t.idasientoviaje) mapId.set(Number(t.idasientoviaje), t);
    }
    return { mapNum, mapId };
  }, [tiquetes]);

  const asientosDelPiso = useMemo(
    () => asientos.filter((a) => Number(a.piso ?? 1) === pisoActual),
    [asientos, pisoActual]
  );

  const { distribucion, columnas } = useMemo(() => {
    const base = parsearDistribucion(viaje, asientos.length);
    if (pisos.length > 1) {
      const delPiso = base.distribucion.filter((s) => Number(s.piso ?? 1) === pisoActual);
      if (delPiso.length > 0) {
        return { distribucion: delPiso, columnas: base.columnas };
      }
      // Si la distribución no trae campo piso, armar cuadrícula con los asientos de este piso
      const nums = asientosDelPiso.map((a) => Number(a.numeroasiento)).sort((a, b) => a - b);
      const slots: SlotDistribucion[] = [];
      let slotId = 1;
      for (let i = 0; i < nums.length; i += 4) {
        const fila = nums.slice(i, i + 4);
        slots.push({ id: slotId++, numero: fila[0] ?? null, vacio: !fila[0] });
        slots.push({ id: slotId++, numero: fila[1] ?? null, vacio: !fila[1] });
        slots.push({ id: slotId++, numero: null, vacio: true, esPasillo: true });
        slots.push({ id: slotId++, numero: fila[2] ?? null, vacio: !fila[2] });
        slots.push({ id: slotId++, numero: fila[3] ?? null, vacio: !fila[3] });
      }
      return { distribucion: slots, columnas: 5 };
    }
    return base;
  }, [viaje, asientos.length, pisos.length, pisoActual, asientosDelPiso]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <span className="material-symbols-outlined text-4xl text-[#0e3a8c] animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-sm font-semibold">Cargando mapa de asientos del bus...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Selector de Piso (solo si el bus tiene 2 pisos) */}
      {pisos.length > 1 && (
        <div className="flex items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {pisos.map((piso) => {
            const activo = piso === pisoActual;
            const tieneCoincidenciaEnPiso =
              hayBusquedaActiva &&
              tiquetes.some((t) => {
                if (!tiquetesResaltadosIds.has(t.idtiquete)) return false;
                const aInfo = asientos.find((a) => Number(a.numeroasiento) === Number(t.numeroasiento));
                return Number(aInfo?.piso ?? t.piso ?? 1) === piso;
              });
            return (
              <button
                key={piso}
                type="button"
                onClick={() => setPisoActual(piso)}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activo
                    ? 'bg-[#0e3a8c] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">layers</span>
                <span>Piso {piso}</span>
                {tieneCoincidenciaEnPiso && (
                  <span className="w-2 h-2 rounded-full bg-[#c62828] animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 inline-block" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#0e3a8c] inline-block" />
          Ocupado (Pendiente)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
          Validado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#c62828] ring-2 ring-red-300 inline-block" />
          Cliente buscado
        </span>
      </div>

      {/* Carrocería del Bus */}
      <div
        className={`w-full max-w-[340px] rounded-[28px] border-2 p-4 shadow-inner transition-colors ${
          isDark
            ? 'bg-slate-900/70 border-slate-700'
            : 'bg-slate-50/90 border-slate-300'
        }`}
      >
        {/* Cabina del conductor */}
        <div
          className={`flex items-center justify-between px-3 py-2 mb-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-base text-[#0e3a8c]">sports_motorsports</span>
            <span>Conductor</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
            Frente · Piso {pisoActual}
          </span>
        </div>

        {/* Cuadrícula de asientos */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
        >
          {distribucion.map((slot) => {
            if (slot.esBano) {
              return (
                <div
                  key={slot.id}
                  className="h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col items-center justify-center text-sky-600 dark:text-sky-400"
                  title="Baño"
                >
                  <span className="material-symbols-outlined text-base">wc</span>
                </div>
              );
            }

            if (slot.esPasillo || slot.vacio || slot.numero == null) {
              return <div key={slot.id} className="h-11" />;
            }

            const numAsiento = Number(slot.numero);
            const asientoBD = asientos.find(
              (a) => Number(a.numeroasiento) === numAsiento && Number(a.piso ?? 1) === pisoActual
            ) || asientos.find((a) => Number(a.numeroasiento) === numAsiento);

            const tiquete =
              (asientoBD && tiquetePorAsiento.mapId.get(Number(asientoBD.idasientoviaje))) ||
              tiquetePorAsiento.mapNum.get(numAsiento) ||
              null;

            const ocupado = Boolean(tiquete);
            const validado = Boolean(tiquete?.validado);
            const resaltado = Boolean(tiquete && hayBusquedaActiva && tiquetesResaltadosIds.has(tiquete.idtiquete));
            const atenuado = Boolean(hayBusquedaActiva && tiquetesResaltadosIds.size > 0 && !resaltado);
            const esPoltrona = Boolean(asientoBD?.espoltrona ?? slot.esPoltrona ?? tiquete?.espoltrona);

            let estiloAsiento =
              'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-default';

            if (resaltado) {
              estiloAsiento =
                'bg-[#c62828] border-red-700 text-white ring-4 ring-red-400/60 scale-105 shadow-lg shadow-red-600/35 cursor-pointer z-10';
            } else if (ocupado && validado) {
              estiloAsiento =
                'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white shadow-sm cursor-pointer';
            } else if (ocupado) {
              estiloAsiento =
                'bg-[#0e3a8c] hover:bg-[#092966] border-[#092966] text-white shadow-sm cursor-pointer';
            }

            const tooltip = tiquete
              ? `Asiento ${numAsiento} · ${tiquete.nombre ?? ''} ${tiquete.apellido ?? ''} (${tiquete.numerodocumento ?? 'Sin doc'}) · Clic para ver tiquete`
              : `Asiento ${numAsiento} · Disponible`;

            return (
              <button
                key={slot.id}
                type="button"
                disabled={!ocupado}
                onClick={() => {
                  if (tiquete) onClickAsientoOcupado(tiquete);
                }}
                title={tooltip}
                className={`relative h-11 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${estiloAsiento} ${
                  atenuado ? 'opacity-35' : 'opacity-100'
                }`}
              >
                {resaltado && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow animate-bounce">
                    <span className="material-symbols-outlined text-[11px] font-black">person</span>
                  </span>
                )}
                <span className="text-xs font-extrabold leading-none">{numAsiento}</span>
                {esPoltrona && (
                  <span className={`text-[8px] font-bold uppercase tracking-tight mt-0.5 ${ocupado || resaltado ? 'text-white/85' : 'text-amber-600'}`}>
                    VIP
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Parte trasera */}
        <div className="mt-4 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Parte trasera del bus
          </span>
        </div>
      </div>
    </div>
  );
}
