import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BodegaSelector, Btn, Card, CardHeader, Field, FiltroFechas, Grid, Modal, Paginador, ProductoPicker,
  Tabla, VehiculoPicker, fecha, haceDiasISO, hoyISO, inputStyle, money, num, pedirMotivo, useAlmacen, useMensaje,
} from './almacenUi';

interface Linea { producto: Producto; cantidad: string }

export const ConsumoInternoPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const { idbodega, idbodegaOperacion, esAdmin } = useAlmacen();

  const [vehiculo, setVehiculo] = useState<{ idvehiculo: number; placa: string } | null>(null);
  const [kilometraje, setKilometraje] = useState('');
  const [motivo, setMotivo] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);

  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());
  const [page, setPage] = useState(1);
  const [historialDe, setHistorialDe] = useState<{ idvehiculo: number; placa: string } | null>(null);

  const filtros = { idbodega, desde, hasta, page, limit: 15 };
  const q = useQuery({ queryKey: ['almacen', 'consumos', filtros], queryFn: () => almacenApi.consumos(filtros) });

  const registrar = useMutation({
    mutationFn: () => almacenApi.registrarConsumo({
      idbodega: idbodegaOperacion, idvehiculo: vehiculo?.idvehiculo, kilometraje: kilometraje || undefined, motivo,
      items: lineas.map((l) => ({ idproducto: l.producto.idproducto, cantidad: Number(l.cantidad) })),
    }),
    onSuccess: (c: any) => {
      m.ok(`Salida registrada para ${vehiculo?.placa}: costo ${money(c.costototal)}`);
      setLineas([]); setMotivo(''); setKilometraje(''); setVehiculo(null);
      qc.invalidateQueries({ queryKey: ['almacen'] });
    },
    onError: (e) => m.err(e),
  });
  const anular = useMutation({
    mutationFn: ({ id, motivo: mot }: { id: number; motivo: string }) => almacenApi.anularConsumo(id, mot),
    onSuccess: () => { m.ok('Consumo anulado; los productos regresaron a la bodega.'); qc.invalidateQueries({ queryKey: ['almacen'] }); },
    onError: (e) => m.err(e),
  });

  const agregar = (p: Producto) => setLineas((prev) => (prev.some((l) => l.producto.idproducto === p.idproducto) ? prev : [...prev, { producto: p, cantidad: '1' }]));
  const valido = vehiculo && motivo.trim().length >= 3 && lineas.length > 0 && lineas.every((l) => Number(l.cantidad) > 0 && Number(l.cantidad) <= Number(l.producto.stock ?? 0));

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="build" title="Salida para mantenimiento de la flota">
          <BodegaSelector permitirTodas={false} />
        </CardHeader>
        <div style={{ padding: 20 }}>
          <Grid cols={3}>
            <Field label="Vehículo" required><VehiculoPicker value={vehiculo} onChange={setVehiculo} /></Field>
            <Field label="Kilometraje"><input type="number" min={0} value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="Ej. 152000" style={inputStyle} /></Field>
            <Field label="Motivo / trabajo" required><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Cambio de aceite y filtros" style={inputStyle} /></Field>
          </Grid>
          <div style={{ marginTop: 16 }}><ProductoPicker idbodega={idbodegaOperacion} onSelect={agregar} soloConStock placeholder="Agregar repuesto o lubricante…" /></div>
          <div style={{ marginTop: 12 }}>
            <Tabla filas={lineas} clave={(l) => l.producto.idproducto} vacio="Agrega los productos que salen de la bodega." columnas={[
              { label: 'Producto', render: (l) => <>{l.producto.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{l.producto.codigo}</div></> },
              { label: 'Disponible', align: 'right', render: (l) => num(l.producto.stock) },
              { label: 'Cantidad', align: 'right', render: (l) => (
                <input type="number" min={0.01} step="any" value={l.cantidad} aria-label="Cantidad"
                  onChange={(e) => setLineas((p) => p.map((x) => (x === l ? { ...x, cantidad: e.target.value } : x)))}
                  style={{ ...inputStyle, width: 90, textAlign: 'right', borderColor: Number(l.cantidad) > Number(l.producto.stock ?? 0) ? '#fca5a5' : '#e2e8f0' }} />
              ) },
              { label: 'Costo aprox.', align: 'right', render: (l) => money(Number(l.cantidad) * Number(l.producto.costopromedio ?? 0)) },
              { label: '', render: (l) => <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setLineas((p) => p.filter((x) => x !== l))} /> },
            ]} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn icon="outbound" variant="success" disabled={!valido || registrar.isPending || !idbodegaOperacion} onClick={() => registrar.mutate()}>
              {registrar.isPending ? 'Registrando…' : 'Registrar salida'}
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon="history" title="Consumos registrados">
          <BodegaSelector />
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(c: any) => c.idconsumo} columnas={[
          { label: 'Fecha', render: (c: any) => fecha(c.fecha) },
          { label: 'Vehículo', render: (c: any) => (
            <button onClick={() => setHistorialDe({ idvehiculo: c.idvehiculo, placa: c.placa })} title="Ver historial del vehículo"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Badge tone="blue">{c.placa}</Badge>
            </button>
          ) },
          { label: 'Km', align: 'right', render: (c: any) => (c.kilometraje ? num(c.kilometraje) : '—') },
          { label: 'Trabajo', render: (c: any) => <>{c.motivo}<div style={{ fontSize: 11.5, color: '#64748b' }}>{(c.items ?? []).map((i: any) => `${num(i.cantidad)} ${i.nombre}`).join(', ')}</div></> },
          { label: 'Costo', align: 'right', render: (c: any) => <b>{money(c.costototal)}</b> },
          { label: 'Estado', render: (c: any) => <Badge tone={c.estado === 'ANULADO' ? 'red' : 'green'}>{c.estado}</Badge> },
          ...(esAdmin ? [{ label: '', render: (c: any) => c.estado !== 'ANULADO' && (
            <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const mot = pedirMotivo('anular este consumo'); if (mot) anular.mutate({ id: c.idconsumo, motivo: mot }); }} />
          ) }] : []),
        ]} />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>

      {historialDe && <HistorialVehiculo vehiculo={historialDe} onClose={() => setHistorialDe(null)} />}
    </Layout>
  );
};

export function HistorialVehiculo({ vehiculo, onClose }: { vehiculo: { idvehiculo: number; placa: string }; onClose: () => void }) {
  const q = useQuery({ queryKey: ['almacen', 'historial', vehiculo.idvehiculo], queryFn: () => almacenApi.historialVehiculo(vehiculo.idvehiculo) });
  return (
    <Modal titulo={`Historial de repuestos · ${vehiculo.placa}`} onClose={onClose} ancho={900}>
      <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(r: any) => `${r.origen}-${r.fecha}-${r.nombre}`} vacio="Sin registros para este vehículo." columnas={[
        { label: 'Fecha', render: (r: any) => fecha(r.fecha) },
        { label: 'Origen', render: (r: any) => <Badge tone={r.origen === 'CONSUMO' ? 'amber' : 'blue'}>{r.origen === 'CONSUMO' ? 'Flota' : 'Compra socio'}</Badge> },
        { label: 'Producto', render: (r: any) => r.nombre },
        { label: 'Cantidad', align: 'right', render: (r: any) => `${num(r.cantidad)} ${String(r.unidadmedida).toLowerCase()}` },
        { label: 'Km', align: 'right', render: (r: any) => (r.kilometraje ? num(r.kilometraje) : '—') },
        { label: 'Detalle', render: (r: any) => r.detalle },
        { label: 'Valor', align: 'right', render: (r: any) => money(r.valor) },
      ]} />
    </Modal>
  );
}
