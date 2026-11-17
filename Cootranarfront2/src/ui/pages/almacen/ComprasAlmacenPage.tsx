import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BLUE, BodegaSelector, Btn, Card, CardHeader, Field, FiltroFechas, Grid, Modal, Paginador,
  ProductoPicker, Tabla, Tabs, fecha, haceDiasISO, hoyISO, inputStyle, money, num, pedirMotivo, useAlmacen, useMensaje,
} from './almacenUi';

type Tab = 'compras' | 'nueva' | 'proveedores';

export const ComprasAlmacenPage = () => {
  const [tab, setTab] = useState<Tab>('compras');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'compras', label: 'Compras registradas', icon: 'receipt' },
        { id: 'nueva', label: 'Registrar compra', icon: 'add_shopping_cart' },
        { id: 'proveedores', label: 'Proveedores', icon: 'local_shipping' },
      ]} />
      {tab === 'compras' && <Compras />}
      {tab === 'nueva' && <NuevaCompra onListo={() => setTab('compras')} />}
      {tab === 'proveedores' && <Proveedores />}
    </Layout>
  );
};

function Compras() {
  const qc = useQueryClient();
  const m = useMensaje();
  const { idbodega, esAdmin } = useAlmacen();
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());
  const [page, setPage] = useState(1);
  const [verId, setVerId] = useState<number | null>(null);
  const filtros = { idbodega, desde, hasta, page, limit: 20 };
  const q = useQuery({ queryKey: ['almacen', 'compras', filtros], queryFn: () => almacenApi.compras(filtros) });
  const det = useQuery({ queryKey: ['almacen', 'compra', verId], queryFn: () => almacenApi.compra(verId!), enabled: !!verId });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => almacenApi.anularCompra(id, motivo),
    onSuccess: () => { m.ok('Compra anulada; la mercancía salió del inventario.'); setVerId(null); qc.invalidateQueries({ queryKey: ['almacen'] }); },
    onError: (e) => m.err(e),
  });

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="receipt" title="Compras (entradas de mercancía)">
          <BodegaSelector />
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        </CardHeader>
        <Tabla
          cargando={q.isLoading}
          filas={q.data?.items ?? []}
          clave={(c: any) => c.idcompra}
          onFila={(c: any) => setVerId(c.idcompra)}
          columnas={[
            { label: '#', render: (c: any) => <b>{c.idcompra}</b> },
            { label: 'Fecha', render: (c: any) => fecha(c.fechacompra) },
            { label: 'Proveedor', render: (c: any) => <>{c.razonsocial}<div style={{ fontSize: 11.5, color: '#64748b' }}>NIT {c.nit}</div></> },
            { label: 'Factura', render: (c: any) => c.numerofactura ?? '—' },
            ...(!idbodega ? [{ label: 'Bodega', render: (c: any) => c.nombrebodega }] : []),
            { label: 'Total', align: 'right', render: (c: any) => <b>{money(c.total)}</b> },
            { label: 'Estado', render: (c: any) => <Badge tone={c.estado === 'ANULADA' ? 'red' : 'green'}>{c.estado}</Badge> },
          ]}
        />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>

      {verId && (
        <Modal titulo={`Compra #${verId}`} onClose={() => setVerId(null)}>
          {!det.data ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
            <>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                {det.data.razonsocial} · Factura {det.data.numerofactura ?? '—'} · {fecha(det.data.fechacompra)} · {det.data.nombrebodega} · {det.data.registradopor}
                {det.data.observacion && <div>Obs.: {det.data.observacion}</div>}
              </div>
              {det.data.estado === 'ANULADA' && <Alerta msg={{ tipo: 'err', texto: `Anulada: ${det.data.motivoanulacion ?? ''}` }} />}
              <Tabla filas={det.data.items} clave={(i: any) => i.iddetalle} columnas={[
                { label: 'Producto', render: (i: any) => <>{i.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{i.codigo}</div></> },
                { label: 'Cantidad', align: 'right', render: (i: any) => `${num(i.cantidad)} ${String(i.unidadmedida).toLowerCase()}` },
                { label: 'Costo unit.', align: 'right', render: (i: any) => money(i.costounitario) },
                { label: 'IVA', align: 'right', render: (i: any) => `${num(i.porcentajeiva)}%` },
                { label: 'Subtotal', align: 'right', render: (i: any) => money(i.subtotal) },
              ]} />
              <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13 }}>
                Subtotal {money(det.data.subtotal)} · IVA {money(det.data.iva)} · <b style={{ fontSize: 16 }}>Total {money(det.data.total)}</b>
              </div>
              {esAdmin && det.data.estado !== 'ANULADA' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <Btn variant="danger" icon="block" disabled={anular.isPending} onClick={() => {
                    const motivo = pedirMotivo(`anular la compra #${verId}`);
                    if (motivo) anular.mutate({ id: verId, motivo });
                  }}>Anular compra</Btn>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}

interface LineaCompra { producto: Producto; cantidad: string; costo: string; iva: string }

function NuevaCompra({ onListo }: { onListo: () => void }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const { idbodegaOperacion, bodegaActual } = useAlmacen();
  const proveedores = useQuery({ queryKey: ['almacen', 'proveedores'], queryFn: () => almacenApi.proveedores() });
  const [idproveedor, setIdproveedor] = useState('');
  const [numerofactura, setNumerofactura] = useState('');
  const [observacion, setObservacion] = useState('');
  const [plazodias, setPlazodias] = useState('0');
  const [aplicarretefuente, setAplicarretefuente] = useState(false);
  const [aplicarreteiva, setAplicarreteiva] = useState(false);
  const [reteicapormil, setReteicapormil] = useState('');
  const [lineas, setLineas] = useState<LineaCompra[]>([]);

  const agregar = (p: Producto) => setLineas((prev) => prev.some((l) => l.producto.idproducto === p.idproducto)
    ? prev
    : [...prev, { producto: p, cantidad: '1', costo: String(Math.round(Number(p.costopromedio ?? 0)) || ''), iva: String(Number(p.porcentajeiva)) }]);
  const cambiar = (id: number, k: keyof Omit<LineaCompra, 'producto'>, v: string) =>
    setLineas((prev) => prev.map((l) => (l.producto.idproducto === id ? { ...l, [k]: v } : l)));

  const subtotal = lineas.reduce((a, l) => a + Number(l.cantidad) * Number(l.costo), 0);
  const iva = lineas.reduce((a, l) => a + Number(l.cantidad) * Number(l.costo) * Number(l.iva) / 100, 0);
  const valido = idproveedor && lineas.length > 0 && lineas.every((l) => Number(l.cantidad) > 0 && l.costo !== '' && Number(l.costo) >= 0);

  const registrar = useMutation({
    mutationFn: () => almacenApi.registrarCompra({
      idbodega: idbodegaOperacion, idproveedor: Number(idproveedor), numerofactura, observacion,
      plazodias: Number(plazodias || 0), aplicarretefuente, aplicarreteiva, reteicapormil: Number(reteicapormil || 0),
      items: lineas.map((l) => ({ idproducto: l.producto.idproducto, cantidad: Number(l.cantidad), costounitario: Number(l.costo), porcentajeiva: Number(l.iva) })),
    }),
    onSuccess: (c: any) => {
      m.ok(`Compra #${c.idcompra} registrada por ${money(c.total)}. El inventario ya se actualizó.`);
      setLineas([]); setNumerofactura(''); setObservacion('');
      qc.invalidateQueries({ queryKey: ['almacen'] });
      setTimeout(onListo, 1200);
    },
    onError: (e) => m.err(e),
  });

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="add_shopping_cart" title={`Registrar compra${bodegaActual ? ` en ${bodegaActual.nombre}` : ''}`}>
          <BodegaSelector permitirTodas={false} />
        </CardHeader>
        <div style={{ padding: 20 }}>
          <Grid cols={3}>
            <Field label="Proveedor" required>
              <select value={idproveedor} onChange={(e) => setIdproveedor(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {(proveedores.data ?? []).filter((p) => p.activo).map((p) => <option key={p.idproveedor} value={p.idproveedor}>{p.razonsocial} · {p.nit}</option>)}
              </select>
            </Field>
            <Field label="N.º factura del proveedor"><input value={numerofactura} onChange={(e) => setNumerofactura(e.target.value)} style={inputStyle} /></Field>
            <Field label="Observación"><input value={observacion} onChange={(e) => setObservacion(e.target.value)} style={inputStyle} /></Field>
          </Grid>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginTop: 12, fontSize: 13 }}>
            <Field label="Plazo de pago (días)" style={{ width: 150 }}><input type="number" min={0} max={365} value={plazodias} onChange={(e) => setPlazodias(e.target.value)} style={inputStyle} /></Field>
            <label style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={aplicarretefuente} onChange={(e) => setAplicarretefuente(e.target.checked)} /> Practicar retención en la fuente</label>
            <label style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={aplicarreteiva} onChange={(e) => setAplicarreteiva(e.target.checked)} /> Practicar reteIVA</label>
            <Field label="ReteICA (por mil)" style={{ width: 140 }}><input type="number" min={0} step="any" value={reteicapormil} onChange={(e) => setReteicapormil(e.target.value)} style={inputStyle} /></Field>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>Tarifas y bases (UVT) vigentes en Contabilidad › Impuestos.</span>
          </div>
          <div style={{ marginTop: 16 }}><ProductoPicker idbodega={idbodegaOperacion} onSelect={agregar} placeholder="Agregar producto a la compra…" /></div>
          <div style={{ marginTop: 14 }}>
            <Tabla filas={lineas} clave={(l) => l.producto.idproducto} vacio="Agrega los productos que llegaron." columnas={[
              { label: 'Producto', render: (l) => <>{l.producto.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{l.producto.codigo}</div></> },
              { label: 'Cantidad', align: 'right', render: (l) => <input type="number" min={0.01} step="any" value={l.cantidad} onChange={(e) => cambiar(l.producto.idproducto, 'cantidad', e.target.value)} style={{ ...inputStyle, width: 90, textAlign: 'right' }} aria-label="Cantidad" /> },
              { label: 'Costo unit. (sin IVA)', align: 'right', render: (l) => <input type="number" min={0} value={l.costo} onChange={(e) => cambiar(l.producto.idproducto, 'costo', e.target.value)} style={{ ...inputStyle, width: 130, textAlign: 'right' }} aria-label="Costo" /> },
              { label: 'IVA', align: 'right', render: (l) => (
                <select value={l.iva} onChange={(e) => cambiar(l.producto.idproducto, 'iva', e.target.value)} style={{ ...inputStyle, width: 80 }} aria-label="IVA">
                  {['0', '5', '19'].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              ) },
              { label: 'Subtotal', align: 'right', render: (l) => <b>{money(Number(l.cantidad) * Number(l.costo))}</b> },
              { label: '', render: (l) => <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setLineas((p) => p.filter((x) => x !== l))} /> },
            ]} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#475569' }}>
              Subtotal {money(subtotal)} · IVA {money(iva)} · <b style={{ fontSize: 18, color: BLUE }}>Total {money(subtotal + iva)}</b>
            </div>
            <Btn icon="inventory" variant="success" disabled={!valido || registrar.isPending || !idbodegaOperacion} onClick={() => registrar.mutate()}>
              {registrar.isPending ? 'Registrando…' : 'Registrar entrada'}
            </Btn>
          </div>
        </div>
      </Card>
    </>
  );
}

const provVacio = { nit: '', razonsocial: '', contacto: '', telefono: '', correo: '', direccion: '' };

function Proveedores() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [busqueda, setBusqueda] = useState('');
  const q = useQuery({ queryKey: ['almacen', 'proveedores', busqueda], queryFn: () => almacenApi.proveedores(busqueda) });
  const [form, setForm] = useState<typeof provVacio | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const guardar = useMutation({
    mutationFn: (d: any) => (editId ? almacenApi.actualizarProveedor(editId, d) : almacenApi.crearProveedor(d)),
    onSuccess: () => { m.ok('Proveedor guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['almacen', 'proveedores'] }); },
    onError: (e) => m.err(e),
  });
  const estado = useMutation({
    mutationFn: (p: any) => almacenApi.actualizarProveedor(p.idproveedor, { ...p, activo: !p.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['almacen', 'proveedores'] }),
    onError: (e) => m.err(e),
  });
  const set = (k: keyof typeof provVacio) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="local_shipping" title="Proveedores">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar NIT o razón social" style={{ ...inputStyle, width: 220, padding: '7px 10px' }} />
          <Btn icon="add" onClick={() => { setEditId(null); setForm({ ...provVacio }); }}>Nuevo proveedor</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(p: any) => p.idproveedor} columnas={[
          { label: 'NIT', render: (p: any) => <b>{p.nit}</b> },
          { label: 'Razón social', render: (p: any) => p.razonsocial },
          { label: 'Contacto', render: (p: any) => <>{p.contacto ?? '—'}<div style={{ fontSize: 11.5, color: '#64748b' }}>{[p.telefono, p.correo].filter(Boolean).join(' · ')}</div></> },
          { label: 'Compras', align: 'right', render: (p: any) => p.compras },
          { label: 'Estado', render: (p: any) => <Badge tone={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: 'Acciones', render: (p: any) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => {
                setEditId(p.idproveedor);
                setForm({ nit: p.nit, razonsocial: p.razonsocial, contacto: p.contacto ?? '', telefono: p.telefono ?? '', correo: p.correo ?? '', direccion: p.direccion ?? '' });
              }} />
              <Btn small variant="ghost" icon={p.activo ? 'block' : 'check_circle'} title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => estado.mutate(p)} />
            </div>
          ) },
        ]} />
      </Card>
      {form && (
        <Modal titulo={editId ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); if (form.nit.trim() && form.razonsocial.trim()) guardar.mutate(form); }}>
            <Grid cols={2}>
              <Field label="NIT" required><input value={form.nit} onChange={set('nit')} style={inputStyle} /></Field>
              <Field label="Razón social" required><input value={form.razonsocial} onChange={set('razonsocial')} style={inputStyle} /></Field>
              <Field label="Contacto"><input value={form.contacto} onChange={set('contacto')} style={inputStyle} /></Field>
              <Field label="Teléfono"><input value={form.telefono} onChange={set('telefono')} style={inputStyle} /></Field>
              <Field label="Correo"><input type="email" value={form.correo} onChange={set('correo')} style={inputStyle} /></Field>
              <Field label="Dirección"><input value={form.direccion} onChange={set('direccion')} style={inputStyle} /></Field>
            </Grid>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn type="submit" icon="save" disabled={guardar.isPending || !form.nit.trim() || !form.razonsocial.trim()}>Guardar</Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
