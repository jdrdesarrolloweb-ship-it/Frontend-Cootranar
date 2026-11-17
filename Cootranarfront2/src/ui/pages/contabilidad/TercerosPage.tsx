import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import { Alerta, Badge, Btn, Card, CardHeader, Field, Grid, Modal, Paginador, Tabla, inputStyle, money, useMensaje } from './contUi';

const vacio = { tipodocumento: 'CC', documento: '', nombre: '', tipopersona: 'NATURAL', escliente: false, esproveedor: false, esempleado: false, correo: '', telefono: '', direccion: '', activo: true };

export const TercerosPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<any | null>(null);
  const [hist, setHist] = useState<Tercero | null>(null);
  const filtros = { busqueda, page, limit: 30, ...(rol ? { [rol]: 'true' } : {}) };
  const q = useQuery({ queryKey: ['cont', 'terceros', filtros], queryFn: () => cont.get('/terceros', filtros) });
  const h = useQuery({ queryKey: ['cont', 'tercero-hist', hist?.idtercero], queryFn: () => cont.get<any[]>(`/terceros/${hist!.idtercero}/historial`), enabled: !!hist });
  const guardar = useMutation({
    mutationFn: () => (form.idtercero ? cont.put(`/terceros/${form.idtercero}`, form) : cont.post('/terceros', form)),
    onSuccess: () => { m.ok('Tercero guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'terceros'] }); },
    onError: (e) => m.err(e),
  });
  const sincronizar = useMutation({
    mutationFn: () => cont.post('/terceros/sincronizar'),
    onSuccess: (r: any) => { m.ok(`${r.creados} tercero(s) importados desde usuarios y proveedores`); qc.invalidateQueries({ queryKey: ['cont', 'terceros'] }); },
    onError: (e) => m.err(e),
  });
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="groups" title="Terceros">
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Documento o nombre" style={{ ...inputStyle, width: 200, padding: '7px 10px' }} />
          <select value={rol} onChange={(e) => { setRol(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Tipo">
            <option value="">Todos</option><option value="escliente">Clientes</option><option value="esproveedor">Proveedores</option><option value="esempleado">Empleados</option>
          </select>
          <Btn variant="secondary" icon="sync" disabled={sincronizar.isPending} onClick={() => sincronizar.mutate()}>Importar usuarios y proveedores</Btn>
          <Btn icon="person_add" onClick={() => setForm({ ...vacio })}>Nuevo tercero</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(t: Tercero) => t.idtercero} columnas={[
          { label: 'Documento', render: (t: Tercero) => <b>{t.tipodocumento} {t.documento}{t.dv !== null && t.dv !== undefined ? `-${t.dv}` : ''}</b> },
          { label: 'Nombre / razón social', render: (t: Tercero) => t.nombre },
          { label: 'Tipo', render: (t: Tercero) => <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {t.escliente && <Badge tone="blue">Cliente</Badge>}{t.esproveedor && <Badge tone="amber">Proveedor</Badge>}{t.esempleado && <Badge tone="green">Empleado</Badge>}
          </div> },
          { label: 'Contacto', render: (t: Tercero) => <span style={{ fontSize: 12 }}>{[t.correo, t.telefono].filter(Boolean).join(' · ')}</span> },
          { label: '', render: (t: Tercero) => <div style={{ display: 'flex', gap: 2 }}>
            <Btn small variant="ghost" icon="history" title="Historial de operaciones" onClick={() => setHist(t)} />
            <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...t })} />
          </div> },
        ]} />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>
      {form && (
        <Modal titulo={form.idtercero ? 'Editar tercero' : 'Nuevo tercero'} onClose={() => setForm(null)} ancho={720}>
          <Grid cols={3}>
            <Field label="Tipo doc." required>
              <select value={form.tipodocumento} onChange={(e) => setForm({ ...form, tipodocumento: e.target.value })} style={inputStyle}>
                {['CC', 'NIT', 'CE', 'TI', 'PAS', 'PEP', 'RC'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label={form.tipodocumento === 'NIT' ? 'NIT (sin DV; se calcula)' : 'Documento'} required><input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre / razón social" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Correo"><input value={form.correo ?? ''} onChange={(e) => setForm({ ...form, correo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Teléfono"><input value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={inputStyle} /></Field>
            <Field label="Dirección"><input value={form.direccion ?? ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <Field label="Responsabilidades tributarias (códigos DIAN separados por coma)" style={{ marginTop: 12 }}>
            <input value={(form.responsabilidades ?? []).join(', ')} onChange={(e) => setForm({ ...form, responsabilidades: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="O-13, O-15, R-99-PN…" style={inputStyle} />
          </Field>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 13 }}>
            {(['escliente', 'esproveedor', 'esempleado', 'activo'] as const).map((k) => (
              <label key={k} style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                {{ escliente: 'Cliente', esproveedor: 'Proveedor', esempleado: 'Empleado', activo: 'Activo' }[k]}</label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.documento || !form.nombre || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {hist && (
        <Modal titulo={`Historial · ${hist.nombre}`} onClose={() => setHist(null)} ancho={950}>
          <Tabla cargando={h.isLoading} filas={h.data ?? []} clave={(x: any) => `${x.idcomprobante}-${x.codigo}-${x.debito}-${x.credito}`} vacio="Sin movimientos contables" columnas={[
            { label: 'Fecha', render: (x: any) => String(x.fecha).slice(0, 10) },
            { label: 'Comprobante', render: (x: any) => <b>{x.comprobante}</b> },
            { label: 'Cuenta', render: (x: any) => `${x.codigo} ${x.cuenta}` },
            { label: 'Detalle', render: (x: any) => <span style={{ fontSize: 12 }}>{x.detalle ?? x.descripcion}</span> },
            { label: 'Débito', align: 'right', render: (x: any) => (Number(x.debito) ? money(x.debito) : '') },
            { label: 'Crédito', align: 'right', render: (x: any) => (Number(x.credito) ? money(x.credito) : '') },
          ]} />
        </Modal>
      )}
    </Layout>
  );
};
