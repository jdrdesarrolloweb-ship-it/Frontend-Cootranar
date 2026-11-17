import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, Tabs, escHtml, exportarExcel,
  hoyCO, imprimirDocumento, inicioMes, inputStyle, money, tablaHtml, useMensaje,
} from './contUi';

type Tab = 'config' | 'iva' | 'retenciones' | 'exogena' | 'ica';

export const ImpuestosPage = () => {
  const [tab, setTab] = useState<Tab>('iva');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'iva', label: 'IVA', icon: 'percent' }, { id: 'retenciones', label: 'Retenciones y certificados', icon: 'receipt' },
        { id: 'exogena', label: 'Información exógena', icon: 'description' }, { id: 'ica', label: 'ICA', icon: 'location_city' },
        { id: 'config', label: 'Configuración', icon: 'settings' },
      ]} />
      <p style={{ fontSize: 12, color: '#64748b', marginTop: -6 }}>Informes de apoyo para las declaraciones. Deben ser revisados por el contador frente a las especificaciones vigentes de la DIAN y del municipio.</p>
      {tab === 'iva' && <Iva />}
      {tab === 'retenciones' && <Retenciones />}
      {tab === 'exogena' && <Exogena />}
      {tab === 'ica' && <Ica />}
      {tab === 'config' && <Config />}
    </Layout>
  );
};

function Iva() {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'iva', desde, hasta], queryFn: () => cont.get('/tributario/iva', { desde, hasta }) });
  const d = q.data;
  return (
    <Card>
      <CardHeader icon="percent" title="IVA del período"><FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} /></CardHeader>
      {d && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            <Kpi label="IVA generado" valor={money(d.generado)} /><Kpi label="IVA descontable" valor={money(d.descontable)} />
            <Kpi label={d.saldoPagar >= 0 ? 'Saldo a pagar' : 'Saldo a favor'} valor={money(Math.abs(d.saldoPagar))} tono={d.saldoPagar >= 0 ? '#b91c1c' : '#15803d'} />
          </div>
          <Tabla filas={d.cuentas} clave={(c: any) => c.codigo} vacio="Sin movimientos de IVA" columnas={[
            { label: 'Cuenta', render: (c: any) => `${c.codigo} ${c.nombre}` },
            { label: 'Base', align: 'right', render: (c: any) => money(Math.abs(c.base)) },
            { label: 'Valor', align: 'right', render: (c: any) => <b>{money(Math.abs(c.neto))}</b> },
          ]} />
        </div>
      )}
    </Card>
  );
}

function Retenciones() {
  const [desde, setDesde] = useState(`${hoyCO().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'retenciones', desde, hasta], queryFn: () => cont.get('/tributario/retenciones', { desde, hasta }) });
  const certificado = async (idtercero: number) => {
    const anio = desde.slice(0, 4);
    const c = await cont.get(`/tributario/certificado/${idtercero}/${anio}`);
    imprimirDocumento('Certificado de retención', `
      <h1>Certificado de retenciones · año gravable ${anio}</h1>
      <p><b>Retenedor:</b> ${escHtml(c.empresa.razonsocial)} · NIT ${escHtml(c.empresa.nit)}${c.empresa.dv !== null ? '-' + c.empresa.dv : ''}</p>
      <p><b>Retenido:</b> ${escHtml(c.tercero.nombre)} · ${escHtml(c.tercero.tipodocumento)} ${escHtml(c.tercero.documento)}${c.tercero.dv !== null && c.tercero.dv !== undefined ? '-' + c.tercero.dv : ''}</p>
      ${tablaHtml([{ t: 'Concepto' }, { t: 'Base', r: true }, { t: 'Valor retenido', r: true }],
      c.conceptos.map((x: any) => [`${x.codigo} ${x.concepto}`, money(x.base), money(x.retenido)]),
      ['Total', '', money(c.conceptos.reduce((a: number, x: any) => a + Number(x.retenido), 0))])}
      <p class="muted">Ciudad y fecha de expedición: ____________________</p><p class="muted" style="margin-top:40px">Firma del agente retenedor ____________________</p>`);
  };
  const filas = q.data?.filas ?? [];
  return (
    <Card>
      <CardHeader icon="receipt" title="Retenciones practicadas por tercero">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`retenciones-${desde}-${hasta}`, [{ nombre: 'Retenciones', filas: filas.map((f: any) => ({ Documento: f.documento, DV: f.dv ?? '', Tercero: f.nombre, Cuenta: f.codigo, Concepto: f.concepto, Base: f.base, Retenido: f.retenido })) }])}>Excel</Btn>
      </CardHeader>
      <div style={{ padding: '8px 20px', fontSize: 13 }}>Total retenido: <b>{money(q.data?.total)}</b></div>
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any) => `${f.idtercero}-${f.codigo}`} vacio="Sin retenciones en el período" columnas={[
        { label: 'Tercero', render: (f: any) => <><b>{f.nombre ?? 'Sin tercero'}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{f.tipodocumento} {f.documento}{f.dv !== null && f.dv !== undefined ? `-${f.dv}` : ''}</div></> },
        { label: 'Concepto', render: (f: any) => `${f.codigo} ${f.concepto}` },
        { label: 'Base', align: 'right', render: (f: any) => money(f.base) },
        { label: 'Retenido', align: 'right', render: (f: any) => <b>{money(f.retenido)}</b> },
        { label: '', render: (f: any) => f.idtercero && <Btn small variant="secondary" icon="workspace_premium" onClick={() => certificado(f.idtercero)}>Certificado</Btn> },
      ]} />
    </Card>
  );
}

function Exogena() {
  const [anio, setAnio] = useState(Number(hoyCO().slice(0, 4)));
  const q = useQuery({ queryKey: ['cont', 'exogena', anio], queryFn: () => cont.get(`/tributario/exogena/${anio}`) });
  const d = q.data;
  return (
    <Card>
      <CardHeader icon="description" title="Información exógena (apoyo)">
        <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ ...inputStyle, width: 100, padding: '7px 10px' }} aria-label="Año" />
        {d && <Btn icon="download" onClick={() => exportarExcel(`exogena-${anio}`, [
          { nombre: '1001 Pagos', filas: d.formato1001.map((f: any) => ({ 'Tipo doc': f.tipodocumento, Documento: f.documento, DV: f.dv ?? '', 'Razón social / nombre': f.nombre, Concepto: f.cuenta, 'Pago o abono': Number(f.pago), 'Retención en la fuente': Number(f.retefuente) })) },
          { nombre: '1007 Ingresos', filas: d.formato1007.map((f: any) => ({ 'Tipo doc': f.tipodocumento, Documento: f.documento, DV: f.dv ?? '', 'Razón social / nombre': f.nombre, Concepto: f.cuenta, 'Ingreso bruto': Number(f.ingreso) })) },
        ])}>Excel (1001 y 1007)</Btn>}
      </CardHeader>
      {d && (
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          <div><b style={{ fontSize: 13 }}>Formato 1001 · pagos o abonos en cuenta ({d.formato1001.length})</b>
            <Tabla filas={d.formato1001.slice(0, 50)} clave={(f: any) => `${f.documento}-${f.cuenta}`} vacio="Sin datos" columnas={[
              { label: 'Tercero', render: (f: any) => `${f.documento} · ${f.nombre}` }, { label: 'Concepto', render: (f: any) => f.cuenta },
              { label: 'Pago', align: 'right', render: (f: any) => money(f.pago) }, { label: 'Retefuente', align: 'right', render: (f: any) => money(f.retefuente) },
            ]} /></div>
          <div><b style={{ fontSize: 13 }}>Formato 1007 · ingresos recibidos ({d.formato1007.length})</b>
            <Tabla filas={d.formato1007.slice(0, 50)} clave={(f: any) => `${f.documento}-${f.cuenta}`} vacio="Sin datos" columnas={[
              { label: 'Tercero', render: (f: any) => `${f.documento} · ${f.nombre}` }, { label: 'Concepto', render: (f: any) => f.cuenta },
              { label: 'Ingreso', align: 'right', render: (f: any) => money(f.ingreso) },
            ]} /></div>
        </div>
      )}
    </Card>
  );
}

function Ica() {
  const [desde, setDesde] = useState(`${hoyCO().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'ica', desde, hasta], queryFn: () => cont.get('/tributario/ica', { desde, hasta }) });
  return (
    <Card>
      <CardHeader icon="location_city" title="Industria y comercio (apoyo)"><FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} /></CardHeader>
      <div style={{ padding: 16, fontSize: 13 }}>
        Ingresos operacionales del período: <b>{money(q.data?.ingresosOperacionales)}</b>
        {q.data?.nota && <p style={{ color: '#b45309' }}>{q.data.nota}</p>}
        <Tabla filas={q.data?.liquidacion ?? []} clave={(l: any) => l.codigo} vacio="Sin tarifas de ICA configuradas" columnas={[
          { label: 'Municipio', render: (l: any) => `${l.ciudad ?? ''} · ${l.nombre}` },
          { label: 'Tarifa (por mil)', align: 'right', render: (l: any) => l.tarifaPorMil },
          { label: 'Impuesto estimado', align: 'right', render: (l: any) => <b>{money(l.impuesto)}</b> },
        ]} />
      </div>
    </Card>
  );
}

function Config() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'impuestos'], queryFn: () => cont.get<any[]>('/impuestos') });
  const uvt = useQuery({ queryKey: ['cont', 'uvt'], queryFn: () => cont.get<any[]>('/uvt') });
  const [form, setForm] = useState<any | null>(null);
  const [u, setU] = useState({ anio: String(Number(hoyCO().slice(0, 4)) + 1), valor: '' });
  const guardar = useMutation({
    mutationFn: () => (form.idimpuesto ? cont.put(`/impuestos/${form.idimpuesto}`, form) : cont.post('/impuestos', form)),
    onSuccess: () => { m.ok('Impuesto guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'impuestos'] }); },
    onError: (e) => m.err(e),
  });
  const guardarUvt = useMutation({ mutationFn: () => cont.put(`/uvt/${u.anio}`, { valor: Number(u.valor) }), onSuccess: () => { m.ok('UVT guardada'); qc.invalidateQueries({ queryKey: ['cont', 'uvt'] }); }, onError: (e) => m.err(e) });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="settings" title="Impuestos y tarifas (con vigencia)">
          <Btn icon="add" onClick={() => setForm({ codigo: '', tipo: 'RETEFUENTE', nombre: '', tarifa: '', baseminimauvt: 0, idcuenta: null, vigentedesde: hoyCO(), vigentehasta: '', activo: true })}>Nuevo</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(i: any) => i.idimpuesto} columnas={[
          { label: 'Código', render: (i: any) => <><b>{i.codigo}</b> <Badge>{i.tipo}</Badge></> },
          { label: 'Nombre', render: (i: any) => i.nombre },
          { label: 'Tarifa', align: 'right', render: (i: any) => `${Number(i.tarifa)}${i.tipo === 'ICA' ? ' ‰' : ' %'}` },
          { label: 'Base mín.', align: 'right', render: (i: any) => `${Number(i.baseminimauvt)} UVT` },
          { label: 'Cuenta', render: (i: any) => i.codigocuenta ?? '—' },
          { label: 'Vigencia', render: (i: any) => `${String(i.vigentedesde).slice(0, 10)} → ${i.vigentehasta ? String(i.vigentehasta).slice(0, 10) : 'vigente'}` },
          { label: '', render: (i: any) => <Btn small variant="ghost" icon="edit" onClick={() => setForm({ ...i, vigentedesde: String(i.vigentedesde).slice(0, 10), vigentehasta: i.vigentehasta ? String(i.vigentehasta).slice(0, 10) : '' })} /> },
        ]} />
      </Card>
      <Card>
        <CardHeader icon="calculate" title="Valor de la UVT">
          <input type="number" value={u.anio} onChange={(e) => setU({ ...u, anio: e.target.value })} style={{ ...inputStyle, width: 90, padding: '7px 10px' }} aria-label="Año" />
          <input type="number" value={u.valor} onChange={(e) => setU({ ...u, valor: e.target.value })} placeholder="Valor" style={{ ...inputStyle, width: 120, padding: '7px 10px' }} aria-label="Valor UVT" />
          <Btn small icon="save" disabled={!(Number(u.valor) > 0)} onClick={() => guardarUvt.mutate()}>Guardar</Btn>
        </CardHeader>
        <Tabla filas={uvt.data ?? []} clave={(x: any) => x.anio} columnas={[{ label: 'Año', render: (x: any) => x.anio }, { label: 'Valor', align: 'right', render: (x: any) => money(x.valor) }]} />
      </Card>
      {form && (
        <Modal titulo={form.idimpuesto ? 'Editar impuesto' : 'Nuevo impuesto'} onClose={() => setForm(null)} ancho={640}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="RTF_COMPRAS" style={inputStyle} /></Field>
            <Field label="Tipo" required><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>{['IVA', 'RETEFUENTE', 'RETEIVA', 'RETEICA', 'ICA'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label={form.tipo === 'ICA' ? 'Tarifa (por mil)' : 'Tarifa (%)'} required><input type="number" step="any" value={form.tarifa} onChange={(e) => setForm({ ...form, tarifa: e.target.value })} style={inputStyle} /></Field>
            <Field label="Base mínima (UVT)"><input type="number" step="any" value={form.baseminimauvt} onChange={(e) => setForm({ ...form, baseminimauvt: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vigente desde" required>
              <DatePicker value={form.vigentedesde} onChange={(val) => setForm({ ...form, vigentedesde: val })} inputClassName="h-[36px] text-xs rounded-lg" />
            </Field>
            <Field label="Vigente hasta">
              <DatePicker value={form.vigentehasta} min={form.vigentedesde} onChange={(val) => setForm({ ...form, vigentehasta: val })} inputClassName="h-[36px] text-xs rounded-lg" />
            </Field>
          </Grid>
          <Field label="Cuenta contable" style={{ marginTop: 10 }}><CuentaSelect value={form.idcuenta} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} /></Field>
          <label style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: 13 }}><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || form.tarifa === '' || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
