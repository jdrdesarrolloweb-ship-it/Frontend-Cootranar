import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { vehiculosApi } from '../../../infrastructure/services/vehiculosApi';
import {
  vehiculosSemillaApi,
  type BusSemilla,
  type EvaluacionTraslado,
  type MapeoAsientos,
  type ViajeSemilla,
} from '../../../infrastructure/services/vehiculosSemillaApi';
import { DatePicker } from '@/components/ui/date-picker';

const BLUE = '#0D3B8E';

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: '10px',
  border: '1px solid #e8edf2',
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  marginBottom: '20px',
};
const input: React.CSSProperties = {
  boxSizing: 'border-box',
  padding: '9px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '7px',
  fontSize: '13px',
  color: '#334155',
  outline: 'none',
  background: 'white',
  fontFamily: 'inherit',
};
const th: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e8edf2',
};
const td: React.CSSProperties = { padding: '10px 12px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #f1f5f9' };

const boton = (variante: 'primario' | 'secundario' | 'peligro' = 'primario', deshabilitado = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
  cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.55 : 1,
  border: variante === 'secundario' ? '1px solid #cbd5e1' : 'none',
  background: variante === 'primario' ? BLUE : variante === 'peligro' ? '#dc2626' : 'white',
  color: variante === 'secundario' ? '#334155' : 'white',
});

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const fechaCorta = (f: string) => {
  const [y, m, d] = String(f).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
};
const hora12 = (h: string) => {
  const [hh, mm] = String(h).split(':').map(Number);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'p.m.' : 'a.m.'}`;
};
const mensajeError = (e: any, porDefecto: string) => e?.response?.data?.message || e?.message || porDefecto;

type Aviso = { tipo: 'ok' | 'err'; texto: string } | null;

interface BusPlantilla {
  idvehiculo: number;
  numeromovil: string;
  capacidad: number;
  idtipobus: number;
  nombretipobus?: string | null;
}

const AvisoBanner = ({ aviso }: { aviso: Aviso }) =>
  aviso ? (
    <div style={{
      marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
      background: aviso.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
      color: aviso.tipo === 'ok' ? '#166534' : '#b91c1c',
      border: `1px solid ${aviso.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {aviso.texto}
    </div>
  ) : null;

/* ─────────────────────────────────────────────────────────────────────────── */

export const BusesSemillaPage = () => {
  const { user } = useAuth();
  const esAdmin = user?.nombrerol === 'ADMINISTRADOR';

  // Semillas
  const [semillas, setSemillas] = useState<BusSemilla[]>([]);
  const [cargandoSemillas, setCargandoSemillas] = useState(true);
  const [busesReales, setBusesReales] = useState<BusPlantilla[]>([]);
  const [idPlantilla, setIdPlantilla] = useState('');
  const [creando, setCreando] = useState(false);
  const [avisoSemillas, setAvisoSemillas] = useState<Aviso>(null);

  // Viajes por trasladar
  const [desde, setDesde] = useState(hoyBogota());
  const [hasta, setHasta] = useState(sumarDias(hoyBogota(), 7));
  const [viajes, setViajes] = useState<ViajeSemilla[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(true);
  const [viajeATrasladar, setViajeATrasladar] = useState<ViajeSemilla | null>(null);
  const [avisoViajes, setAvisoViajes] = useState<Aviso>(null);

  const cargarSemillas = useCallback(async () => {
    setCargandoSemillas(true);
    try {
      const res = await vehiculosSemillaApi.listar();
      setSemillas(res.data.data ?? []);
    } catch (e) {
      setAvisoSemillas({ tipo: 'err', texto: mensajeError(e, 'No se pudieron cargar los buses semilla') });
    } finally {
      setCargandoSemillas(false);
    }
  }, []);

  const cargarViajes = useCallback(async () => {
    setCargandoViajes(true);
    try {
      const res = await vehiculosSemillaApi.listarViajes(desde, hasta);
      setViajes(res.data.data?.viajes ?? []);
    } catch (e) {
      setAvisoViajes({ tipo: 'err', texto: mensajeError(e, 'No se pudieron cargar los viajes') });
    } finally {
      setCargandoViajes(false);
    }
  }, [desde, hasta]);

  useEffect(() => { void cargarSemillas(); }, [cargarSemillas]);

  // Buses reales activos que pueden servir de plantilla (solo el admin crea semillas).
  useEffect(() => {
    if (!esAdmin) return;
    vehiculosApi.obtenerActivos({ tipo: 'BUS', limit: 500 })
      .then((res) => setBusesReales((res.data?.data?.vehiculos ?? []) as BusPlantilla[]))
      .catch(() => setBusesReales([]));
  }, [esAdmin]);

  // Solo puede haber una semilla activa por tipo de bus + capacidad.
  const combinacionesConSemilla = useMemo(
    () => new Set(semillas.map((s) => `${s.idtipobus}-${s.capacidad}`)),
    [semillas]
  );
  useEffect(() => { void cargarViajes(); }, [cargarViajes]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idPlantilla) {
      setAvisoSemillas({ tipo: 'err', texto: 'Seleccione el bus real que servirá de plantilla.' });
      return;
    }
    setCreando(true);
    setAvisoSemillas(null);
    try {
      // La semilla copia tipo de bus, servicio y distribución de asientos del bus real elegido.
      const res = await vehiculosSemillaApi.crearDesdePlantilla(Number(idPlantilla));
      setAvisoSemillas({ tipo: 'ok', texto: res.data.message });
      setIdPlantilla('');
      await cargarSemillas();
    } catch (err) {
      setAvisoSemillas({ tipo: 'err', texto: mensajeError(err, 'No se pudo crear el bus semilla') });
    } finally {
      setCreando(false);
    }
  };

  const handleDesactivar = async (s: BusSemilla) => {
    if (!window.confirm(`¿Desactivar el bus semilla ${s.numeromovil} (${s.capacidad} puestos)?`)) return;
    setAvisoSemillas(null);
    try {
      await vehiculosSemillaApi.desactivar(s.idvehiculo);
      setAvisoSemillas({ tipo: 'ok', texto: `Bus semilla ${s.numeromovil} desactivado` });
      await cargarSemillas();
    } catch (err) {
      setAvisoSemillas({ tipo: 'err', texto: mensajeError(err, 'No se pudo desactivar') });
    }
  };

  const hoy = hoyBogota();

  return (
    <Layout>
      {/* ── Explicación ─────────────────────────────────── */}
      <div style={{ ...card, display: 'flex', gap: '14px', alignItems: 'flex-start', background: '#f8fbff', borderColor: '#dbe7fb' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: BLUE }}>airport_shuttle</span>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Buses semilla</div>
          Un bus semilla es un bus genérico por tipo de bus y capacidad (24, 30, 42 puestos…) con su documentación al día.
          Sirve para programar y vender viajes a futuro sin comprometer aún un bus real, y se puede usar en varios viajes
          (incluso a la misma hora). Para programar un viaje con él, elíjalo en <em>Viajes</em> (p. ej. <strong>S42A</strong>). El día del viaje, traslade los asientos vendidos al bus real
          desde la tabla de abajo: el sistema valida pólizas, SOAT, tecnomecánica y conductor del bus real.
        </div>
      </div>

      {/* ── Semillas ────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Buses semilla activos</div>
          {esAdmin && (
            <form onSubmit={handleCrear} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={idPlantilla}
                onChange={(e) => { setIdPlantilla(e.target.value); setAvisoSemillas(null); }}
                aria-label="Bus real que sirve de plantilla"
                style={{ ...input, width: '300px', cursor: 'pointer' }}
              >
                <option value="">Elegir bus plantilla…</option>
                {busesReales
                  .toSorted((a: BusPlantilla, b: BusPlantilla) => (a.capacidad ?? 0) - (b.capacidad ?? 0) || String(a.numeromovil).localeCompare(String(b.numeromovil)))
                  .map((b) => {
                    const yaTiene = combinacionesConSemilla.has(`${b.idtipobus}-${b.capacidad}`);
                    return (
                      <option key={b.idvehiculo} value={b.idvehiculo} disabled={yaTiene}>
                        {b.capacidad} puestos · móvil {b.numeromovil} · {b.nombretipobus ?? 'Bus'}{yaTiene ? ' (ya hay semilla)' : ''}
                      </option>
                    );
                  })}
              </select>
              <button type="submit" disabled={creando} style={boton('primario', creando)}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                {creando ? 'Creando…' : 'Crear semilla'}
              </button>
            </form>
          )}
        </div>
        {esAdmin && (
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
            La semilla copia el tipo de bus, el tipo de servicio y la distribución de asientos del bus plantilla. Solo puede haber una por tipo de bus y capacidad, y sirve para todos los viajes que necesite.
          </p>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Móvil</th><th style={th}>Capacidad</th><th style={th}>Tipo de bus</th>
                <th style={th}>Servicio</th><th style={th}>Viajes pendientes</th>{esAdmin && <th style={th} />}
              </tr>
            </thead>
            <tbody>
              {cargandoSemillas ? (
                <tr><td style={td} colSpan={6}>Cargando…</td></tr>
              ) : semillas.length === 0 ? (
                <tr><td style={{ ...td, color: '#94a3b8' }} colSpan={6}>Aún no hay buses semilla.{esAdmin ? ' Cree uno a partir de un bus real.' : ''}</td></tr>
              ) : semillas.map((s) => (
                <tr key={s.idvehiculo}>
                  <td style={{ ...td, fontWeight: 700, fontFamily: 'monospace' }}>{s.numeromovil}</td>
                  <td style={td}>{s.capacidad} puestos</td>
                  <td style={td}>{s.nombretipobus ?? '—'}</td>
                  <td style={td}>{s.nombretiposervicio ?? '—'}</td>
                  <td style={td}>{s.viajespendientes}</td>
                  {esAdmin && (
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button type="button" onClick={() => handleDesactivar(s)} style={boton('secundario')}>Desactivar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AvisoBanner aviso={avisoSemillas} />
      </div>

      {/* ── Viajes por trasladar ────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Viajes vendidos con bus semilla</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
            <div style={{ width: '135px' }}>
              <DatePicker value={desde} onChange={setDesde} inputClassName="h-[34px] text-xs rounded-lg" placeholder="Desde" />
            </div>
            <div style={{ width: '135px' }}>
              <DatePicker value={hasta} min={desde} onChange={setHasta} inputClassName="h-[34px] text-xs rounded-lg" placeholder="Hasta" />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Salida</th><th style={th}>Ruta</th><th style={th}>Semilla</th>
                <th style={th}>Vendidos</th><th style={th}>En compra</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {cargandoViajes ? (
                <tr><td style={td} colSpan={6}>Cargando…</td></tr>
              ) : viajes.length === 0 ? (
                <tr><td style={{ ...td, color: '#94a3b8' }} colSpan={6}>No hay viajes con bus semilla en estas fechas.</td></tr>
              ) : viajes.map((v) => {
                const esHoy = String(v.fechasalida).slice(0, 10) === hoy;
                return (
                  <tr key={v.idviaje} style={esHoy ? { background: '#fffbeb' } : undefined}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{fechaCorta(v.fechasalida)} · {hora12(v.horasalida)}</div>
                      {esHoy && <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>HOY — pendiente de traslado</span>}
                    </td>
                    <td style={td}>{v.ciudadorigen} → {v.ciudaddestino}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{v.numeromovil} ({v.capacidad})</td>
                    <td style={td}>{v.asientosvendidos}</td>
                    <td style={td}>{v.asientosreservados}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button type="button" onClick={() => { setAvisoViajes(null); setViajeATrasladar(v); }} style={boton('primario')}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>swap_horiz</span>
                        Trasladar a bus real
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <AvisoBanner aviso={avisoViajes} />
      </div>

      {viajeATrasladar && (
        <ModalTraslado
          viaje={viajeATrasladar}
          onCerrar={() => setViajeATrasladar(null)}
          onTrasladado={async (mensaje) => {
            setViajeATrasladar(null);
            setAvisoViajes({ tipo: 'ok', texto: mensaje });
            await Promise.all([cargarViajes(), cargarSemillas()]);
          }}
        />
      )}
    </Layout>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

interface ModalTrasladoProps {
  viaje: ViajeSemilla;
  onCerrar: () => void;
  onTrasladado: (mensaje: string) => void | Promise<void>;
}

const ModalTraslado = ({ viaje, onCerrar, onTrasladado }: ModalTrasladoProps) => {
  const [movil, setMovil] = useState('');
  const [evaluacion, setEvaluacion] = useState<EvaluacionTraslado | null>(null);
  const [mapeo, setMapeo] = useState<MapeoAsientos>({});
  const [evaluando, setEvaluando] = useState(false);
  const [trasladando, setTrasladando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluar = async (mapeoActual: MapeoAsientos = mapeo) => {
    if (!movil.trim()) return;
    setEvaluando(true);
    setError(null);
    try {
      const res = await vehiculosSemillaApi.evaluarTraslado(viaje.idviaje, movil.trim(), mapeoActual);
      setEvaluacion(res.data.data);
    } catch (e) {
      setEvaluacion(null);
      setError(mensajeError(e, 'No se pudo evaluar el traslado'));
    } finally {
      setEvaluando(false);
    }
  };

  const cambiarDestino = (asientoAnterior: number, destino: number) => {
    const nuevo = { ...mapeo, [asientoAnterior]: destino };
    setMapeo(nuevo);
    void evaluar(nuevo);
  };

  const confirmar = async () => {
    if (!evaluacion?.puedeTrasladar) return;
    setTrasladando(true);
    setError(null);
    try {
      const res = await vehiculosSemillaApi.trasladar(viaje.idviaje, movil.trim(), mapeo);
      await onTrasladado(res.data.message);
    } catch (e: any) {
      // Si algo cambió entre la evaluación y la confirmación, el backend devuelve la evaluación nueva.
      if (e?.response?.data?.data?.verificaciones) setEvaluacion(e.response.data.data);
      setError(mensajeError(e, 'No se pudo trasladar el viaje'));
    } finally {
      setTrasladando(false);
    }
  };

  // Asientos del bus real que no están tomados por otro tiquete (para reubicar conflictos)
  const asientosDisponibles = useMemo(() => {
    if (!evaluacion) return [] as number[];
    const tomados = new Set(evaluacion.plan.vendidos.filter((p) => !p.problema).map((p) => p.asientoNuevo));
    return evaluacion.vehiculoReal.asientos.filter((n) => !tomados.has(n)).sort((a, b) => a - b);
  }, [evaluacion]);

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onCerrar} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-traslado" style={{
        position: 'relative', background: 'white', borderRadius: '12px', width: 'min(720px, 100%)',
        maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <h3 id="titulo-traslado" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Trasladar viaje a bus real</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
          {viaje.ciudadorigen} → {viaje.ciudaddestino} · {fechaCorta(viaje.fechasalida)} {hora12(viaje.horasalida)} ·
          semilla <strong>{viaje.numeromovil}</strong> · {viaje.asientosvendidos} asiento(s) vendido(s)
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); setMapeo({}); void evaluar({}); }}
          style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
        >
          <input
            autoFocus
            value={movil}
            onChange={(e) => { setMovil(e.target.value); setEvaluacion(null); }}
            placeholder="Número de móvil del bus real"
            aria-label="Número de móvil del bus real"
            style={{ ...input, flex: 1 }}
          />
          <button type="submit" disabled={!movil.trim() || evaluando} style={boton('secundario', !movil.trim() || evaluando)}>
            {evaluando ? 'Verificando…' : 'Verificar'}
          </button>
        </form>

        {evaluacion && (
          <>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Bus {evaluacion.vehiculoReal.numeromovil} · {evaluacion.vehiculoReal.placa} · {evaluacion.vehiculoReal.capacidad} puestos
            </div>
            <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'grid', gap: '4px' }}>
              {evaluacion.verificaciones.map((v) => (
                <li key={v.clave} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: v.ok ? '#166534' : '#b91c1c' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{v.ok ? 'check_circle' : 'cancel'}</span>
                  <span>{v.mensaje}</span>
                </li>
              ))}
            </ul>

            {evaluacion.plan.vendidos.length > 0 && (
              <>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Asientos vendidos</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                  <thead>
                    <tr><th style={th}>Tiquete</th><th style={th}>Asiento semilla</th><th style={th}>Asiento en bus real</th></tr>
                  </thead>
                  <tbody>
                    {evaluacion.plan.vendidos.map((p) => (
                      <tr key={p.idtiquete} style={p.problema ? { background: '#fef2f2' } : undefined}>
                        <td style={td}>#{p.idtiquete}</td>
                        <td style={td}>{p.asientoAnterior}</td>
                        <td style={td}>
                          <select
                            value={p.asientoNuevo}
                            onChange={(e) => cambiarDestino(p.asientoAnterior, Number(e.target.value))}
                            aria-label={`Asiento en bus real para el tiquete ${p.idtiquete}`}
                            style={{ ...input, padding: '6px 8px', borderColor: p.problema ? '#fca5a5' : '#e2e8f0' }}
                          >
                            {!evaluacion.vehiculoReal.asientos.includes(p.asientoNuevo) && (
                              <option value={p.asientoNuevo}>{p.asientoNuevo} (no existe)</option>
                            )}
                            {[...new Set([p.asientoNuevo, ...asientosDisponibles])]
                              .filter((n) => evaluacion.vehiculoReal.asientos.includes(n))
                              .sort((a, b) => a - b)
                              .map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                          {p.problema && <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '3px' }}>{p.problema}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {error && (
          <div role="alert" style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onCerrar} style={boton('secundario')}>Cancelar</button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!evaluacion?.puedeTrasladar || trasladando || evaluando}
            style={boton('primario', !evaluacion?.puedeTrasladar || trasladando || evaluando)}
          >
            {trasladando ? 'Trasladando…' : 'Confirmar traslado'}
          </button>
        </div>
      </div>
    </div>
  );
};
