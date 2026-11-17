import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, Field, Grid, Modal, Paginador, Tabla, Tabs, UNIDADES,
  inputStyle, money, num, useMensaje,
} from './almacenUi';

const vacio = {
  codigo: '', codigobarras: '', nombre: '', descripcion: '', idcategoria: '', marca: '', unidadmedida: 'UNIDAD',
  preciounitario: '', precioventa: '', preciosocio: '', porcentajeiva: '19', stockminimo: '0',
};
type FormProducto = typeof vacio;

export const ProductosAlmacenPage = () => {
  const [tab, setTab] = useState<'productos' | 'categorias'>('productos');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'productos', label: 'Productos', icon: 'inventory' },
        { id: 'categorias', label: 'Categorías', icon: 'category' },
      ]} />
      {tab === 'productos' ? <Productos /> : <Categorias />}
    </Layout>
  );
};

function Productos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [busqueda, setBusqueda] = useState('');
  const [idcategoria, setIdcategoria] = useState('');
  const [estado, setEstado] = useState('activos');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormProducto | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const categorias = useQuery({ queryKey: ['almacen', 'categorias'], queryFn: almacenApi.categorias });
  const filtros = { busqueda, idcategoria, estado, page, limit: 25 };
  const q = useQuery({ queryKey: ['almacen', 'productos', filtros], queryFn: () => almacenApi.productos(filtros) });

  const guardar = useMutation({
    mutationFn: (f: FormProducto) => {
      const d = {
        ...f, idcategoria: Number(f.idcategoria), precioventa: Number(f.precioventa),
        preciosocio: f.preciosocio === '' ? Number(f.precioventa) : Number(f.preciosocio),
        porcentajeiva: Number(f.porcentajeiva), stockminimo: Number(f.stockminimo),
      };
      return editId ? almacenApi.actualizarProducto(editId, d) : almacenApi.crearProducto(d);
    },
    onSuccess: (p) => { m.ok(`Producto "${p.nombre}" ${editId ? 'actualizado' : 'creado'}`); setForm(null); qc.invalidateQueries({ queryKey: ['almacen'] }); },
    onError: (e) => m.err(e),
  });
  const cambiarEstado = useMutation({
    mutationFn: (p: Producto) => almacenApi.actualizarProducto(p.idproducto, { activo: !p.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['almacen'] }),
    onError: (e) => m.err(e),
  });

  const editar = (p: Producto) => {
    setEditId(p.idproducto);
    const iva = Number(p.porcentajeiva) || 19;
    const pu = Math.round(Number(p.precioventa) / (1 + iva / 100));
    setForm({
      codigo: p.codigo, codigobarras: p.codigobarras ?? '', nombre: p.nombre, descripcion: p.descripcion ?? '',
      idcategoria: String(p.idcategoria), marca: p.marca ?? '', unidadmedida: p.unidadmedida,
      preciounitario: String(pu),
      precioventa: String(Number(p.precioventa)), preciosocio: String(Number(p.preciosocio)),
      porcentajeiva: String(Number(p.porcentajeiva)), stockminimo: String(Number(p.stockminimo)),
    });
  };
  const set = (k: keyof FormProducto) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  const valido = form && form.codigo.trim() && form.nombre.trim() && form.idcategoria && form.precioventa !== '';

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="inventory" title="Catálogo de repuestos y lubricantes">
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar nombre, código, marca…" style={{ ...inputStyle, width: 220, padding: '7px 10px' }} />
          <select value={idcategoria} onChange={(e) => { setIdcategoria(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {(categorias.data ?? []).map((c) => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
          </select>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="">Todos</option>
          </select>
          <Btn icon="add" onClick={() => { setEditId(null); setForm({ ...vacio }); }}>Nuevo producto</Btn>
        </CardHeader>
        <Tabla
          cargando={q.isLoading}
          filas={q.data?.items ?? []}
          clave={(p) => p.idproducto}
          vacio="No hay productos. Crea el primero con «Nuevo producto»."
          columnas={[
            {
              label: 'Referencia',
              render: (p) => (
                <>
                  <b style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '12.5px' }}>{p.codigo}</b>
                  {p.codigobarras && <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.codigobarras}</div>}
                </>
              ),
            },
            {
              label: 'Descripcion Producto',
              render: (p) => (
                <>
                  <b>{p.nombre}</b>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    {p.nombrecategoria}{p.marca ? ` · ${p.marca}` : ''}
                  </div>
                </>
              ),
            },
            {
              label: 'Precio Unitario',
              align: 'right',
              render: (p) => {
                const pu = Number(p.precioventa) / (1 + (Number(p.porcentajeiva) || 19) / 100);
                return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(pu)}</span>;
              },
            },
            {
              label: 'Precio Iva Inc',
              align: 'right',
              render: (p) => <b style={{ fontVariantNumeric: 'tabular-nums', color: '#0284c7' }}>{money(p.precioventa)}</b>,
            },
            { label: 'IVA', align: 'right', render: (p) => `${num(p.porcentajeiva)}%` },
            {
              label: 'Stock total',
              align: 'right',
              render: (p) => {
                const s = Number(p.stock ?? 0);
                return (
                  <Badge tone={s <= 0 ? 'red' : s <= Number(p.stockminimo) ? 'amber' : 'green'}>
                    {num(s)} {p.unidadmedida.toLowerCase()}
                  </Badge>
                );
              },
            },
            {
              label: 'Acciones',
              render: (p) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn small variant="ghost" icon="edit" onClick={() => editar(p)} title="Editar" />
                  <Btn
                    small
                    variant="ghost"
                    icon={p.activo ? 'block' : 'check_circle'}
                    onClick={() => cambiarEstado.mutate(p)}
                    title={p.activo ? 'Desactivar' : 'Activar'}
                  />
                </div>
              ),
            },
          ]}
        />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>

      {form && (
        <Modal titulo={editId ? 'Editar producto / repuesto' : 'Nuevo producto / repuesto'} onClose={() => setForm(null)} ancho={860}>
          <form onSubmit={(e) => { e.preventDefault(); if (valido) guardar.mutate(form); }}>
            <Grid>
              <Field label="Referencia / Código" required>
                <input value={form.codigo} onChange={set('codigo')} placeholder="070566" style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </Field>
              <Field label="Código de barras"><input value={form.codigobarras} onChange={set('codigobarras')} placeholder="Escanear…" style={inputStyle} /></Field>
              <Field label="Categoría / Grupo" required>
                <select value={form.idcategoria} onChange={set('idcategoria')} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {(categorias.data ?? []).filter((c) => c.activo).map((c) => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Marca"><input value={form.marca} onChange={set('marca')} placeholder="Mobil, Bosch, LV150…" style={inputStyle} /></Field>
            </Grid>
            <Grid style={{ marginTop: 14 }}>
              <Field label="Descripción Producto" required style={{ gridColumn: 'span 2' }}>
                <input value={form.nombre} onChange={set('nombre')} placeholder="Ej. MANOMETRO ACEITE Y AMPERIMETRO" style={inputStyle} />
              </Field>
              <Field label="Unidad de medida" required>
                <select value={form.unidadmedida} onChange={set('unidadmedida')} style={inputStyle}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u.toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Stock mínimo"><input type="number" min={0} step="any" value={form.stockminimo} onChange={set('stockminimo')} style={inputStyle} /></Field>
            </Grid>
            <Grid style={{ marginTop: 14 }}>
              <Field label="Precio Unitario (sin IVA)">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.preciounitario}
                  onChange={(e) => {
                    const u = e.target.value;
                    const iva = Number(form.porcentajeiva) || 0;
                    const pVenta = u === '' ? '' : String(Math.round(Number(u) * (1 + iva / 100)));
                    setForm((f) => f ? { ...f, preciounitario: u, precioventa: pVenta } : f);
                  }}
                  placeholder="330252"
                  style={inputStyle}
                />
              </Field>
              <Field label="IVA %" required>
                <select
                  value={form.porcentajeiva}
                  onChange={(e) => {
                    const iva = Number(e.target.value) || 0;
                    const u = Number(form.preciounitario) || 0;
                    const pVenta = u > 0 ? String(Math.round(u * (1 + iva / 100))) : form.precioventa;
                    setForm((f) => f ? { ...f, porcentajeiva: e.target.value, precioventa: pVenta } : f);
                  }}
                  style={inputStyle}
                >
                  {['0', '5', '19'].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </Field>
              <Field label="Precio IVA Inc. (Público)" required>
                <input
                  type="number"
                  min={0}
                  value={form.precioventa}
                  onChange={(e) => {
                    const pVenta = e.target.value;
                    const iva = Number(form.porcentajeiva) || 0;
                    const u = pVenta === '' ? '' : String(Math.round(Number(pVenta) / (1 + iva / 100)));
                    setForm((f) => f ? { ...f, precioventa: pVenta, preciounitario: u } : f);
                  }}
                  placeholder="393000"
                  style={inputStyle}
                />
              </Field>
              <Field label="Precio Socio (IVA incl.)">
                <input
                  type="number"
                  min={0}
                  value={form.preciosocio}
                  onChange={set('preciosocio')}
                  placeholder="Igual al público"
                  style={inputStyle}
                />
              </Field>
            </Grid>
            <Field label="Descripción / compatibilidad" style={{ marginTop: 14 }}>
              <textarea value={form.descripcion} onChange={set('descripcion')} rows={3} placeholder="Ej.: compatible con Marcopolo Paradiso G7, motor Mercedes OM 926" style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn type="submit" icon="save" disabled={!valido || guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Categorias() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['almacen', 'categorias'], queryFn: almacenApi.categorias });
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const guardar = useMutation({
    mutationFn: (extra: { activo?: boolean; id?: number; nombre?: string; descripcion?: string } = {}) => {
      const id = extra.id ?? editId;
      const d = { nombre: extra.nombre ?? nombre, descripcion: extra.descripcion ?? descripcion, activo: extra.activo };
      return id ? almacenApi.actualizarCategoria(id, d) : almacenApi.crearCategoria(d);
    },
    onSuccess: () => { m.ok('Categoría guardada'); setNombre(''); setDescripcion(''); setEditId(null); qc.invalidateQueries({ queryKey: ['almacen', 'categorias'] }); },
    onError: (e) => m.err(e),
  });

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="category" title={editId ? 'Editar categoría' : 'Nueva categoría'} />
        <form style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
          onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) guardar.mutate({}); }}>
          <Field label="Nombre" required style={{ flex: '1 1 200px' }}><input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} /></Field>
          <Field label="Descripción" style={{ flex: '2 1 300px' }}><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={inputStyle} /></Field>
          {editId && <Btn variant="secondary" onClick={() => { setEditId(null); setNombre(''); setDescripcion(''); }}>Cancelar</Btn>}
          <Btn type="submit" icon="save" disabled={!nombre.trim() || guardar.isPending}>Guardar</Btn>
        </form>
        <Tabla
          cargando={q.isLoading}
          filas={q.data ?? []}
          clave={(c: any) => c.idcategoria}
          columnas={[
            { label: 'Categoría', render: (c: any) => <b>{c.nombre}</b> },
            { label: 'Descripción', render: (c: any) => c.descripcion ?? '—' },
            { label: 'Productos', align: 'right', render: (c: any) => c.productos },
            { label: 'Estado', render: (c: any) => <Badge tone={c.activo ? 'green' : 'red'}>{c.activo ? 'Activa' : 'Inactiva'}</Badge> },
            { label: 'Acciones', render: (c: any) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => { setEditId(c.idcategoria); setNombre(c.nombre); setDescripcion(c.descripcion ?? ''); }} />
                <Btn small variant="ghost" icon={c.activo ? 'block' : 'check_circle'} title={c.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => guardar.mutate({ id: c.idcategoria, nombre: c.nombre, descripcion: c.descripcion ?? '', activo: !c.activo })} />
              </div>
            ) },
          ]}
        />
      </Card>
    </>
  );
}
