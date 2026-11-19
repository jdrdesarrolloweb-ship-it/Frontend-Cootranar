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

  useEffect(() => {
    if (!pisos.includes(pisoActual)) {
      setPisoActual(pisos[0] ?? 1);
    }
  }, [pisos, pisoActual]);

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
      <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '36px', color: '#0e3a8c', display: 'block', marginBottom: '8px' }}>
          progress_activity
        </span>
        <p style={{ fontSize: '13px', fontWeight: 600 }}>Cargando mapa de asientos del bus...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Selector de Piso */}
      {pisos.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '4px',
            borderRadius: '12px',
            background: isDark ? '#1e293b' : '#f1f5f9',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
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
                style={{
                  padding: '7px 16px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activo ? '#0e3a8c' : 'transparent',
                  color: activo ? '#ffffff' : isDark ? '#cbd5e1' : '#475569',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>layers</span>
                <span>Piso {piso}</span>
                {tieneCoincidenciaEnPiso && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c62828', display: 'inline-block' }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Leyenda de estados */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          marginBottom: '18px',
          fontSize: '11.5px',
          fontWeight: 600,
          color: isDark ? '#cbd5e1' : '#475569',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#ffffff', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
          Libre
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#0e3a8c', display: 'inline-block' }} />
          Ocupado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#16a34a', display: 'inline-block' }} />
          Validado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#c62828', boxShadow: '0 0 0 2px #fca5a5', display: 'inline-block' }} />
          Cliente buscado
        </span>
      </div>

      {/* Carrocería del Bus */}
      <div
        style={{
          width: '100%',
          maxWidth: '330px',
          borderRadius: '26px',
          border: `2px solid ${isDark ? '#334155' : '#cbd5e1'}`,
          background: isDark ? '#0f172a' : '#f8fafc',
          padding: '16px',
        }}
      >
        {/* Cabina del conductor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 14px',
            marginBottom: '14px',
            borderRadius: '14px',
            background: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#cbd5e1' : '#475569' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0e3a8c' }}>sports_motorsports</span>
            <span>Conductor</span>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 9px',
              borderRadius: '999px',
              background: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#cbd5e1' : '#64748b',
            }}
          >
            Frente · Piso {pisoActual}
          </span>
        </div>

        {/* Cuadrícula de asientos */}
        <div
          style={{
            display: 'grid',
            gap: '8px',
            gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
          }}
        >
          {distribucion.map((slot) => {
            if (slot.esBano) {
              return (
                <div
                  key={slot.id}
                  style={{
                    height: '44px',
                    borderRadius: '11px',
                    background: isDark ? '#0c4a6e' : '#f0f9ff',
                    border: `1px solid ${isDark ? '#0369a1' : '#bae6fd'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                  }}
                  title="Baño"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>wc</span>
                </div>
              );
            }

            if (slot.esPasillo || slot.vacio || slot.numero == null) {
              return <div key={slot.id} style={{ height: '44px' }} />;
            }

            const numAsiento = Number(slot.numero);
            const asientoBD =
              asientos.find((a) => Number(a.numeroasiento) === numAsiento && Number(a.piso ?? 1) === pisoActual) ||
              asientos.find((a) => Number(a.numeroasiento) === numAsiento);

            const tiquete =
              (asientoBD && tiquetePorAsiento.mapId.get(Number(asientoBD.idasientoviaje))) ||
              tiquetePorAsiento.mapNum.get(numAsiento) ||
              null;

            const ocupado = Boolean(tiquete);
            const validado = Boolean(tiquete?.validado);
            const resaltado = Boolean(tiquete && hayBusquedaActiva && tiquetesResaltadosIds.has(tiquete.idtiquete));
            const atenuado = Boolean(hayBusquedaActiva && tiquetesResaltadosIds.size > 0 && !resaltado);
            const esPoltrona = Boolean(asientoBD?.espoltrona ?? slot.esPoltrona ?? tiquete?.espoltrona);

            let bg = isDark ? '#1e293b' : '#ffffff';
            let border = isDark ? '#475569' : '#cbd5e1';
            let color = isDark ? '#94a3b8' : '#64748b';
            let shadow = 'none';

            if (resaltado) {
              bg = '#c62828';
              border = '#991b1b';
              color = '#ffffff';
              shadow = '0 0 0 4px rgba(248, 113, 113, 0.55), 0 6px 14px rgba(198, 40, 40, 0.35)';
            } else if (ocupado && validado) {
              bg = '#16a34a';
              border = '#15803d';
              color = '#ffffff';
              shadow = '0 2px 6px rgba(22, 163, 74, 0.25)';
            } else if (ocupado) {
              bg = '#0e3a8c';
              border = '#092966';
              color = '#ffffff';
              shadow = '0 2px 6px rgba(14, 58, 140, 0.25)';
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
                style={{
                  position: 'relative',
                  height: '44px',
                  borderRadius: '11px',
                  border: `2px solid ${border}`,
                  background: bg,
                  color,
                  boxShadow: shadow,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: ocupado ? 'pointer' : 'default',
                  opacity: atenuado ? 0.35 : 1,
                  transform: resaltado ? 'scale(1.07)' : 'scale(1)',
                  transition: 'all 0.18s ease',
                  zIndex: resaltado ? 10 : 1,
                }}
              >
                {resaltado && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#facc15',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', fontWeight: 900 }}>person</span>
                  </span>
                )}
                <span style={{ fontSize: '12.5px', fontWeight: 800, lineHeight: 1 }}>{numAsiento}</span>
                {esPoltrona && (
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      marginTop: '2px',
                      color: ocupado || resaltado ? 'rgba(255,255,255,0.85)' : '#d97706',
                    }}
                  >
                    VIP
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Parte trasera */}
        <div
          style={{
            marginTop: '14px',
            paddingTop: '8px',
            borderTop: `1px dashed ${isDark ? '#334155' : '#cbd5e1'}`,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
            Parte trasera del bus
          </span>
        </div>
      </div>
    </div>
  );
}
