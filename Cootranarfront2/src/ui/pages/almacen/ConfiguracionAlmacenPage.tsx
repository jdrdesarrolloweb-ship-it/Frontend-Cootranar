import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Bodega } from '../../../infrastructure/services/almacenApi';
import { ROUTES } from '../../../shared/constants';
import { Alerta, Badge, Btn, Card, CardHeader, Field, Grid, Modal, Tabla, inputStyle, money, useMensaje } from './almacenUi';

/**
 * Solo administrador: puntos de almacén (bodegas).
 * Son independientes de las agencias de buses: se ubican por ciudad y dirección.
 * El personal se gestiona en Gestión Empleados › Empleados Almacén.
 */
const puntoVacio = { nombre: '', idciudad: '', direccion: '', telefono: '' };

export const ConfiguracionAlmacenPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['almacen', 'bodegas'], queryFn: almacenApi.bodegas });
  const ciudades = useQuery({ queryKey: ['almacen', 'ciudades'], queryFn: almacenApi.ciudades, staleTime: 300_000 });
  const [form, setForm] = useState<typeof puntoVacio | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const invalidar = () => qc.invalidateQueries({ queryKey: ['almacen'] });

  const guardar = useMutation({
    mutationFn: (f: typeof puntoVacio) => {
      const d = { ...f, idciudad: Number(f.idciudad) };
      return editId ? almacenApi.actualizarBodega(editId, d) : almacenApi.crearBodega(d);
    },
    onSuccess: () => { m.ok(editId ? 'Punto de almacén actualizado' : 'Punto de almacén creado'); setForm(null); invalidar(); },
    onError: (e) => m.err(e),
  });
  const estado = useMutation({
    mutationFn: (b: Bodega) => almacenApi.estadoBodega(b.idbodega, !b.activo),
    onSuccess: invalidar,
    onError: (e) => m.err(e),
  });
  const set = (k: keyof typeof puntoVacio) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
  const valido = form && form.nombre.trim() && form.idciudad && form.direccion.trim();

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="warehouse" title="Puntos de almacén">
          <Link to={ROUTES.EMPLEADOS_ALMACEN}><Btn variant="secondary" icon="badge">Empleados de almacén</Btn></Link>
          <Btn icon="add" onClick={() => { setEditId(null); setForm({ ...puntoVacio }); }}>Nuevo punto</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(b) => b.idbodega} vacio="Crea el primer punto de almacén para empezar." columnas={[
          { label: 'Punto', render: (b) => <b>{b.nombre}</b> },
          { label: 'Ubicación', render: (b) => <>{b.direccion ?? '—'}<div style={{ fontSize: 11.5, color: '#64748b' }}>{b.nombreciudad}</div></> },
          { label: 'Teléfono', render: (b) => b.telefono || '—' },
          { label: 'Empleados', align: 'right', render: (b) => b.almacenistas ?? 0 },
          { label: 'Valor inventario', align: 'right', render: (b) => money(b.valorinventario) },
          { label: 'Estado', render: (b) => <Badge tone={b.activo ? 'green' : 'red'}>{b.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: 'Acciones', render: (b) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => {
                setEditId(b.idbodega);
                setForm({ nombre: b.nombre, idciudad: String(b.idciudad), direccion: b.direccion ?? '', telefono: b.telefono ?? '' });
              }} />
              <Btn small variant="ghost" icon={b.activo ? 'block' : 'check_circle'} title={b.activo ? 'Desactivar' : 'Activar'} onClick={() => estado.mutate(b)} />
            </div>
          ) },
        ]} />
      </Card>

      {form && (
        <Modal titulo={editId ? 'Editar punto de almacén' : 'Nuevo punto de almacén'} onClose={() => setForm(null)} ancho={620}>
          <form onSubmit={(e) => { e.preventDefault(); if (valido) guardar.mutate(form); }}>
            <Grid cols={2}>
              <Field label="Nombre" required><input value={form.nombre} onChange={set('nombre')} placeholder="Almacén EDS" style={inputStyle} /></Field>
              <Field label="Ciudad" required>
                <select value={form.idciudad} onChange={set('idciudad')} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {(ciudades.data ?? []).map((c) => <option key={c.idciudad} value={c.idciudad}>{c.nombre}{c.nombredepartamento ? ` · ${c.nombredepartamento}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Dirección" required><input value={form.direccion} onChange={set('direccion')} placeholder="Calle 12 # 5-08" style={inputStyle} /></Field>
              <Field label="Teléfono"><input value={form.telefono} onChange={set('telefono')} style={inputStyle} /></Field>
            </Grid>
            <p style={{ fontSize: 12, color: '#64748b' }}>La ciudad define el municipio que se reporta en las facturas electrónicas de este punto.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn type="submit" icon="save" disabled={!valido || guardar.isPending}>Guardar</Btn>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
};
