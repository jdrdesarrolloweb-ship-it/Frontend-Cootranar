import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cont, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Modal, Tabla, TerceroPicker,
  exportarExcel, fecha, hoyCO, inicioMes, inputStyle, money, useMensaje,
} from './contUi';

/**
 * Herramientas de Milenio:
 *  - Resoluciones DIAN (numeración con vigencia y consumo).
 *  - Unificar entidades (terceros o cuentas duplicados), con vista previa y deshacer.
 *  - Reasignar bases de impuestos (base de retención/IVA en movimientos ya registrados).
 *  - Niveles del PUC configurables.
 */

const errTxt = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Ocurrió un error';
const num = (v: unknown) => new Intl.NumberFormat('es-CO').format(Number(v) || 0);

// ════════════════════════════════════════════════════════════════════════════
// 1. RESOLUCIONES DIAN
// ════════════════════════════════════════════════════════════════════════════
const TIPOS_DOC: Record<string, string> = {
  FACTURA_VENTA: 'Factura de venta', NOTA_CREDITO: 'Nota crédito', NOTA_DEBITO: 'Nota débito', DOCUMENTO_SOPORTE: 'Documento soporte',
  NOTA_AJUSTE_SOPORTE: 'Nota de ajuste doc. soporte', NOMINA: 'Nómina electrónica', NOTA_AJUSTE_NOMINA: 'Nota de ajuste de nómina',
  DOCUMENTO_EQUIVALENTE: 'Documento equivalente (POS/tiquete)',
};
const MODULOS: Record<string, string> = { GENERAL: 'General', TIQUETES: 'Tiquetes', ENCOMIENDAS: 'Encomiendas', ALMACEN: 'Almacén', CONTABILIDAD: 'Contabilidad' };
const TONO_RES: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = { VIGENTE: 'green', ALERTA: 'amber', VENCIDA: 'red', AGOTADA: 'red', PENDIENTE: 'blue', INACTIVA: 'gray' };

export function ResolucionesPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [form, setForm] = useState<any | null>(null);
  const q = useQuery({ queryKey: ['cont', 'resoluciones'], queryFn: () => cont.get<any[]>('/resoluciones') });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont', 'resoluciones'] });
  const guardar = useMutation({
    mutationFn: () => (form.idresolucion ? cont.put(`/resoluciones/${form.idresolucion}`, form) : cont.post('/resoluciones', form)),
    onSuccess: () => { m.ok('Resolución guardada'); setForm(null); inv(); }, onError: (e) => m.err(e),
  });
  const sincronizar = useMutation({
    mutationFn: () => cont.post('/resoluciones/sincronizar', {}),
    onSuccess: (r: any) => { m.ok(`Factus: ${r.creadas} nueva(s), ${r.actualizadas} actualizada(s)${r.omitidos.length ? ` · omitidos: ${r.omitidos.join(', ')}` : ''}${r.avisos.length ? ` · ${r.avisos.join('; ')}` : ''}`); inv(); },
    onError: (e) => m.err(e),
  });
  const filas = q.data ?? [];
  const alertas = filas.filter((r) => ['ALERTA', 'VENCIDA', 'AGOTADA'].includes(r.estado) && r.activa);
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      {!!alertas.length && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
          <b>Atención:</b> {alertas.map((r) => `${TIPOS_DOC[r.tipodocumento]} ${r.prefijo ?? ''} — ${r.estado === 'ALERTA' ? r.alertas.join(' · ') : r.estado.toLowerCase()}`).join(' | ')}
        </div>
      )}
      <Card>
        <CardHeader icon="verified" title="Resoluciones de numeración DIAN">
          <Btn variant="secondary" icon="sync" disabled={sincronizar.isPending} onClick={() => sincronizar.mutate()}>{sincronizar.isPending ? 'Consultando Factus…' : 'Traer de Factus'}</Btn>
          <Btn icon="add" onClick={() => setForm({ tipodocumento: 'FACTURA_VENTA', modulo: 'GENERAL', numero: '', fecharesolucion: '', prefijo: '', desde: 1, hasta: '', consecutivoactual: '', vigenciadesde: hoyCO(), vigenciahasta: '', clavetecnica: '', idrangofactus: '', activa: true, observacion: '' })}>Nueva resolución</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Rangos autorizados por la DIAN para facturas, notas, documentos soporte y nómina. Se alerta cuando faltan pocos días para el vencimiento o se ha usado casi todo el rango (parámetros RESOLUCION_DIAS_ALERTA y RESOLUCION_PORC_ALERTA). La nómina electrónica toma el rango de Factus de la resolución vigente.</p>
        <Tabla cargando={q.isLoading} filas={filas} clave={(r: any) => r.idresolucion} vacio="Sin resoluciones registradas" columnas={[
          { label: 'Documento', render: (r: any) => <><b>{TIPOS_DOC[r.tipodocumento]}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{MODULOS[r.modulo]}{r.numero ? ` · Res. ${r.numero}` : ''}</div></> },
          { label: 'Rango', render: (r: any) => <>{r.prefijo ?? ''} {num(r.desde)} – {num(r.hasta)}{r.idrangofactus && <div style={{ fontSize: 11, color: '#94a3b8' }}>Factus {r.idrangofactus}</div>}</> },
          { label: 'Usado', align: 'right', render: (r: any) => (r.porcentajeUsado === null ? '—' : <>{r.porcentajeUsado} %<div style={{ fontSize: 11, color: '#64748b' }}>quedan {num(r.disponibles)}</div></>) },
          { label: 'Vigencia', render: (r: any) => <>{r.vigenciadesde} → {r.vigenciahasta}<div style={{ fontSize: 11, color: r.diasRestantes <= 30 ? '#b45309' : '#64748b' }}>{r.diasRestantes >= 0 ? `${r.diasRestantes} días` : 'vencida'}</div></> },
          { label: 'Estado', render: (r: any) => <Badge tone={TONO_RES[r.estado]}>{r.estado}</Badge> },
          { label: '', render: (r: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...r, fecharesolucion: r.fecharesolucion ?? '', consecutivoactual: r.consecutivoactual ?? '' })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idresolucion ? 'Editar resolución' : 'Nueva resolución DIAN'} onClose={() => setForm(null)} ancho={780}>
          <Grid cols={3}>
            <Field label="Documento" required>
              <select value={form.tipodocumento} onChange={(e) => setForm({ ...form, tipodocumento: e.target.value })} style={inputStyle}>
                {Object.entries(TIPOS_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Módulo">
              <select value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} style={inputStyle}>
                {Object.entries(MODULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="N.º de resolución"><input value={form.numero ?? ''} onChange={(e) => setForm({ ...form, numero: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha de la resolución"><input type="date" value={form.fecharesolucion} onChange={(e) => setForm({ ...form, fecharesolucion: e.target.value })} style={inputStyle} /></Field>
            <Field label="Prefijo"><input value={form.prefijo ?? ''} onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })} style={inputStyle} /></Field>
            <Field label="Clave técnica"><input value={form.clavetecnica ?? ''} onChange={(e) => setForm({ ...form, clavetecnica: e.target.value })} style={inputStyle} /></Field>
            <Field label="Desde (número)" required><input type="number" min={0} value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} style={inputStyle} /></Field>
            <Field label="Hasta (número)" required><input type="number" min={0} value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} style={inputStyle} /></Field>
            <Field label="Último número usado"><input type="number" min={0} value={form.consecutivoactual} onChange={(e) => setForm({ ...form, consecutivoactual: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vigente desde" required><input type="date" value={form.vigenciadesde} onChange={(e) => setForm({ ...form, vigenciadesde: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vigente hasta" required><input type="date" value={form.vigenciahasta} onChange={(e) => setForm({ ...form, vigenciahasta: e.target.value })} style={inputStyle} /></Field>
            <Field label="Id del rango en Factus"><input value={form.idrangofactus ?? ''} onChange={(e) => setForm({ ...form, idrangofactus: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <Field label="Observación" style={{ marginTop: 12 }}><input value={form.observacion ?? ''} onChange={(e) => setForm({ ...form, observacion: e.target.value })} style={inputStyle} /></Field>
          <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa</label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={form.hasta === '' || !form.vigenciadesde || !form.vigenciahasta || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. UNIFICAR ENTIDADES
// ════════════════════════════════════════════════════════════════════════════
export function UnificarPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [tipo, setTipo] = useState<'TERCERO' | 'CUENTA'>('TERCERO');
  const [ter, setTer] = useState<{ origen: Tercero | null; destino: Tercero | null }>({ origen: null, destino: null });
  const [cta, setCta] = useState<{ origen: number | null; destino: number | null }>({ origen: null, destino: null });
  const [motivo, setMotivo] = useState('');
  const ids = tipo === 'TERCERO' ? { idorigen: ter.origen?.idtercero, iddestino: ter.destino?.idtercero } : { idorigen: cta.origen, iddestino: cta.destino };
  const listo = !!ids.idorigen && !!ids.iddestino && ids.idorigen !== ids.iddestino;
  const prev = useQuery({ queryKey: ['cont', 'unif', 'prev', tipo, ids], queryFn: () => cont.post('/unificaciones/previsualizar', { tipo, ...ids }), enabled: listo, retry: false });
  const hist = useQuery({ queryKey: ['cont', 'unif', 'hist'], queryFn: () => cont.get<any[]>('/unificaciones') });
  const dups = useQuery({ queryKey: ['cont', 'unif', 'dups'], queryFn: () => cont.get<any[]>('/unificaciones/duplicados'), enabled: tipo === 'TERCERO' });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const aplicar = useMutation({
    mutationFn: () => cont.post('/unificaciones', { tipo, ...ids, motivo }),
    onSuccess: (r: any) => { m.ok(`Unificado: ${r.filas} registro(s) pasaron a ${r.descripciondestino}`); setTer({ origen: null, destino: null }); setCta({ origen: null, destino: null }); setMotivo(''); inv(); },
    onError: (e) => m.err(e),
  });
  const deshacer = useMutation({ mutationFn: (id: number) => cont.post(`/unificaciones/${id}/deshacer`, {}), onSuccess: () => { m.ok('Unificación deshecha'); inv(); }, onError: (e) => m.err(e) });
  const p: any = prev.data;
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="merge" title="Unificar entidades duplicadas">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Tipo">
            <option value="TERCERO">Terceros</option><option value="CUENTA">Cuentas contables</option>
          </select>
        </CardHeader>
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Todos los movimientos y registros del duplicado pasan al que queda (también en períodos cerrados: solo cambia el {tipo === 'TERCERO' ? 'tercero' : 'código de cuenta'}, nunca los valores). El duplicado queda inactivo. La operación queda registrada y se puede deshacer.</p>
          <Grid cols={2}>
            <Field label={tipo === 'TERCERO' ? 'Tercero duplicado (se elimina)' : 'Cuenta duplicada (se elimina)'} required>
              {tipo === 'TERCERO' ? <TerceroPicker value={ter.origen} onChange={(t) => setTer({ ...ter, origen: t })} />
                : <CuentaSelect value={cta.origen} onChange={(c) => setCta({ ...cta, origen: c?.idcuenta ?? null })} />}
            </Field>
            <Field label={tipo === 'TERCERO' ? 'Tercero que queda' : 'Cuenta que queda'} required>
              {tipo === 'TERCERO' ? <TerceroPicker value={ter.destino} onChange={(t) => setTer({ ...ter, destino: t })} />
                : <CuentaSelect value={cta.destino} onChange={(c) => setCta({ ...cta, destino: c?.idcuenta ?? null })} />}
            </Field>
          </Grid>
          {prev.error && <div style={{ marginTop: 10 }}><Alerta msg={{ tipo: 'err', texto: errTxt(prev.error) }} /></div>}
          {p && (
            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
              <div><b>{p.origen.descripcion}</b> → <b>{p.destino.descripcion}</b></div>
              <div style={{ marginTop: 6 }}>{p.filas ? p.tablas.map((t: any) => `${t.tabla} (${t.columna}): ${t.filas}`).join(' · ') : 'El duplicado no tiene registros asociados.'}</div>
              {p.errores.map((x: string) => <div key={x} style={{ color: '#b91c1c', marginTop: 4 }}>✖ {x}</div>)}
              {p.avisos.map((x: string) => <div key={x} style={{ color: '#b45309', marginTop: 4 }}>⚠ {x}</div>)}
            </div>
          )}
          <Field label="Motivo" required style={{ marginTop: 12 }}><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Tercero creado dos veces con el documento con puntos" style={inputStyle} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn icon="merge" disabled={!p || p.errores.length > 0 || !motivo.trim() || aplicar.isPending} onClick={() => { if (window.confirm(`¿Unificar ${p.origen.descripcion} en ${p.destino.descripcion}?`)) aplicar.mutate(); }}>Unificar</Btn>
          </div>
        </div>
      </Card>
      {tipo === 'TERCERO' && !!dups.data?.length && (
        <Card style={{ marginTop: 16 }}>
          <CardHeader icon="content_copy" title={`Posibles terceros duplicados (${dups.data.length})`} />
          <Tabla filas={dups.data} clave={(d: any) => `${d.ida}-${d.idb}`} columnas={[
            { label: 'Tercero 1', render: (d: any) => <>{d.documentoa} · {d.nombrea}</> },
            { label: 'Tercero 2', render: (d: any) => <>{d.documentob} · {d.nombreb}</> },
            { label: 'Coincidencia', render: (d: any) => <Badge tone="amber">{d.motivo}</Badge> },
            { label: '', render: (d: any) => <Btn small variant="secondary" icon="arrow_upward" onClick={() => setTer({
              origen: { idtercero: d.idb, documento: d.documentob, nombre: d.nombreb } as Tercero, destino: { idtercero: d.ida, documento: d.documentoa, nombre: d.nombrea } as Tercero,
            })}>Revisar</Btn> },
          ]} />
        </Card>
      )}
      <Card style={{ marginTop: 16 }}>
        <CardHeader icon="history" title="Unificaciones realizadas" />
        <Tabla cargando={hist.isLoading} filas={hist.data ?? []} clave={(u: any) => u.idunificacion} vacio="Sin unificaciones" columnas={[
          { label: 'Fecha', render: (u: any) => fecha(u.fecha) },
          { label: 'Tipo', render: (u: any) => (u.tipo === 'TERCERO' ? 'Tercero' : 'Cuenta') },
          { label: 'Eliminado', render: (u: any) => u.descripcionorigen },
          { label: 'Queda', render: (u: any) => u.descripciondestino },
          { label: 'Registros', align: 'right', render: (u: any) => u.filas },
          { label: 'Motivo', render: (u: any) => <span style={{ fontSize: 12 }}>{u.motivo}<div style={{ color: '#94a3b8' }}>{u.usuario}</div></span> },
          { label: 'Estado', render: (u: any) => <Badge tone={u.estado === 'APLICADA' ? 'green' : 'gray'}>{u.estado}</Badge> },
          { label: '', render: (u: any) => u.estado === 'APLICADA' && <Btn small variant="ghost" icon="undo" title="Deshacer" onClick={() => { if (window.confirm('¿Deshacer esta unificación?')) deshacer.mutate(u.idunificacion); }} /> },
        ]} />
      </Card>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. REASIGNAR BASES DE IMPUESTOS
// ════════════════════════════════════════════════════════════════════════════
export function ReasignarBasesPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [f, setF] = useState<any>({ idcuenta: '', desde: inicioMes(), hasta: hoyCO(), soloSinBase: true, tarifa: '' });
  const [tercero, setTercero] = useState<Tercero | null>(null);
  const [nuevas, setNuevas] = useState<Record<number, string>>({});
  const [motivo, setMotivo] = useState('');
  const cuentas = useQuery({ queryKey: ['cont', 'bases', 'cuentas'], queryFn: () => cont.get<any[]>('/bases/cuentas') });
  const params = { idcuenta: f.idcuenta, desde: f.desde, hasta: f.hasta, soloSinBase: String(f.soloSinBase), tarifa: f.tarifa || undefined, idtercero: tercero?.idtercero };
  const movs = useQuery({ queryKey: ['cont', 'bases', 'movs', params], queryFn: () => cont.get<any[]>('/bases/movimientos', params), enabled: !!f.idcuenta });
  const lotes = useQuery({ queryKey: ['cont', 'bases', 'lotes'], queryFn: () => cont.get<any[]>('/bases/lotes') });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont', 'bases'] });
  const cambios = Object.entries(nuevas).filter(([, v]) => v !== '').map(([id, v]) => ({ idmovimiento: Number(id), base: Number(v) }));
  const aplicar = useMutation({
    mutationFn: () => cont.post('/bases/reasignar', { motivo, cambios }),
    onSuccess: (r: any) => { m.ok(`${r.cambiados} base(s) reasignada(s) · lote ${r.lote}`); setNuevas({}); setMotivo(''); inv(); }, onError: (e) => m.err(e),
  });
  const deshacer = useMutation({ mutationFn: (lote: number) => cont.post(`/bases/lotes/${lote}/deshacer`, {}), onSuccess: () => { m.ok('Reasignación deshecha'); inv(); }, onError: (e) => m.err(e) });
  const filas = movs.data ?? [];
  const usarSugeridas = () => setNuevas(Object.fromEntries(filas.filter((x) => x.sugerida !== null && x.diferente).map((x) => [x.idmovimiento, String(x.sugerida)])));
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="calculate" title="Reasignar bases de impuestos">
          <FiltroFechas desde={f.desde} hasta={f.hasta} onDesde={(v) => setF({ ...f, desde: v })} onHasta={(v) => setF({ ...f, hasta: v })} />
        </CardHeader>
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Corrige la base gravable de retenciones e IVA ya registradas (para certificados y exógena). Solo cambia la base, nunca los valores del comprobante. Cada cambio queda en un lote que se puede deshacer.</p>
          <Grid cols={4}>
            <Field label="Cuenta de impuesto" required>
              <select value={f.idcuenta} onChange={(e) => { setF({ ...f, idcuenta: e.target.value }); setNuevas({}); }} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {(cuentas.data ?? []).map((c) => <option key={c.idcuenta} value={c.idcuenta}>{c.codigo} · {c.impuesto} ({Number(c.tarifa)} %)</option>)}
              </select>
            </Field>
            <Field label="Tarifa para sugerir (%)"><input type="number" step="any" value={f.tarifa} onChange={(e) => setF({ ...f, tarifa: e.target.value })} placeholder="La del impuesto" style={inputStyle} /></Field>
            <Field label="Tercero"><TerceroPicker value={tercero} onChange={setTercero} /></Field>
            <Field label="Mostrar">
              <select value={f.soloSinBase ? '1' : '0'} onChange={(e) => setF({ ...f, soloSinBase: e.target.value === '1' })} style={inputStyle}><option value="1">Solo sin base</option><option value="0">Todos</option></select>
            </Field>
          </Grid>
          {!cuentas.isLoading && !cuentas.data?.length && <p style={{ fontSize: 12.5, color: '#b45309' }}>No hay impuestos configurados con cuenta (Impuestos › Configuración).</p>}
        </div>
        {f.idcuenta && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 20px' }}>
              <Btn small variant="secondary" icon="auto_fix_high" disabled={!filas.some((x) => x.diferente)} onClick={usarSugeridas}>Usar bases sugeridas</Btn>
              <Btn small variant="ghost" icon="download" onClick={() => exportarExcel('bases-impuestos', [{ nombre: 'Movimientos', filas: filas.map((x) => ({ Fecha: x.fecha, Comprobante: x.comprobante, Documento: x.documento, Tercero: x.tercero, Valor: x.valor, Base: x.base, Sugerida: x.sugerida })) }])}>Excel</Btn>
            </div>
            <Tabla cargando={movs.isLoading} filas={filas} clave={(x: any) => x.idmovimiento} vacio="No hay movimientos con esos filtros" columnas={[
              { label: 'Fecha', render: (x: any) => x.fecha },
              { label: 'Comprobante', render: (x: any) => <>{x.comprobante}{x.estado === 'BORRADOR' && <Badge tone="amber">Borrador</Badge>}</> },
              { label: 'Tercero', render: (x: any) => <>{x.tercero ?? '—'}<div style={{ fontSize: 11, color: '#94a3b8' }}>{x.documento}</div></> },
              { label: 'Valor impuesto', align: 'right', render: (x: any) => money(x.valor) },
              { label: 'Base actual', align: 'right', render: (x: any) => (x.base === null ? <span style={{ color: '#b45309' }}>sin base</span> : money(x.base)) },
              { label: 'Sugerida', align: 'right', render: (x: any) => (x.sugerida === null ? '—' : <span style={{ color: x.diferente ? '#b45309' : '#64748b' }}>{money(x.sugerida)}</span>) },
              { label: 'Nueva base', render: (x: any) => <input type="number" min={0} value={nuevas[x.idmovimiento] ?? ''} onChange={(e) => setNuevas({ ...nuevas, [x.idmovimiento]: e.target.value })} style={{ ...inputStyle, width: 130, textAlign: 'right' }} aria-label="Nueva base" /> },
            ]} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '12px 20px 18px' }}>
              <Field label="Motivo" required style={{ flex: 1 }}><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Bases para certificados de retención 2026" style={inputStyle} /></Field>
              <Btn icon="check" disabled={!cambios.length || !motivo.trim() || aplicar.isPending} onClick={() => aplicar.mutate()}>Reasignar {cambios.length} base(s)</Btn>
            </div>
          </>
        )}
      </Card>
      <Card style={{ marginTop: 16 }}>
        <CardHeader icon="history" title="Reasignaciones realizadas" />
        <Tabla cargando={lotes.isLoading} filas={lotes.data ?? []} clave={(l: any) => l.lote} vacio="Sin reasignaciones" columnas={[
          { label: 'Lote', render: (l: any) => <b>{l.lote}</b> },
          { label: 'Fecha', render: (l: any) => fecha(l.fecha) },
          { label: 'Cuenta', render: (l: any) => l.cuenta },
          { label: 'Movimientos', align: 'right', render: (l: any) => l.movimientos },
          { label: 'Motivo', render: (l: any) => <span style={{ fontSize: 12 }}>{l.motivo}<div style={{ color: '#94a3b8' }}>{l.usuario}</div></span> },
          { label: 'Estado', render: (l: any) => <Badge tone={l.deshecho ? 'gray' : 'green'}>{l.deshecho ? 'Deshecho' : 'Aplicado'}</Badge> },
          { label: '', render: (l: any) => !l.deshecho && <Btn small variant="ghost" icon="undo" title="Deshacer" onClick={() => { if (window.confirm(`¿Deshacer el lote ${l.lote}?`)) deshacer.mutate(l.lote); }} /> },
        ]} />
      </Card>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. NIVELES DEL PUC
// ════════════════════════════════════════════════════════════════════════════
export function NivelesPucPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'niveles'], queryFn: () => cont.get<any>('/cuentas/niveles') });
  const [texto, setTexto] = useState<string | null>(null);
  const actual = (q.data?.niveles ?? []).map((n: any) => n.digitos).join(',');
  const valor = texto ?? actual;
  const guardar = useMutation({
    mutationFn: () => cont.put('/cuentas/niveles', { niveles: valor }),
    onSuccess: () => { m.ok('Niveles del PUC guardados'); setTexto(null); qc.invalidateQueries({ queryKey: ['cont'] }); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="stacked_bar_chart" title="Niveles del plan de cuentas" />
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Dígitos del código en cada nivel. Una cuenta nueva debe tener exactamente los dígitos de un nivel y su cuenta padre (el nivel anterior) debe existir. Se pueden agregar niveles más profundos (p. ej. 10 dígitos para auxiliares); no se puede quitar un nivel que ya tenga cuentas.</p>
          <Tabla cargando={q.isLoading} filas={q.data?.niveles ?? []} clave={(n: any) => n.nivel} columnas={[
            { label: 'Nivel', render: (n: any) => <b>{n.nivel}</b> },
            { label: 'Nombre', render: (n: any) => n.nombre },
            { label: 'Dígitos', align: 'right', render: (n: any) => n.digitos },
            { label: 'Ejemplo', render: (n: any) => '13809510'.padEnd(n.digitos, '0').slice(0, n.digitos) },
            { label: 'Cuentas', align: 'right', render: (n: any) => n.cuentas },
          ]} />
          {!!q.data?.fueraDeNivel?.length && <p style={{ fontSize: 12.5, color: '#b45309' }}>Hay cuentas con longitudes que no son de ningún nivel: {q.data.fueraDeNivel.map((x: any) => `${x.digitos} dígitos (${x.cuentas})`).join(', ')}.</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 12 }}>
            <Field label="Dígitos por nivel (separados por coma)" style={{ flex: 1 }}><input value={valor} onChange={(e) => setTexto(e.target.value)} placeholder="1,2,4,6,8" style={inputStyle} /></Field>
            <Btn icon="save" disabled={!valor || valor === actual || guardar.isPending} onClick={() => guardar.mutate()}>Guardar niveles</Btn>
          </div>
        </div>
      </Card>
    </>
  );
}
