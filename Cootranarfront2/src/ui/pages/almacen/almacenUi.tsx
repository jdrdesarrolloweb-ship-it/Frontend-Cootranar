/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { almacenApi, type Bodega, type Id, type Producto } from '../../../infrastructure/services/almacenApi';
import { DatePicker } from '@/components/ui/date-picker';

/**
 * Kit visual y utilidades compartidas por las páginas del Almacén.
 * Sigue el estilo del panel (estilos en línea, azul institucional #0D3B8E).
 */

export const BLUE = '#0D3B8E';
export const RED = '#dc2626';

// ── Formatos ────────────────────────────────────────────────────────────────
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
export const money = (v: unknown) => fmtCOP.format(Number(v) || 0);
export const num = (v: unknown) => fmtNum.format(Number(v) || 0);
export const fecha = (v: unknown, conHora = true) => {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString('es-CO', conHora
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
};
export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const haceDiasISO = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export function errorMsg(e: unknown, defecto = 'Ocurrió un error') {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || defecto;
}

// ── Contexto de bodega (almacenista fija / admin elige) ─────────────────────
const CLAVE_BODEGA = 'cootranar_almacen_bodega';
const leerBodegaGuardada = (): Id | null => {
  try { const v = Number(localStorage.getItem(CLAVE_BODEGA)); return v > 0 ? v : null; } catch { return null; }
};
const useBodegaStore = create<{ idbodega: Id | null; set: (id: Id | null) => void }>((set) => ({
  idbodega: leerBodegaGuardada(),
  set: (id) => {
    try { if (id) localStorage.setItem(CLAVE_BODEGA, String(id)); else localStorage.removeItem(CLAVE_BODEGA); } catch { /* sin almacenamiento */ }
    set({ idbodega: id });
  },
}));

/**
 * Devuelve el contexto del almacén:
 *  - idbodega: bodega con la que se opera (la asignada al almacenista, o la elegida por el admin; null = todas).
 *  - idbodegaOperacion: igual que idbodega, pero el admin sin selección usa la primera bodega activa.
 */
export function useAlmacen() {
  const q = useQuery({ queryKey: ['almacen', 'contexto'], queryFn: almacenApi.contexto, staleTime: 60_000 });
  const elegida = useBodegaStore((s) => s.idbodega);
  const setBodega = useBodegaStore((s) => s.set);
  const ctx = q.data;
  const esAdmin = !!ctx?.esAdmin;
  const bodegas = useMemo(() => ctx?.bodegas ?? [], [ctx]);
  const bodegasActivas = useMemo(() => bodegas.filter((b) => b.activo), [bodegas]);
  const idbodega: Id | null = !ctx
    ? null
    : !esAdmin
      ? ctx.bodega?.idbodega ?? null
      : bodegas.some((b) => b.idbodega === elegida) ? elegida : null;
  const idbodegaOperacion = idbodega ?? (esAdmin ? bodegasActivas[0]?.idbodega ?? null : null);
  const bodegaActual: Bodega | undefined = bodegas.find((b) => b.idbodega === idbodegaOperacion) ?? ctx?.bodega ?? undefined;
  return {
    cargando: q.isLoading, error: q.error, esAdmin, bodegas, bodegasActivas,
    idbodega, idbodegaOperacion, bodegaActual, setBodega,
  };
}

/** Selector de bodega para el admin; para el almacenista muestra su bodega fija. */
export function BodegaSelector({ permitirTodas = true }: { permitirTodas?: boolean }) {
  const { esAdmin, bodegas, bodegasActivas, idbodega, idbodegaOperacion, bodegaActual, setBodega, cargando } = useAlmacen();
  if (cargando) return null;
  if (!esAdmin) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#eff6ff', color: BLUE, fontSize: 13, fontWeight: 700 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warehouse</span>
        {bodegaActual?.nombre ?? 'Sin bodega'}
      </span>
    );
  }
  const valor = permitirTodas ? idbodega ?? '' : idbodegaOperacion ?? '';
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 600 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: BLUE }}>warehouse</span>
      <select value={valor} onChange={(e) => setBodega(e.target.value ? Number(e.target.value) : null)}
        style={{ ...inputStyle, width: 'auto', minWidth: 200, padding: '7px 10px' }} aria-label="Bodega">
        {permitirTodas && <option value="">Todas las bodegas</option>}
        {(permitirTodas ? bodegas : bodegasActivas).map((b) => (
          <option key={b.idbodega} value={b.idbodega}>{b.nombre}{b.activo ? '' : ' (inactiva)'}</option>
        ))}
      </select>
    </label>
  );
}

// ── Componentes base ────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 7,
  fontSize: 13, color: '#334155', outline: 'none', background: 'white', fontFamily: 'inherit',
};

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e8edf2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20, ...style }}>
      {children}
    </div>
  );
}

export function CardHeader({ icon, title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 20, color: BLUE }}>{icon}</span>}
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{title}</span>
      </div>
      {children && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>}
    </div>
  );
}

export function Field({ label, required, children, style }: { label: string; required?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label} {required && <span style={{ color: RED }}>*</span>}
      </span>
      {children}
    </label>
  );
}

export function Grid({ cols = 4, children, style }: { cols?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${cols >= 4 ? 170 : 220}px, 1fr))`, gap: 14, ...style }}>{children}</div>;
}

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
const variantes: Record<Variante, React.CSSProperties> = {
  primary: { background: BLUE, color: 'white', border: `1px solid ${BLUE}` },
  secondary: { background: 'white', color: '#334155', border: '1px solid #cbd5e1' },
  danger: { background: 'white', color: RED, border: '1px solid #fecaca' },
  success: { background: '#15803d', color: 'white', border: '1px solid #15803d' },
  ghost: { background: 'transparent', color: '#64748b', border: '1px solid transparent' },
};

export function Btn({ children, icon, variant = 'primary', disabled, onClick, type = 'button', title, small }: {
  children?: React.ReactNode; icon?: string; variant?: Variante; disabled?: boolean; title?: string; small?: boolean;
  onClick?: () => void; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 7,
        padding: small ? '5px 9px' : '9px 16px', fontSize: small ? 12 : 13, fontWeight: 700, fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, whiteSpace: 'nowrap', ...variantes[variant],
      }}>
      {icon && <span className="material-symbols-outlined" style={{ fontSize: small ? 16 : 18 }}>{icon}</span>}
      {children}
    </button>
  );
}

const tonos = {
  green: ['#dcfce7', '#15803d'], red: ['#fee2e2', '#b91c1c'], blue: ['#dbeafe', '#1d4ed8'],
  amber: ['#fef3c7', '#b45309'], gray: ['#f1f5f9', '#475569'],
} as const;
export function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: keyof typeof tonos }) {
  const [bg, color] = tonos[tone];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: bg, color, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function Alerta({ msg, onClose }: { msg: { tipo: 'ok' | 'err'; texto: string } | null; onClose?: () => void }) {
  if (!msg) return null;
  const ok = msg.tipo === 'ok';
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600,
      background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#b91c1c', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}` }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ok ? 'check_circle' : 'error'}</span>
      <span style={{ flex: 1 }}>{msg.texto}</span>
      {onClose && <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span></button>}
    </div>
  );
}

/** Mensaje temporal (se oculta solo a los 4 s si es de éxito). */
export function useMensaje() {
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  useEffect(() => {
    if (msg?.tipo !== 'ok') return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  return {
    msg, cerrar: () => setMsg(null),
    ok: (texto: string) => setMsg({ tipo: 'ok', texto }),
    err: (e: unknown, defecto?: string) => setMsg({ tipo: 'err', texto: errorMsg(e, defecto) }),
  };
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
      {tabs.map((t) => {
        const activo = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={activo} onClick={() => onChange(t.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              color: activo ? BLUE : '#64748b', borderBottom: `2px solid ${activo ? BLUE : 'transparent'}`, marginBottom: -1 }}>
            {t.icon && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ titulo, onClose, children, ancho = 720 }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: number }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: ancho, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{titulo}</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export interface Columna<T> { label: string; render: (fila: T) => React.ReactNode; align?: 'left' | 'right' | 'center'; width?: number | string }

export function Tabla<T>({ columnas, filas, clave, cargando, vacio = 'Sin registros', onFila }: {
  columnas: Columna<T>[]; filas: T[]; clave: (f: T) => React.Key; cargando?: boolean; vacio?: string; onFila?: (f: T) => void;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columnas.map((c) => (
              <th key={c.label} style={{ padding: '10px 14px', textAlign: c.align ?? 'left', fontSize: 10.5, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #e8edf2', width: c.width, whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan={columnas.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Cargando…</td></tr>
          ) : filas.length === 0 ? (
            <tr><td colSpan={columnas.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{vacio}</td></tr>
          ) : filas.map((f) => (
            <tr key={clave(f)} onClick={onFila ? () => onFila(f) : undefined}
              style={{ borderBottom: '1px solid #f1f5f9', cursor: onFila ? 'pointer' : 'default' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
              {columnas.map((c) => (
                <td key={c.label} style={{ padding: '10px 14px', fontSize: 13, color: '#334155', textAlign: c.align ?? 'left', verticalAlign: 'middle' }}>{c.render(f)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Paginador({ pagina, totalPaginas, total, onCambio }: { pagina: number; totalPaginas: number; total: number; onCambio: (p: number) => void }) {
  if (totalPaginas <= 1) return total ? <div style={{ padding: '10px 16px', fontSize: 12.5, color: '#94a3b8' }}>{total} registro(s)</div> : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12.5, color: '#94a3b8' }}>
      <span>{total} registro(s) · página {pagina} de {totalPaginas}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn small variant="secondary" icon="chevron_left" disabled={pagina <= 1} onClick={() => onCambio(pagina - 1)} title="Anterior" />
        <Btn small variant="secondary" icon="chevron_right" disabled={pagina >= totalPaginas} onClick={() => onCambio(pagina + 1)} title="Siguiente" />
      </div>
    </div>
  );
}

export function StatCard({ icon, label, valor, detalle, tone = BLUE }: { icon: string; label: string; valor: React.ReactNode; detalle?: React.ReactNode; tone?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e8edf2', padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 24, color: tone, background: `${tone}14`, borderRadius: 10, padding: 10 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
        {detalle && <div style={{ fontSize: 12, color: '#94a3b8' }}>{detalle}</div>}
      </div>
    </div>
  );
}

export function FiltroFechas({ desde, hasta, onDesde, onHasta }: { desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ width: '140px' }}>
        <DatePicker value={desde} max={hasta} onChange={onDesde} inputClassName="h-[34px] text-xs rounded-lg" placeholder="Desde" />
      </div>
      <div style={{ width: '140px' }}>
        <DatePicker value={hasta} min={desde} onChange={onHasta} inputClassName="h-[34px] text-xs rounded-lg" placeholder="Hasta" />
      </div>
    </div>
  );
}

// ── Buscador de productos (texto o lector de código de barras) ──────────────
export function ProductoPicker({ idbodega, onSelect, soloConStock = false, placeholder, autoFocus }: {
  idbodega: Id | null; onSelect: (p: Producto) => void; soloConStock?: boolean; placeholder?: string; autoFocus?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [debounced, setDebounced] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(texto.trim()), 250); return () => clearTimeout(t); }, [texto]);
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const q = useQuery({
    queryKey: ['almacen', 'picker', debounced, idbodega, soloConStock],
    queryFn: () => almacenApi.productos({ busqueda: debounced, idbodega, estado: 'activos', limit: 8, conStock: soloConStock ? 'true' : undefined }),
    enabled: debounced.length >= 2,
  });

  const elegir = (p: Producto) => { onSelect(p); setTexto(''); setAbierto(false); setError(''); };

  /** Enter: intenta coincidencia exacta por código / código de barras (lectores). */
  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const codigo = texto.trim();
    if (!codigo) return;
    try {
      elegir(await almacenApi.productoPorCodigo(codigo, idbodega));
    } catch {
      const unico = q.data?.items.length === 1 ? q.data.items[0] : undefined;
      if (unico) elegir(unico); else setError('No hay un producto con ese código exacto');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: 9, fontSize: 19, color: '#94a3b8' }}>barcode_scanner</span>
      <input value={texto} autoFocus={autoFocus} onChange={(e) => { setTexto(e.target.value); setAbierto(true); setError(''); }}
        onFocus={() => setAbierto(true)} onKeyDown={onKeyDown}
        placeholder={placeholder ?? 'Buscar por nombre, código, marca o escanear código de barras…'}
        style={{ ...inputStyle, paddingLeft: 36 }} aria-label="Buscar producto" />
      {error && <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{error}</div>}
      {abierto && debounced.length >= 2 && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.12)', maxHeight: 320, overflowY: 'auto' }}>
          {q.isLoading ? <div style={{ padding: 12, fontSize: 13, color: '#94a3b8' }}>Buscando…</div>
            : !q.data?.items.length ? <div style={{ padding: 12, fontSize: 13, color: '#94a3b8' }}>Sin resultados</div>
              : q.data.items.map((p) => {
                const stock = Number(p.stock ?? 0);
                return (
                  <button key={p.idproducto} type="button" onClick={() => elegir(p)}
                    style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 10, padding: '9px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.nombre}</span>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>{p.codigo}{p.marca ? ` · ${p.marca}` : ''} · {money(p.precioventa)}</span>
                    </span>
                    <Badge tone={stock <= 0 ? 'red' : stock <= Number(p.stockminimo) ? 'amber' : 'green'}>{num(stock)} {p.unidadmedida.toLowerCase()}</Badge>
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}

/** Buscador de vehículos de la flota por placa o número móvil. */
export function VehiculoPicker({ value, onChange }: { value: { idvehiculo: Id; placa: string } | null; onChange: (v: { idvehiculo: Id; placa: string; numeromovil?: string } | null) => void }) {
  const [texto, setTexto] = useState('');
  const q = useQuery({ queryKey: ['almacen', 'vehiculos', texto], queryFn: () => almacenApi.vehiculos(texto), staleTime: 30_000 });
  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge tone="blue">{value.placa}</Badge>
        <Btn small variant="ghost" icon="close" onClick={() => onChange(null)} title="Cambiar vehículo" />
      </div>
    );
  }
  return (
    <div>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Placa o número móvil" style={inputStyle} aria-label="Buscar vehículo" />
      {texto.trim().length >= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {(q.data ?? []).slice(0, 10).map((v) => (
            <Btn key={v.idvehiculo} small variant="secondary" onClick={() => onChange(v)}>
              {v.placa}{v.numeromovil ? ` · ${v.numeromovil}` : ''}
            </Btn>
          ))}
          {q.data && !q.data.length && <span style={{ fontSize: 12, color: '#94a3b8' }}>Sin coincidencias</span>}
        </div>
      )}
    </div>
  );
}

// ── Exportar a Excel ────────────────────────────────────────────────────────
export async function exportarExcel(nombreArchivo: string, hojas: { nombre: string; filas: Record<string, unknown>[] }[]) {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  for (const h of hojas) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(h.filas.length ? h.filas : [{ Info: 'Sin datos' }]), h.nombre.slice(0, 31));
  }
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

// ── Recibo de venta imprimible ──────────────────────────────────────────────
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function imprimirRecibo(v: any) {
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) { window.alert('Permite las ventanas emergentes para imprimir el recibo.'); return; }
  const filas = (v.items ?? []).map((i: any) => `
    <tr><td colspan="3">${esc(i.nombre)}</td></tr>
    <tr class="sub"><td>${esc(num(i.cantidad))} x ${esc(money(i.preciounitario))}</td><td></td><td class="r">${esc(money(i.total))}</td></tr>`).join('');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${esc(v.consecutivo)}</title>
    <style>body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;margin:16px;color:#000}h1{font-size:15px;margin:0}
    .c{text-align:center}.r{text-align:right}table{width:100%;border-collapse:collapse}td{padding:2px 0}.sub td{color:#333;padding-bottom:6px}
    hr{border:none;border-top:1px dashed #000;margin:8px 0}.cufe{font-size:9px;word-break:break-all}.tot td{font-weight:bold;font-size:13px}.anulada{border:2px solid #000;padding:4px;text-align:center;font-weight:bold;margin:8px 0}</style>
    </head><body>
    <div class="c"><h1>COOTRANAR</h1><div>Almacén de repuestos y lubricantes</div><div>${esc(v.nombrebodega)} · ${esc(v.nombreciudad)}</div>
    ${v.direccionbodega ? `<div>${esc(v.direccionbodega)}</div>` : ''}${v.telefonobodega ? `<div>Tel. ${esc(v.telefonobodega)}</div>` : ''}</div>
    <hr>${v.numerofactura
      ? `<div class="c"><b>FACTURA ELECTRÓNICA DE VENTA</b></div><div class="c"><b>${esc(v.numerofactura)}</b></div>`
      : `<div class="c"><b>COMPROBANTE DE VENTA</b></div>`}
    <div>Recibo interno: <b>${esc(v.consecutivo)}</b></div><div>Fecha: ${esc(fecha(v.fechaventa))}</div>
    <div>Cliente: ${esc(v.nombrecliente)}${v.documentocliente ? ` · ${esc(v.documentocliente)}` : ''}</div>
    <div>Tipo: ${v.tipocliente === 'SOCIO' ? 'Socio' : 'Público'}${v.placa ? ` · Vehículo ${esc(v.placa)}` : ''}</div>
    <div>Pago: ${v.formapago === 'CREDITO' ? 'Crédito (cuenta del socio)' : esc(v.metodopago ?? 'Contado')}</div>
    ${v.estado === 'ANULADA' ? `<div class="anulada">VENTA ANULADA</div>` : ''}
    <hr><table>${filas}</table><hr>
    <table><tr><td>Subtotal</td><td class="r">${esc(money(v.subtotal))}</td></tr><tr><td>IVA</td><td class="r">${esc(money(v.iva))}</td></tr>
    <tr class="tot"><td>TOTAL</td><td class="r">${esc(money(v.total))}</td></tr></table>
    <hr>${v.numerofactura
      ? `<div class="c">CUFE:</div><div class="c cufe">${esc(v.cufe)}</div>
         ${v.qrfactura ? `<div class="c"><img src="${esc(v.qrfactura)}" width="150" height="150" alt="QR DIAN"></div>` : ''}
         <div class="c">Verifique esta factura en el portal de la DIAN escaneando el código QR.</div>
         ${v.numeronotacredito ? `<div class="anulada">Anulada con nota crédito ${esc(v.numeronotacredito)}</div>` : ''}`
      : `<div class="c">Factura electrónica en trámite. Este comprobante no reemplaza la factura electrónica.</div>`}
    <div class="c">Atendido por ${esc(v.vendedor)}</div>
    <script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
}

/** Estado de la factura electrónica DIAN de una venta. */
export function EstadoFactura({ v }: { v: { estadofactura?: string; numerofactura?: string | null } }) {
  if (v.estadofactura === 'APROBADA') return <Badge tone="green">{v.numerofactura}</Badge>;
  if (v.estadofactura === 'ERROR') return <Badge tone="red">Error DIAN</Badge>;
  return <Badge tone="amber">Pendiente</Badge>;
}

/** Pide un motivo (obligatorio) para anular. Devuelve null si se cancela. */
export function pedirMotivo(accion: string): string | null {
  const m = window.prompt(`Motivo para ${accion}:`);
  if (m === null) return null;
  if (!m.trim()) { window.alert('El motivo es obligatorio.'); return null; }
  return m.trim();
}

export const UNIDADES = ['UNIDAD', 'LITRO', 'GALON', 'CUARTO', 'JUEGO', 'METRO', 'KIT', 'CANECA'];
