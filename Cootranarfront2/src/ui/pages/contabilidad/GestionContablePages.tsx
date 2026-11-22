import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont, type Cuenta } from '../../../infrastructure/services/contabilidadApi';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Alerta, Badge, Btn, Card, CardHeader, CentroSelect, CuentaSelect, Field, Grid, Kpi, MESES, Modal, Tabla, TerceroPicker, Valor,
  exportarExcel, hoyCO, inputStyle, money, pedirMotivo, useMensaje,
} from './contUi';
import { NominaElectronicaPanel } from './NominaElectronica';

// ════════════════════════════════════════════════════════════════════════════
// ACTIVOS FIJOS
// ════════════════════════════════════════════════════════════════════════════
export const ActivosPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'activos'], queryFn: () => cont.get<any[]>('/activos') });
  const [form, setForm] = useState<any | null>(null);
  const [per, setPer] = useState({ anio: Number(hoyCO().slice(0, 4)), mes: Number(hoyCO().slice(5, 7)) });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const guardar = useMutation({
    mutationFn: () => (form.idactivo ? cont.put(`/activos/${form.idactivo}`, form) : cont.post('/activos', form)),
    onSuccess: () => { m.ok('Activo guardado'); setForm(null); invalidar(); }, onError: (e) => m.err(e),
  });
  const depreciar = useMutation({
    mutationFn: () => cont.post('/activos/depreciar', per),
    onSuccess: (r: any) => { if (r.activos) m.ok(`Depreciación ${per.anio}-${per.mes}: ${r.activos} activo(s), ${money(r.total)} (DP-${r.numero})`); else m.ok(r.mensaje); invalidar(); },
    onError: (e) => m.err(e),
  });
  const baja = useMutation({ mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.post(`/activos/${id}/baja`, { motivo }), onSuccess: () => { m.ok('Activo dado de baja'); invalidar(); }, onError: (e) => m.err(e) });
  const lista = q.data ?? [];
  const tot = (k: string) => lista.filter((a) => a.estado === 'ACTIVO').reduce((s, a) => s + Number(a[k]), 0);
  const cta = (setter: (c: Cuenta | null) => void, value: number | null, prefijo: string) => <CuentaSelect value={value} filtro={(c) => c.codigo.startsWith(prefijo)} onChange={setter} />;
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Kpi label="Costo histórico" valor={money(tot('costo'))} /><Kpi label="Depreciación acumulada" valor={money(tot('depreciacionacumulada'))} />
        <Kpi label="Valor en libros" valor={money(tot('valorlibros'))} tono="#0D3B8E" />
      </div>
      <Card>
        <CardHeader icon="inventory_2" title="Activos fijos">
          <select value={per.mes} onChange={(e) => setPer({ ...per, mes: Number(e.target.value) })} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Mes">
            {MESES.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}
          </select>
          <input type="number" value={per.anio} onChange={(e) => setPer({ ...per, anio: Number(e.target.value) })} style={{ ...inputStyle, width: 90, padding: '7px 10px' }} aria-label="Año" />
          <Btn variant="secondary" icon="trending_down" disabled={depreciar.isPending} onClick={() => depreciar.mutate()}>Depreciar mes</Btn>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel('activos-fijos', [{ nombre: 'Activos', filas: lista.map((a) => ({ Código: a.codigo, Nombre: a.nombre, Categoría: a.categoria, Placa: a.placa ?? '', Adquisición: String(a.fechaadquisicion).slice(0, 10), Costo: Number(a.costo), 'Vida útil (meses)': a.vidautilmeses, 'Dep. acumulada': Number(a.depreciacionacumulada), 'Valor libros': a.valorlibros, Estado: a.estado })) }])}>Excel</Btn>
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', categoria: 'Flota', idvehiculo: null, idcentro: null, fechaadquisicion: hoyCO(), costo: '', valorresidual: 0, vidautilmeses: 120, idcuentaactivo: null, idcuentadepacum: null, idcuentagasto: null })}>Nuevo activo</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={lista} clave={(a: any) => a.idactivo} vacio="Registra los activos (buses, equipos, inmuebles)." columnas={[
          { label: 'Activo', render: (a: any) => <><b>{a.codigo}</b> · {a.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{a.categoria}{a.placa ? ` · ${a.placa}` : ''}{a.centro ? ` · ${a.centro}` : ''}</div></> },
          { label: 'Costo', align: 'right', render: (a: any) => money(a.costo) },
          { label: 'Dep. acumulada', align: 'right', render: (a: any) => money(a.depreciacionacumulada) },
          { label: 'Valor libros', align: 'right', render: (a: any) => <b>{money(a.valorlibros)}</b> },
          { label: 'Vida útil', render: (a: any) => `${a.vidautilmeses} meses` },
          { label: 'Estado', render: (a: any) => <Badge tone={a.estado === 'ACTIVO' ? 'green' : 'gray'}>{a.estado}</Badge> },
          {
            label: '', render: (a: any) => a.estado === 'ACTIVO' && <div style={{ display: 'flex', gap: 2 }}>
              <Btn small variant="ghost" icon="edit" onClick={() => setForm({ ...a, fechaadquisicion: String(a.fechaadquisicion).slice(0, 10) })} />
              <Btn small variant="ghost" icon="delete_forever" title="Dar de baja" onClick={() => { const mo = pedirMotivo(`dar de baja ${a.codigo}`); if (mo) baja.mutate({ id: a.idactivo, motivo: mo }); }} />
            </div>
          },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idactivo ? 'Editar activo' : 'Nuevo activo fijo'} onClose={() => setForm(null)} ancho={760}>
          <Grid>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Categoría" required><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha de adquisición" required>
              <DatePicker value={form.fechaadquisicion} onChange={(val) => setForm({ ...form, fechaadquisicion: val })} inputClassName="h-[36px] text-xs rounded-lg" />
            </Field>
            <Field label="Costo" required><input type="number" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Valor residual"><input type="number" value={form.valorresidual} onChange={(e) => setForm({ ...form, valorresidual: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vida útil (meses)" required><input type="number" value={form.vidautilmeses} onChange={(e) => setForm({ ...form, vidautilmeses: e.target.value })} style={inputStyle} /></Field>
            <Field label="Centro de costo"><CentroSelect value={form.idcentro} onChange={(id) => setForm({ ...form, idcentro: id })} /></Field>
          </Grid>
          <Grid cols={3} style={{ marginTop: 12 }}>
            <Field label="Cuenta del activo (15)" required>{cta((c) => setForm({ ...form, idcuentaactivo: c?.idcuenta ?? null }), form.idcuentaactivo, '15')}</Field>
            <Field label="Depreciación acumulada (1592)" required>{cta((c) => setForm({ ...form, idcuentadepacum: c?.idcuenta ?? null }), form.idcuentadepacum, '1592')}</Field>
            <Field label="Gasto depreciación (5160)" required>{cta((c) => setForm({ ...form, idcuentagasto: c?.idcuenta ?? null }), form.idcuentagasto, '516')}</Field>
          </Grid>
          <p style={{ fontSize: 12, color: '#64748b' }}>Método: línea recta. El registro de la compra del activo se hace con un comprobante manual.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || !(Number(form.costo) > 0) || !form.idcuentaactivo || !form.idcuentadepacum || !form.idcuentagasto || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PRESUPUESTOS
// ════════════════════════════════════════════════════════════════════════════
export const PresupuestosPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const [anio, setAnio] = useState(Number(hoyCO().slice(0, 4)));
  const [idcentro, setIdcentro] = useState<number | null>(null);
  const eje = useQuery({ queryKey: ['cont', 'ejecucion', anio, idcentro], queryFn: () => cont.get('/presupuestos/ejecucion', { anio, idcentro }) });
  const [form, setForm] = useState<{ idcuenta: number | null; meses: string[] } | null>(null);
  const guardar = useMutation({
    mutationFn: () => cont.put('/presupuestos', { anio, idcentro, idcuenta: form!.idcuenta, meses: form!.meses.map((v) => Number(v || 0)) }),
    onSuccess: () => { m.ok('Presupuesto guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'ejecucion'] }); }, onError: (e) => m.err(e),
  });
  const cuentas = eje.data?.cuentas ?? [];
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="savings" title="Presupuesto vs ejecutado">
          <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ ...inputStyle, width: 90, padding: '7px 10px' }} aria-label="Año" />
          <div style={{ width: 220 }}><CentroSelect value={idcentro} onChange={setIdcentro} /></div>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`presupuesto-${anio}`, [{ nombre: 'Ejecución', filas: cuentas.flatMap((c: any) => c.meses.map((x: any) => ({ Cuenta: c.codigo, Nombre: c.nombre, Mes: MESES[x.mes - 1], Presupuestado: x.presupuestado, Ejecutado: x.ejecutado, Variación: x.variacion }))) }])}>Excel</Btn>
          <Btn icon="add" onClick={() => setForm({ idcuenta: null, meses: Array(12).fill('') })}>Presupuestar cuenta</Btn>
        </CardHeader>
        <Tabla cargando={eje.isLoading} filas={cuentas} clave={(c: any) => c.idcuenta} vacio="Sin presupuesto para el año y centro seleccionados" columnas={[
          { label: 'Cuenta', render: (c: any) => <><b>{c.codigo}</b> {c.nombre}</> },
          { label: 'Presupuestado', align: 'right', render: (c: any) => money(c.presupuestado) },
          { label: 'Ejecutado', align: 'right', render: (c: any) => money(c.ejecutado) },
          { label: 'Variación', align: 'right', render: (c: any) => <Valor v={c.variacion} fuerte /> },
          { label: 'Cumplimiento', align: 'right', render: (c: any) => (c.cumplimiento === null ? '—' : <Badge tone={c.cumplimiento > 100 ? 'amber' : 'green'}>{c.cumplimiento}%</Badge>) },
          { label: '', render: (c: any) => <Btn small variant="ghost" icon="edit" onClick={() => setForm({ idcuenta: c.idcuenta, meses: c.meses.map((x: any) => (x.presupuestado ? String(x.presupuestado) : '')) })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={`Presupuesto ${anio}`} onClose={() => setForm(null)} ancho={760}>
          <Field label="Cuenta (ingresos, costos o gastos)" required><CuentaSelect value={form.idcuenta} filtro={(c) => /^[4567]/.test(c.codigo)} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
            {MESES.map((x, i) => (
              <Field key={x} label={x}><input type="number" min={0} value={form.meses[i]} onChange={(e) => setForm({ ...form, meses: form.meses.map((v, j) => (j === i ? e.target.value : v)) })} style={inputStyle} /></Field>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <Btn variant="ghost" onClick={() => { const v = window.prompt('Valor para todos los meses:'); if (v) setForm({ ...form, meses: Array(12).fill(v) }); }}>Mismo valor 12 meses</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn icon="save" disabled={!form.idcuenta || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// NÓMINA (CAUSACIÓN)
// ════════════════════════════════════════════════════════════════════════════
export const NominaPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const lista = useQuery({ queryKey: ['cont', 'nominas'], queryFn: () => cont.get<any[]>('/nominas') });
  const [ver, setVer] = useState<number | null>(null);
  const det = useQuery({ queryKey: ['cont', 'nomina', ver], queryFn: () => cont.get(`/nominas/${ver}`), enabled: !!ver });
  const [form, setForm] = useState<any | null>(null);
  const invalidar = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const guardar = useMutation({
    mutationFn: () => {
      const body = {
        anio: form.anio, mes: form.mes, descripcion: form.descripcion, fechapago: form.fechapago || null, empleados: form.empleados.map((e: any) => ({
          idtercero: e.tercero?.idtercero, documento: e.documento, nombre: e.nombre, idcentro: e.idcentro,
          salario: Number(e.salario || 0), auxtransporte: Number(e.auxtransporte || 0), otrosdevengos: Number(e.otrosdevengos || 0), otrasdeducciones: Number(e.otrasdeducciones || 0),
          diastrabajados: Number(e.diastrabajados || 30),
        }))
      };
      return form.idnomina ? cont.put(`/nominas/${form.idnomina}`, body) : cont.post('/nominas', body);
    },
    onSuccess: () => { m.ok('Nómina guardada en borrador'); setForm(null); invalidar(); }, onError: (e) => m.err(e),
  });
  const causar = useMutation({ mutationFn: (id: number) => cont.post(`/nominas/${id}/causar`), onSuccess: (r: any) => { m.ok(`Nómina causada (NO-${r.numero})`); invalidar(); det.refetch(); }, onError: (e) => m.err(e) });
  const anular = useMutation({ mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/nominas/${id}/anular`, { motivo }), onSuccess: (r: any) => { m.ok(r?.notasAjuste ? `Nómina anulada · ${r.notasAjuste} nota(s) de ajuste enviadas a la DIAN` : 'Nómina anulada'); invalidar(); det.refetch(); }, onError: (e) => m.err(e) });
  const empleadoVacio = () => ({ tercero: null, documento: '', nombre: '', idcentro: null, salario: '', auxtransporte: '', otrosdevengos: '', otrasdeducciones: '', diastrabajados: '30' });
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="badge" title="Causación de nómina">
          <Btn icon="add" onClick={() => setForm({ anio: Number(hoyCO().slice(0, 4)), mes: Number(hoyCO().slice(5, 7)), descripcion: 'Nómina mensual', empleados: [empleadoVacio()] })}>Nueva nómina</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12, color: '#64748b' }}>Registra la causación contable (gasto, deducciones, aportes y provisiones). Los porcentajes y el salario mínimo se ajustan en Configuración › Parámetros. Después de causarla, la nómina electrónica se transmite a la DIAN a través de Factus desde el detalle de la nómina.</p>
        <Tabla cargando={lista.isLoading} filas={lista.data ?? []} clave={(n: any) => n.idnomina} onFila={(n: any) => setVer(n.idnomina)} vacio="Sin nóminas" columnas={[
          { label: 'Período', render: (n: any) => `${n.anio}-${String(n.mes).padStart(2, '0')}` },
          { label: 'Descripción', render: (n: any) => n.descripcion },
          { label: 'Empleados', align: 'right', render: (n: any) => n.empleados },
          { label: 'Devengado', align: 'right', render: (n: any) => money(n.devengado) },
          { label: 'Comprobante', render: (n: any) => n.comprobante ?? '—' },
          { label: 'Estado', render: (n: any) => <Badge tone={n.estado === 'CAUSADA' ? 'green' : n.estado === 'BORRADOR' ? 'amber' : 'red'}>{n.estado}</Badge> },
        ]} />
      </Card>
      {ver && det.data && (
        <Modal titulo={`Nómina ${det.data.anio}-${String(det.data.mes).padStart(2, '0')} · ${det.data.descripcion}`} onClose={() => setVer(null)} ancho={1000}>
          <Tabla filas={det.data.detalle} clave={(d: any) => d.idtercero} columnas={[
            { label: 'Empleado', render: (d: any) => `${d.documento} · ${d.nombre}` },
            { label: 'Devengado', align: 'right', render: (d: any) => money(d.liquidacion.devengado) },
            { label: 'Salud', align: 'right', render: (d: any) => money(d.liquidacion.salud) },
            { label: 'Pensión', align: 'right', render: (d: any) => money(d.liquidacion.pension) },
            ...(det.data.detalle.some((d: any) => Number(d.liquidacion.solidaridad) > 0)
              ? [{ label: 'F. solidaridad', align: 'right' as const, render: (d: any) => money(d.liquidacion.solidaridad) }] : []),
            { label: 'Otras ded.', align: 'right', render: (d: any) => money(d.liquidacion.otrasdeducciones) },
            { label: 'Neto a pagar', align: 'right', render: (d: any) => <b>{money(d.liquidacion.neto)}</b> },
            { label: 'Aportes empleador', align: 'right', render: (d: any) => money(Object.values(d.liquidacion.empleador).reduce((a: number, v: any) => a + Number(v), 0)) },
            { label: 'Provisiones', align: 'right', render: (d: any) => money(Object.values(d.liquidacion.provisiones).reduce((a: number, v: any) => a + Number(v), 0)) },
          ]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            {det.data.estado === 'BORRADOR' && <>
              <Btn variant="secondary" icon="edit" onClick={() => {
                setForm({
                  idnomina: det.data.idnomina, anio: det.data.anio, mes: det.data.mes, descripcion: det.data.descripcion, fechapago: det.data.fechapago?.slice(0, 10) ?? '',
                  empleados: det.data.detalle.map((d: any) => ({ tercero: { idtercero: d.idtercero, documento: d.documento, nombre: d.nombre }, idcentro: d.idcentro, salario: String(Number(d.salario)), auxtransporte: String(Number(d.auxtransporte)), otrosdevengos: String(Number(d.otrosdevengos)), otrasdeducciones: String(Number(d.otrasdeducciones)), diastrabajados: String(d.diastrabajados ?? 30) }))
                }); setVer(null);
              }}>Editar</Btn>
              <Btn variant="success" icon="task_alt" disabled={causar.isPending} onClick={() => causar.mutate(det.data.idnomina)}>Causar</Btn>
            </>}
            {det.data.estado === 'CAUSADA' && <Btn variant="danger" icon="undo" disabled={anular.isPending} onClick={() => { const mo = pedirMotivo('anular la nómina (si ya fue validada por la DIAN se enviará una nota de ajuste de eliminación)'); if (mo) anular.mutate({ id: det.data.idnomina, motivo: mo }); }}>{anular.isPending ? 'Anulando…' : 'Anular (reverso)'}</Btn>}
          </div>
          <NominaElectronicaPanel idnomina={det.data.idnomina} estadoNomina={det.data.estado} ok={m.ok} err={m.err} />
        </Modal>
      )}
      {form && (
        <Modal titulo={form.idnomina ? 'Editar nómina' : 'Nueva nómina'} onClose={() => setForm(null)} ancho={1150}>
          <Grid cols={4}>
            <Field label="Año" required><input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: Number(e.target.value) })} style={inputStyle} /></Field>
            <Field label="Mes" required><select value={form.mes} onChange={(e) => setForm({ ...form, mes: Number(e.target.value) })} style={inputStyle}>{MESES.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}</select></Field>
            <Field label="Descripción" required><input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha de pago"><input type="date" value={form.fechapago ?? ''} onChange={(e) => setForm({ ...form, fechapago: e.target.value })} style={inputStyle} title="Por defecto, el último día del mes" /></Field>
          </Grid>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead><tr style={{ background: '#f8fafc', fontSize: 10.5, color: '#64748b', textTransform: 'uppercase' }}>
                {['Empleado (tercero o nuevo)', 'Centro', 'Días', 'Salario', 'Aux. transporte', 'Otros devengos', 'Otras deducciones', ''].map((h) => <th key={h} style={{ padding: 8, textAlign: 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {form.empleados.map((e: any, i: number) => {
                  const set = (c: any) => setForm({ ...form, empleados: form.empleados.map((x: any, j: number) => (j === i ? { ...x, ...c } : x)) });
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                      <td style={{ padding: 4, width: 280 }}>
                        <TerceroPicker value={e.tercero} onChange={(t) => set({ tercero: t })} placeholder="Buscar empleado…" />
                        {!e.tercero && <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <input value={e.documento} onChange={(ev) => set({ documento: ev.target.value })} placeholder="o cédula nueva" style={{ ...inputStyle, width: 110 }} />
                          <input value={e.nombre} onChange={(ev) => set({ nombre: ev.target.value })} placeholder="nombre" style={inputStyle} />
                        </div>}
                      </td>
                      <td style={{ padding: 4, width: 160 }}><CentroSelect value={e.idcentro} onChange={(id) => set({ idcentro: id })} /></td>
                      <td style={{ padding: 4, width: 64 }}><input type="number" min={1} max={30} value={e.diastrabajados ?? '30'} onChange={(ev) => set({ diastrabajados: ev.target.value })} style={{ ...inputStyle, textAlign: 'right' }} aria-label="días trabajados" /></td>
                      {(['salario', 'auxtransporte', 'otrosdevengos', 'otrasdeducciones'] as const).map((k) => (
                        <td key={k} style={{ padding: 4, width: 120 }}><input type="number" min={0} value={e[k]} onChange={(ev) => set({ [k]: ev.target.value })} style={{ ...inputStyle, textAlign: 'right' }} aria-label={k} /></td>
                      ))}
                      <td style={{ padding: 4 }}><Btn small variant="ghost" icon="delete" onClick={() => setForm({ ...form, empleados: form.empleados.filter((_: any, j: number) => j !== i) })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Btn variant="secondary" icon="person_add" onClick={() => setForm({ ...form, empleados: [...form.empleados, empleadoVacio()] })}>Empleado</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn icon="save" disabled={!form.empleados.length || form.empleados.some((e: any) => !e.tercero && (!e.documento || !e.nombre)) || guardar.isPending} onClick={() => guardar.mutate()}>Guardar borrador</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
