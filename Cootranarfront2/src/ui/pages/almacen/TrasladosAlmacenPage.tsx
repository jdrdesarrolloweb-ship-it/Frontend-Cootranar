import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BodegaSelector, Btn, Card, CardHeader, Field, Grid, Paginador, ProductoPicker, Tabla,
  fecha, inputStyle, num, pedirMotivo, useAlmacen, useMensaje,
} from './almacenUi';

interface Linea { producto: Producto; cantidad: string }
const tono = { ENVIADO: 'amber', RECIBIDO: 'green', ANULADO: 'red' } as const;

export const TrasladosAlmacenPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const { idbodega, idbodegaOperacion, esAdmin, bodegas, bodegaActual } = useAlmacen();
  const [destino, setDestino] = useState('');
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const filtros = { idbodega, estado, page, limit: 15 };
  const q = useQuery({ queryKey: ['almacen', 'traslados', filtros], queryFn: () => almacenApi.traslados(filtros) });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['almacen'] });

  const enviar = useMutation({
    mutationFn: () => almacenApi.enviarTraslado({
      idbodega: idbodegaOperacion, idbodegadestino: Number(destino), observacion,
      items: lineas.map((l) => ({ idproducto: l.producto.idproducto, cantidad: Number(l.cantidad) })),
    }),
    onSuccess: (t: any) => { m.ok(`Traslado #${t.idtraslado} enviado. La bodega destino debe confirmar la recepción.`); setLineas([]); setObservacion(''); invalidar(); },
    onError: (e) => m.err(e),
  });
  const recibir = useMutation({
    mutationFn: (id: number) => almacenApi.recibirTraslado(id),
    onSuccess: (t: any) => { m.ok(`Traslado #${t.idtraslado} recibido; la mercancía ya está en el inventario.`); invalidar(); },
    onError: (e) => m.err(e),
  });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => almacenApi.anularTraslado(id, motivo),
    onSuccess: () => { m.ok('Traslado anulado; la mercancía regresó a la bodega de origen.'); invalidar(); },
    onError: (e) => m.err(e),
  });

  const destinos = bodegas.filter((b) => b.activo && b.idbodega !== idbodegaOperacion);
  const agregar = (p: Producto) => setLineas((prev) => (prev.some((l) => l.producto.idproducto === p.idproducto) ? prev : [...prev, { producto: p, cantidad: '1' }]));
  const valido = destino && lineas.length > 0 && lineas.every((l) => Number(l.cantidad) > 0 && Number(l.cantidad) <= Number(l.producto.stock ?? 0));
  const miBodega = esAdmin ? null : idbodegaOperacion;

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="swap_horiz" title={`Enviar mercancía desde ${bodegaActual?.nombre ?? '…'}`}>
          <BodegaSelector permitirTodas={false} />
        </CardHeader>
        <div style={{ padding: 20 }}>
          <Grid cols={2}>
            <Field label="Bodega destino" required>
              <select value={destino} onChange={(e) => setDestino(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {destinos.map((b) => <option key={b.idbodega} value={b.idbodega}>{b.nombre} · {b.nombreciudad}</option>)}
              </select>
            </Field>
            <Field label="Observación"><input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. enviado en bus 5775" style={inputStyle} /></Field>
          </Grid>
          {!destinos.length && <p style={{ fontSize: 13, color: '#b45309' }}>Solo hay una bodega activa; crea otra para poder trasladar.</p>}
          <div style={{ marginTop: 16 }}><ProductoPicker idbodega={idbodegaOperacion} onSelect={agregar} soloConStock placeholder="Agregar producto a trasladar…" /></div>
          <div style={{ marginTop: 12 }}>
            <Tabla filas={lineas} clave={(l) => l.producto.idproducto} vacio="Agrega los productos a enviar." columnas={[
              { label: 'Producto', render: (l) => <>{l.producto.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{l.producto.codigo}</div></> },
              { label: 'Disponible', align: 'right', render: (l) => num(l.producto.stock) },
              { label: 'Cantidad', align: 'right', render: (l) => (
                <input type="number" min={0.01} step="any" value={l.cantidad} aria-label="Cantidad"
                  onChange={(e) => setLineas((p) => p.map((x) => (x === l ? { ...x, cantidad: e.target.value } : x)))}
                  style={{ ...inputStyle, width: 90, textAlign: 'right' }} />
              ) },
              { label: '', render: (l) => <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setLineas((p) => p.filter((x) => x !== l))} /> },
            ]} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn icon="send" disabled={!valido || enviar.isPending} onClick={() => enviar.mutate()}>{enviar.isPending ? 'Enviando…' : 'Enviar traslado'}</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon="sync_alt" title="Traslados">
          <BodegaSelector />
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="">Todos</option><option value="ENVIADO">Pendientes de recibir</option><option value="RECIBIDO">Recibidos</option><option value="ANULADO">Anulados</option>
          </select>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(t: any) => t.idtraslado} columnas={[
          { label: '#', render: (t: any) => <b>{t.idtraslado}</b> },
          { label: 'Enviado', render: (t: any) => <>{fecha(t.fechaenvio)}<div style={{ fontSize: 11.5, color: '#64748b' }}>{t.enviadopor}</div></> },
          { label: 'Ruta', render: (t: any) => <>{t.bodegaorigen} → <b>{t.bodegadestino}</b></> },
          { label: 'Productos', render: (t: any) => <span style={{ fontSize: 12 }}>{(t.items ?? []).map((i: any) => `${num(i.cantidad)} ${i.nombre}`).join(', ')}</span> },
          { label: 'Estado', render: (t: any) => <>
            <Badge tone={tono[t.estado as keyof typeof tono]}>{t.estado}</Badge>
            {t.fecharecepcion && <div style={{ fontSize: 11, color: '#64748b' }}>{fecha(t.fecharecepcion)} · {t.recibidopor}</div>}
          </> },
          { label: 'Acciones', render: (t: any) => t.estado === 'ENVIADO' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(esAdmin || miBodega === t.idbodegadestino) && (
                <Btn small variant="success" icon="move_to_inbox" disabled={recibir.isPending}
                  onClick={() => { if (window.confirm(`¿Confirmas que recibiste completo el traslado #${t.idtraslado}?`)) recibir.mutate(t.idtraslado); }}>Recibir</Btn>
              )}
              {(esAdmin || miBodega === t.idbodegaorigen) && (
                <Btn small variant="danger" icon="undo" title="Anular" onClick={() => { const mot = pedirMotivo(`anular el traslado #${t.idtraslado}`); if (mot) anular.mutate({ id: t.idtraslado, motivo: mot }); }} />
              )}
            </div>
          ) },
        ]} />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>
    </Layout>
  );
};
