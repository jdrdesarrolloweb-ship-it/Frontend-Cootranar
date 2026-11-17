/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cont, type Centro, type Cuenta, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import { inputStyle, money, BLUE } from '../almacen/almacenUi';

export * from '../almacen/almacenUi';

/** Primer día del mes actual (hora Colombia). */
export const inicioMes = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 8) + '01';
export const hoyCO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Valor monetario con color (negativos en rojo) y cifras tabulares. */
export function Valor({ v, fuerte }: { v: unknown; fuerte?: boolean }) {
  const n = Number(v) || 0;
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: fuerte ? 800 : 500, color: n < 0 ? '#b91c1c' : 'inherit' }}>{money(n)}</span>;
}

export function useCuentasMovimiento() {
  // Endpoint disponible también para cajeros (selección de contrapartida en caja).
  return useQuery({ queryKey: ['cont', 'cuentas', 'mov'], queryFn: () => cont.get<Cuenta[]>('/caja/cuentas-contrapartida'), staleTime: 120_000 });
}
export function useCentros() {
  return useQuery({ queryKey: ['cont', 'centros'], queryFn: () => cont.get<Centro[]>('/centros'), staleTime: 120_000 });
}

/** Selector de cuenta de movimiento con búsqueda por código o nombre. */
export function CuentaSelect({ value, onChange, filtro, placeholder = 'Buscar cuenta…', soloCaja }: {
  value: number | null; onChange: (c: Cuenta | null) => void; filtro?: (c: Cuenta) => boolean; placeholder?: string; soloCaja?: boolean;
}) {
  const q = useCuentasMovimiento();
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const lista = useMemo(() => (q.data ?? []).filter((c) => (!filtro || filtro(c)) && (!soloCaja || c.codigo.startsWith('1105'))), [q.data, filtro, soloCaja]);
  const sel = lista.find((c) => c.idcuenta === value) ?? (q.data ?? []).find((c) => c.idcuenta === value);
  const t = texto.trim().toLowerCase();
  const opciones = (t ? lista.filter((c) => c.codigo.startsWith(t) || c.nombre.toLowerCase().includes(t)) : lista).slice(0, 40);
  return (
    <div style={{ position: 'relative' }}>
      <input value={abierto ? texto : sel ? `${sel.codigo} · ${sel.nombre}` : ''} placeholder={placeholder}
        onFocus={() => { setAbierto(true); setTexto(''); }} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onChange={(e) => setTexto(e.target.value)} style={inputStyle} aria-label="Cuenta" />
      {abierto && (
        <div style={{ position: 'absolute', zIndex: 40, top: '100%', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
          {opciones.map((c) => (
            <button key={c.idcuenta} type="button" onMouseDown={() => { onChange(c); setAbierto(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>
              <b style={{ color: BLUE }}>{c.codigo}</b> {c.nombre}
              {(c.exigetercero || c.exigecentro) && <span style={{ color: '#94a3b8' }}> · {[c.exigetercero && 'tercero', c.exigecentro && 'centro'].filter(Boolean).join(', ')}</span>}
            </button>
          ))}
          {!opciones.length && <div style={{ padding: 10, fontSize: 12.5, color: '#94a3b8' }}>Sin coincidencias</div>}
        </div>
      )}
    </div>
  );
}

/** Buscador de terceros (documento o nombre). */
export function TerceroPicker({ value, onChange, placeholder = 'Tercero (documento o nombre)…' }: {
  value: Tercero | null; onChange: (t: Tercero | null) => void; placeholder?: string;
}) {
  const [texto, setTexto] = useState('');
  const [deb, setDeb] = useState('');
  useEffect(() => { const t = setTimeout(() => setDeb(texto.trim()), 250); return () => clearTimeout(t); }, [texto]);
  const q = useQuery({ queryKey: ['cont', 'terceros', 'picker', deb], queryFn: () => cont.get('/terceros', { busqueda: deb, limit: 10 }), enabled: deb.length >= 2 });
  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...inputStyle, padding: '6px 10px' }}>
        <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.documento} · {value.nombre}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Quitar tercero" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} style={inputStyle} aria-label="Tercero" />
      {deb.length >= 2 && (
        <div style={{ position: 'absolute', zIndex: 40, top: '100%', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
          {(q.data?.items ?? []).map((t: Tercero) => (
            <button key={t.idtercero} type="button" onClick={() => { onChange(t); setTexto(''); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>
              <b>{t.documento}{t.dv !== null && t.dv !== undefined ? `-${t.dv}` : ''}</b> · {t.nombre}
            </button>
          ))}
          {q.data && !q.data.items.length && <div style={{ padding: 10, fontSize: 12.5, color: '#94a3b8' }}>Sin coincidencias</div>}
        </div>
      )}
    </div>
  );
}

export function CentroSelect({ value, onChange, permitirVacio = true }: { value: number | null; onChange: (id: number | null) => void; permitirVacio?: boolean }) {
  const q = useCentros();
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} style={inputStyle} aria-label="Centro de costo">
      {permitirVacio && <option value="">— Sin centro —</option>}
      {(q.data ?? []).filter((c) => c.activo).map((c) => <option key={c.idcentro} value={c.idcentro}>{c.codigo} · {c.nombre}</option>)}
    </select>
  );
}

/** Abre una ventana imprimible (estados financieros, certificados, reportes Z). */
export function imprimirDocumento(titulo: string, cuerpoHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=900');
  if (!w) { window.alert('Permite las ventanas emergentes para imprimir.'); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;margin:24px}h1{font-size:17px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}
    table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:4px 6px;border-bottom:1px solid #ddd;text-align:left}td.r,th.r{text-align:right}
    .tot td{font-weight:bold;border-top:2px solid #000}.muted{color:#555}</style></head><body>${cuerpoHtml}
    <script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
}

export const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Tabla HTML simple para imprimir. */
export function tablaHtml(columnas: { t: string; r?: boolean }[], filas: (string | number)[][], totales?: (string | number)[]) {
  return `<table><thead><tr>${columnas.map((c) => `<th class="${c.r ? 'r' : ''}">${escHtml(c.t)}</th>`).join('')}</tr></thead><tbody>
    ${filas.map((f) => `<tr>${f.map((v, i) => `<td class="${columnas[i]?.r ? 'r' : ''}">${escHtml(v)}</td>`).join('')}</tr>`).join('')}
    ${totales ? `<tr class="tot">${totales.map((v, i) => `<td class="${columnas[i]?.r ? 'r' : ''}">${escHtml(v)}</td>`).join('')}</tr>` : ''}
    </tbody></table>`;
}

export function Kpi({ label, valor, tono }: { label: string; valor: React.ReactNode; tono?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e8edf2', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tono ?? '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  );
}
