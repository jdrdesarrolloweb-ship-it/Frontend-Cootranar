import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BLUE, Btn, Card, CardHeader, Field, Grid, Modal, Tabla, fecha, inputStyle, useMensaje,
} from '../almacen/almacenUi';

/**
 * CRUD de empleados de almacén (rol ALMACENISTA). Solo administrador.
 * Cada empleado queda asignado a un punto de almacén y solo opera ese punto.
 */
const vacio = { nombre: '', apellido: '', correo: '', password: '', tipodocumento: 'CC', documento: '', telefono: '', idbodega: '' };
type Form = typeof vacio;

export const EmpleadosAlmacenPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const [busqueda, setBusqueda] = useState('');
  const [debounced, setDebounced] = useState('');
  const [estado, setEstado] = useState('');
  const [idbodega, setIdbodega] = useState('');
  const [form, setForm] = useState<Form>({ ...vacio });
  const [editId, setEditId] = useState<number | null>(null);
  const [verId, setVerId] = useState<number | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(busqueda.trim()), 300); return () => clearTimeout(t); }, [busqueda]);

  const puntos = useQuery({ queryKey: ['almacen', 'bodegas'], queryFn: almacenApi.bodegas });
  const filtros = { busqueda: debounced, estado, idbodega };
  const q = useQuery({ queryKey: ['almacen', 'empleados', filtros], queryFn: () => almacenApi.empleados(filtros) });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['almacen'] });

  const reset = () => { setForm({ ...vacio }); setEditId(null); };

  const guardar = useMutation({
    mutationFn: (f: Form) => {
      const d: Record<string, unknown> = { ...f, idbodega: Number(f.idbodega) };
      if (!f.password) delete d.password;
      return editId ? almacenApi.actualizarEmpleado(editId, d) : almacenApi.crearEmpleado(d);
    },
    onSuccess: () => {
      m.ok(editId ? 'Empleado actualizado.' : 'Empleado creado. Ya puede iniciar sesión en el panel con su correo y contraseña.');
      reset(); invalidar();
    },
    onError: (e) => m.err(e, 'No se pudo guardar el empleado'),
  });
  const cambiarEstado = useMutation({
    mutationFn: (e: any) => almacenApi.estadoEmpleado(e.idusuario, !e.activo),
    onSuccess: (_r, e: any) => { m.ok(e.activo ? 'Empleado desactivado: ya no puede iniciar sesión.' : 'Empleado activado.'); invalidar(); },
    onError: (e) => m.err(e),
  });
  const eliminar = useMutation({
    mutationFn: (id: number) => almacenApi.eliminarEmpleado(id),
    onSuccess: () => { m.ok('Empleado eliminado.'); invalidar(); },
    onError: (e) => m.err(e),
  });

  const editar = (e: any) => {
    setEditId(e.idusuario);
    setForm({
      nombre: e.nombre, apellido: e.apellido, correo: e.correo, password: '', tipodocumento: e.tipodocumento ?? 'CC',
      documento: e.documento, telefono: e.telefono ?? '', idbodega: String(e.idbodega),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (k: keyof Form) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const passwordValida = form.password === '' ? !!editId : /^[A-Za-z0-9]{6,12}$/.test(form.password);
  const valido = form.nombre.trim() && form.apellido.trim() && form.correo.trim() && form.documento.trim()
    && form.telefono.trim() && form.idbodega && passwordValida;
  const puntosActivos = (puntos.data ?? []).filter((p) => p.activo);
  const lista = q.data ?? [];

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />

      <Card>
        <CardHeader icon={editId ? 'edit' : 'person_add'} title={editId ? 'Editar empleado de almacén' : 'Registrar empleado de almacén'} />
        <form style={{ padding: 20 }} onSubmit={(e) => { e.preventDefault(); if (valido) guardar.mutate(form); }}>
          <Grid>
            <Field label="Nombre" required><input value={form.nombre} onChange={set('nombre')} placeholder="Ej. Juan" style={inputStyle} /></Field>
            <Field label="Apellido" required><input value={form.apellido} onChange={set('apellido')} placeholder="Ej. Pérez" style={inputStyle} /></Field>
            <Field label="Correo electrónico" required><input type="email" value={form.correo} onChange={set('correo')} placeholder="correo@ejemplo.com" style={inputStyle} /></Field>
            <Field label="Contraseña" required={!editId}>
              <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password"
                placeholder={editId ? 'Vacío = no cambiar' : '6-12 letras y números'} style={{ ...inputStyle, borderColor: form.password && !passwordValida ? '#fca5a5' : '#e2e8f0' }} />
            </Field>
          </Grid>
          <Grid style={{ marginTop: 14 }}>
            <Field label="Tipo doc." required>
              <select value={form.tipodocumento} onChange={set('tipodocumento')} style={inputStyle}>
                {['CC', 'CE', 'PAS', 'PEP'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Documento" required><input value={form.documento} onChange={set('documento')} placeholder="1234567890" style={inputStyle} /></Field>
            <Field label="Teléfono" required><input value={form.telefono} onChange={set('telefono')} placeholder="3001234567" style={inputStyle} /></Field>
            <Field label="Punto de almacén" required>
              <select value={form.idbodega} onChange={set('idbodega')} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {puntosActivos.map((p) => <option key={p.idbodega} value={p.idbodega}>{p.nombre} · {p.nombreciudad}</option>)}
              </select>
            </Field>
          </Grid>
          {!puntos.isLoading && !puntosActivos.length && (
            <p style={{ fontSize: 13, color: '#b45309' }}>No hay puntos de almacén activos. Créalos en Almacén › Puntos de almacén.</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            {editId && <Btn variant="secondary" icon="close" onClick={reset}>Cancelar</Btn>}
            <Btn type="submit" icon={editId ? 'edit' : 'save'} disabled={!valido || guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : editId ? 'Actualizar' : 'Guardar empleado'}
            </Btn>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader icon="badge" title="Empleados de almacén">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar nombre, documento o correo" style={{ ...inputStyle, width: 240, padding: '7px 10px' }} />
          <select value={idbodega} onChange={(e) => setIdbodega(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Punto de almacén">
            <option value="">Todos los puntos</option>
            {(puntos.data ?? []).map((p) => <option key={p.idbodega} value={p.idbodega}>{p.nombre}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
          </select>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={lista} clave={(e: any) => e.idusuario}
          vacio={debounced || estado || idbodega ? 'Ningún empleado coincide con el filtro.' : 'Aún no hay empleados de almacén.'}
          columnas={[
            { label: 'Nombre', render: (e: any) => <><b>{e.nombre} {e.apellido}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{e.tipodocumento} {e.documento}</div></> },
            { label: 'Contacto', render: (e: any) => <>{e.correo}<div style={{ fontSize: 11.5, color: '#64748b' }}>{e.telefono}</div></> },
            { label: 'Punto de almacén', render: (e: any) => <>{e.nombrebodega}<div style={{ fontSize: 11.5, color: '#64748b' }}>{e.nombreciudad}</div></> },
            { label: 'Estado', render: (e: any) => <Badge tone={e.activo ? 'green' : 'red'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { label: 'Acciones', render: (e: any) => (
              <div style={{ display: 'flex', gap: 2 }}>
                <Btn small variant="ghost" icon="visibility" title="Ver detalle" onClick={() => setVerId(e.idusuario)} />
                <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => editar(e)} />
                <Btn small variant="ghost" icon={e.activo ? 'block' : 'check_circle'} title={e.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => { if (!e.activo || window.confirm(`¿Desactivar a ${e.nombre} ${e.apellido}? No podrá iniciar sesión.`)) cambiarEstado.mutate(e); }} />
                <Btn small variant="ghost" icon="delete" title="Eliminar"
                  onClick={() => { if (window.confirm(`¿Eliminar definitivamente a ${e.nombre} ${e.apellido}? Solo es posible si nunca registró operaciones.`)) eliminar.mutate(e.idusuario); }} />
              </div>
            ) },
          ]}
        />
        <div style={{ padding: '10px 16px', fontSize: 12.5, color: '#94a3b8' }}>{lista.length} empleado(s)</div>
      </Card>

      {verId && <DetalleEmpleado id={verId} onClose={() => setVerId(null)} />}
    </Layout>
  );
};

function DetalleEmpleado({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery({ queryKey: ['almacen', 'empleado', id], queryFn: () => almacenApi.empleado(id) });
  const e: any = q.data;
  const fila = (k: string, v: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{k}</span><span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  );
  return (
    <Modal titulo="Empleado de almacén" onClose={onClose} ancho={480}>
      {!e ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: BLUE }}>account_circle</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{e.nombre} {e.apellido}</div>
              <Badge tone={e.activo ? 'green' : 'red'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>
          {fila('Documento', `${e.tipodocumento} ${e.documento}`)}
          {fila('Correo', e.correo)}
          {fila('Teléfono', e.telefono || '—')}
          {fila('Punto de almacén', e.nombrebodega)}
          {fila('Ubicación', `${e.direccionbodega ?? ''} · ${e.nombreciudad}`)}
          {fila('Registrado', fecha(e.fecharegistro, false))}
        </>
      )}
    </Modal>
  );
}
