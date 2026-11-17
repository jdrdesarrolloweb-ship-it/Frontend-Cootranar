import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont, type Cuenta } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Modal, Tabla, Tabs, Valor, exportarExcel, hoyCO,
  inputStyle, useMensaje,
} from './contUi';

export const PlanCuentasPage = () => {
  const [tab, setTab] = useState<'puc' | 'conceptos' | 'centros'>('puc');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'puc', label: 'Plan de cuentas', icon: 'account_tree' },
        { id: 'conceptos', label: 'Cuentas por operación', icon: 'tune' },
        { id: 'centros', label: 'Centros de costo', icon: 'hub' },
      ]} />
      {tab === 'puc' && <Puc />}
      {tab === 'conceptos' && <Conceptos />}
      {tab === 'centros' && <Centros />}
    </Layout>
  );
};

function Puc() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [busqueda, setBusqueda] = useState('');
  const [clase, setClase] = useState('');
  const [form, setForm] = useState<any | null>(null);
  const q = useQuery({ queryKey: ['cont', 'cuentas', 'puc', busqueda, clase], queryFn: () => cont.get<Cuenta[]>('/cuentas', { busqueda, clase }) });
  const guardar = useMutation({
    mutationFn: () => (form.idcuenta ? cont.put(`/cuentas/${form.idcuenta}`, form) : cont.post('/cuentas', form)),
    onSuccess: () => { m.ok('Cuenta guardada'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'cuentas'] }); },
    onError: (e) => m.err(e),
  });
  const lista = q.data ?? [];
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="account_tree" title="Plan único de cuentas">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Código o nombre" style={{ ...inputStyle, width: 200, padding: '7px 10px' }} />
          <select value={clase} onChange={(e) => setClase(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Clase">
            <option value="">Todas las clases</option>
            {['1 Activo', '2 Pasivo', '3 Patrimonio', '4 Ingresos', '5 Gastos', '6 Costos de ventas', '7 Costos de producción', '8 Orden deudoras', '9 Orden acreedoras'].map((c) => <option key={c} value={c[0]}>{c}</option>)}
          </select>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel('plan-de-cuentas', [{ nombre: 'PUC', filas: lista.map((c) => ({ Código: c.codigo, Nombre: c.nombre, Nivel: c.nivel, Naturaleza: c.naturaleza, Movimiento: c.esmovimiento ? 'Sí' : 'No', Tercero: c.exigetercero ? 'Sí' : 'No', Centro: c.exigecentro ? 'Sí' : 'No', Activa: c.activa ? 'Sí' : 'No' })) }])}>Excel</Btn>
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', naturaleza: '', esmovimiento: true, exigetercero: false, exigecentro: false })}>Nueva cuenta</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={lista} clave={(c) => c.idcuenta} columnas={[
          { label: 'Código', render: (c) => <b>{c.codigo}</b> },
          { label: 'Nombre', render: (c) => <span style={{ paddingLeft: (c.nivel - 1) * 12, fontWeight: c.nivel <= 2 ? 700 : 400, color: c.activa ? undefined : '#94a3b8' }}>{c.nombre}</span> },
          { label: 'Nat.', render: (c) => (c.naturaleza === 'D' ? 'Débito' : 'Crédito') },
          { label: 'Tipo', render: (c) => (c.esmovimiento ? <Badge tone="blue">Movimiento</Badge> : <Badge>Mayor</Badge>) },
          { label: 'Exige', render: (c) => [c.exigetercero && 'Tercero', c.exigecentro && 'Centro'].filter(Boolean).join(', ') || '—' },
          { label: 'Estado', render: (c) => <Badge tone={c.activa ? 'green' : 'red'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge> },
          { label: '', render: (c) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...c })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idcuenta ? `Cuenta ${form.codigo}` : 'Nueva cuenta'} onClose={() => setForm(null)} ancho={620}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} disabled={!!form.idcuenta} onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, '') })} placeholder="Ej. 11050501" style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Naturaleza">
              <select value={form.naturaleza} onChange={(e) => setForm({ ...form, naturaleza: e.target.value })} style={inputStyle}>
                <option value="">Igual a la cuenta padre</option><option value="D">Débito</option><option value="C">Crédito</option>
              </select>
            </Field>
          </Grid>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 13 }}>
            {(['esmovimiento', 'exigetercero', 'exigecentro', ...(form.idcuenta ? ['activa'] : [])] as const).map((k) => (
              <label key={k} style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                {{ esmovimiento: 'Cuenta de movimiento', exigetercero: 'Exige tercero', exigecentro: 'Exige centro de costo', activa: 'Activa' }[k]}</label>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#64748b' }}>Las cuentas con movimientos no pueden cambiar de naturaleza ni dejar de ser de movimiento.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Conceptos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'parametros'], queryFn: () => cont.get('/parametros') });
  const [edit, setEdit] = useState<{ concepto: string; idcuenta: number | null } | null>(null);
  const guardar = useMutation({
    mutationFn: () => cont.put(`/conceptos/${edit!.concepto}`, { idcuenta: edit!.idcuenta }),
    onSuccess: () => { m.ok('Concepto reasignado'); setEdit(null); qc.invalidateQueries({ queryKey: ['cont', 'parametros'] }); },
    onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="tune" title="Cuenta contable de cada operación automática" />
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Las integraciones (ventas, compras, caja, tiquetes, nómina…) usan estos conceptos. Cambiar una cuenta afecta solo los registros futuros.</p>
        <Tabla cargando={q.isLoading} filas={q.data?.conceptos ?? []} clave={(c: any) => c.concepto} columnas={[
          { label: 'Concepto', render: (c: any) => <><b>{c.concepto}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{c.descripcion}</div></> },
          { label: 'Cuenta', render: (c: any) => `${c.codigo} · ${c.nombre}` },
          { label: '', render: (c: any) => <Btn small variant="ghost" icon="edit" title="Cambiar cuenta" onClick={() => setEdit({ concepto: c.concepto, idcuenta: c.idcuenta })} /> },
        ]} />
      </Card>
      {edit && (
        <Modal titulo={`Cuenta para ${edit.concepto}`} onClose={() => setEdit(null)} ancho={520}>
          <CuentaSelect value={edit.idcuenta} onChange={(c) => setEdit({ ...edit, idcuenta: c?.idcuenta ?? null })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setEdit(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!edit.idcuenta || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Centros() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(`${hoyCO().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoyCO());
  const centros = useQuery({ queryKey: ['cont', 'centros'], queryFn: () => cont.get<any[]>('/centros') });
  const rent = useQuery({ queryKey: ['cont', 'rentabilidad', desde, hasta], queryFn: () => cont.get('/centros/rentabilidad', { desde, hasta }) });
  const [form, setForm] = useState<any | null>(null);
  const guardar = useMutation({
    mutationFn: () => (form.idcentro ? cont.put(`/centros/${form.idcentro}`, form) : cont.post('/centros', form)),
    onSuccess: () => { m.ok('Centro guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'centros'] }); },
    onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="hub" title="Rentabilidad por centro de costo">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`rentabilidad-centros-${desde}-${hasta}`, [{ nombre: 'Centros', filas: (rent.data?.filas ?? []).map((r: any) => ({ Centro: r.codigo, Nombre: r.nombre, Ingresos: r.ingresos, Costos: r.costos, Gastos: r.gastos, Resultado: r.resultado, 'Margen %': r.margen })) }])}>Excel</Btn>
        </CardHeader>
        <Tabla cargando={rent.isLoading} filas={rent.data?.filas ?? []} clave={(r: any) => r.idcentro} vacio="Sin movimientos con centro de costo" columnas={[
          { label: 'Centro', render: (r: any) => <><b>{r.codigo}</b> {r.nombre}</> },
          { label: 'Ingresos', align: 'right', render: (r: any) => <Valor v={r.ingresos} /> },
          { label: 'Costos', align: 'right', render: (r: any) => <Valor v={r.costos} /> },
          { label: 'Gastos', align: 'right', render: (r: any) => <Valor v={r.gastos} /> },
          { label: 'Resultado', align: 'right', render: (r: any) => <Valor v={r.resultado} fuerte /> },
          { label: 'Margen', align: 'right', render: (r: any) => (r.margen === null ? '—' : `${r.margen}%`) },
        ]} />
      </Card>
      <Card>
        <CardHeader icon="list" title="Centros de costo">
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', idpadre: null, activo: true })}>Nuevo centro</Btn>
        </CardHeader>
        <Tabla cargando={centros.isLoading} filas={centros.data ?? []} clave={(c: any) => c.idcentro} columnas={[
          { label: 'Código', render: (c: any) => <b>{c.codigo}</b> },
          { label: 'Nombre', render: (c: any) => c.nombre },
          { label: 'Tipo', render: (c: any) => <Badge tone={c.tipo === 'GENERAL' ? 'gray' : 'blue'}>{c.tipo}</Badge> },
          { label: 'Padre', render: (c: any) => c.nombrepadre ?? '—' },
          { label: 'Estado', render: (c: any) => <Badge tone={c.activo ? 'green' : 'red'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: '', render: (c: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...c })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idcentro ? 'Editar centro' : 'Nuevo centro de costo'} onClose={() => setForm(null)} ancho={560}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Centro padre">
              <select value={form.idpadre ?? ''} onChange={(e) => setForm({ ...form, idpadre: e.target.value ? Number(e.target.value) : null })} style={inputStyle}>
                <option value="">— Ninguno —</option>{(centros.data ?? []).filter((c) => c.idcentro !== form.idcentro).map((c) => <option key={c.idcentro} value={c.idcentro}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </Field>
          </Grid>
          <label style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: 13 }}><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
