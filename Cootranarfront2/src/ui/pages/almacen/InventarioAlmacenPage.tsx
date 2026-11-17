
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi, type Producto } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BodegaSelector, Btn, Card, CardHeader, Field, Grid, Modal, Paginador, Tabla,
  exportarExcel, fecha, inputStyle, money, num, useAlmacen, useMensaje,
} from './almacenUi';
import { ModalInformeNiif } from './ModalInformeNiif';

const TIPOS: Record<string, { label: string; tone: 'green' | 'red' | 'blue' | 'amber' | 'gray' }> = {
  ENTRADA_COMPRA: { label: 'Compra', tone: 'green' },
  SALIDA_VENTA: { label: 'Venta', tone: 'blue' },
  SALIDA_CONSUMO: { label: 'Consumo flota', tone: 'amber' },
  TRASLADO_SALIDA: { label: 'Traslado enviado', tone: 'gray' },
  TRASLADO_ENTRADA: { label: 'Traslado recibido', tone: 'gray' },
  AJUSTE_ENTRADA: { label: 'Ajuste +', tone: 'green' },
  AJUSTE_SALIDA: { label: 'Ajuste −', tone: 'red' },
  ANULACION_COMPRA: { label: 'Anula compra', tone: 'red' },
  ANULACION_VENTA: { label: 'Anula venta', tone: 'amber' },
  ANULACION_CONSUMO: { label: 'Anula consumo', tone: 'amber' },
  ANULACION_TRASLADO: { label: 'Anula traslado', tone: 'amber' },
};

export const InventarioAlmacenPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const { idbodega, idbodegaOperacion, esAdmin, bodegaActual } = useAlmacen();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'conStock' | 'bajoMinimo'>('conStock');
  const [page, setPage] = useState(1);
  const [kardexDe, setKardexDe] = useState<Producto | null>(null);
  const [ajusteDe, setAjusteDe] = useState<Producto | null>(null);
  const [mostrarReporteNiif, setMostrarReporteNiif] = useState(false);

  const filtros = {
    idbodega, busqueda, estado: 'activos', page, limit: 25,
    conStock: filtro === 'conStock' ? 'true' : undefined, bajoMinimo: filtro === 'bajoMinimo' ? 'true' : undefined,
  };
  const q = useQuery({ queryKey: ['almacen', 'inventario', filtros], queryFn: () => almacenApi.productos(filtros) });

  const ubicar = useMutation({
    mutationFn: ({ p, ubicacion }: { p: Producto; ubicacion: string }) => almacenApi.ubicacion(p.idproducto, idbodegaOperacion, ubicacion),
    onSuccess: () => { m.ok('Ubicación actualizada'); qc.invalidateQueries({ queryKey: ['almacen', 'inventario'] }); },
    onError: (e) => m.err(e),
  });

  const exportar = async () => {
    const filas = await almacenApi.reporteInventario(idbodega);
    await exportarExcel(`informe-general-inventarios-niifs-${new Date().toISOString().slice(0, 10)}`, [{
      nombre: 'Inventarios NIIFS',
      filas: filas.map((r) => ({
        Grupo: r.grupo || r.categoria || '',
        Referencia: r.referencia || r.codigo || '',
        'Descripcion Producto': r.descripcion || r.nombre || '',
        'Precio Unitario': Number(r.preciounitario || (Number(r.precioventa) / (1 + (Number(r.porcentajeiva) || 19) / 100))),
        'Precio Iva Inc': Number(r.precioivainc || r.precioventa),
        'Saldo Anterior': Number(r.saldoanterior ?? r.cantidad),
        Entradas: Number(r.entradas ?? 0),
        Salidas: Number(r.salidas ?? 0),
        'Nuevo Saldo': Number(r.nuevosaldo ?? r.cantidad),
        LOCALIZACION: r.localizacion || r.ubicacion || '',
        Bodega: r.bodega || '',
      })),
    }]);
  };

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="warehouse" title="Inventario de Repuestos (NIIFS)">
          <BodegaSelector />
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar referencia, producto…" style={{ ...inputStyle, width: 200, padding: '7px 10px' }} />
          <select value={filtro} onChange={(e) => { setFiltro(e.target.value as typeof filtro); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Filtro">
            <option value="conStock">Con existencias</option><option value="bajoMinimo">Bajo stock mínimo</option><option value="todos">Todo el catálogo</option>
          </select>
          <Btn variant="primary" icon="description" onClick={() => setMostrarReporteNiif(true)}>
            Informe NIIFS Oficial
          </Btn>
          <Btn variant="secondary" icon="download" onClick={exportar} title="Descargar formato Excel NIIFS">
            Excel NIIFS
          </Btn>
        </CardHeader>
        <Tabla
          cargando={q.isLoading}
          filas={q.data?.items ?? []}
          clave={(p) => p.idproducto}
          vacio={filtro === 'bajoMinimo' ? 'Ningún producto está bajo el mínimo.' : 'Sin existencias. Registra una compra o un ajuste de inventario inicial.'}
          columnas={[
            {
              label: 'Referencia',
              render: (p) => (
                <b style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '12.5px', color: '#1e293b' }}>
                  {p.codigo}
                </b>
              ),
            },
            {
              label: 'Descripcion Producto',
              render: (p) => (
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {p.nombrecategoria}{p.marca ? ` · ${p.marca}` : ''}
                  </div>
                </div>
              ),
            },
            {
              label: 'Precio Unitario',
              align: 'right',
              render: (p) => {
                const pu = Number(p.preciounitario) || (Number(p.precioventa) / (1 + (Number(p.porcentajeiva) || 19) / 100));
                return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(pu)}</span>;
              },
            },
            {
              label: 'Precio Iva Inc',
              align: 'right',
              render: (p) => (
                <b style={{ fontVariantNumeric: 'tabular-nums', color: '#0284c7' }}>
                  {money(p.precioivainc || p.precioventa)}
                </b>
              ),
            },
            {
              label: 'Saldo Anterior',
              align: 'right',
              render: (p) => (
                <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  {num(p.saldoanterior ?? p.stock)}
                </span>
              ),
            },
            {
              label: 'Entradas',
              align: 'right',
              render: (p) => {
                const ent = Number(p.entradas ?? 0);
                return (
                  <span style={{ color: ent > 0 ? '#15803d' : '#94a3b8', fontWeight: ent > 0 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                    {ent > 0 ? `+${num(ent)}` : '0'}
                  </span>
                );
              },
            },
            {
              label: 'Salidas',
              align: 'right',
              render: (p) => {
                const sal = Number(p.salidas ?? 0);
                return (
                  <span style={{ color: sal > 0 ? '#b91c1c' : '#94a3b8', fontWeight: sal > 0 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                    {sal > 0 ? `-${num(sal)}` : '0'}
                  </span>
                );
              },
            },
            {
              label: 'Nuevo Saldo',
              align: 'right',
              render: (p) => {
                const s = Number(p.nuevosaldo ?? p.stock ?? 0);
                return (
                  <Badge tone={s <= 0 ? 'red' : s <= Number(p.stockminimo) ? 'amber' : 'green'}>
                    {num(s)} {p.unidadmedida.toLowerCase()}
                  </Badge>
                );
              },
            },
            {
              label: 'LOCALIZACION',
              render: (p: Producto) => (
                <button
                  onClick={() => {
                    const u = window.prompt(`Ubicación de "${p.nombre}" en bodega (ej. ESTANTE A-2, PASILLO 3):`, p.ubicacion ?? p.localizacion ?? '');
                    if (u !== null) ubicar.mutate({ p, ubicacion: u });
                  }}
                  title="Clic para cambiar localización en bodega"
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#334155',
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  {p.ubicacion || p.localizacion || 'Asignar'}
                </button>
              ),
            },
            {
              label: 'Acciones',
              render: (p) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn small variant="ghost" icon="timeline" title="Kárdex" onClick={() => setKardexDe(p)} />
                  {esAdmin && <Btn small variant="ghost" icon="tune" title="Ajustar inventario" onClick={() => setAjusteDe(p)} />}
                </div>
              ),
            },
          ]}
        />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>

      {mostrarReporteNiif && (
        <ModalInformeNiif
          idbodega={idbodega}
          bodegaActual={bodegaActual ?? null}
          onClose={() => setMostrarReporteNiif(false)}
        />
      )}

      {kardexDe && <KardexModal producto={kardexDe} idbodega={idbodega} onClose={() => setKardexDe(null)} />}
      {ajusteDe && (
        <AjusteModal producto={ajusteDe} idbodega={idbodegaOperacion} nombreBodega={bodegaActual?.nombre ?? ''}
          onClose={() => setAjusteDe(null)}
          onOk={(t) => { m.ok(t); setAjusteDe(null); qc.invalidateQueries({ queryKey: ['almacen'] }); }} />
      )}
    </Layout>
  );
};

function KardexModal({ producto, idbodega, onClose }: { producto: Producto; idbodega: number | null; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['almacen', 'kardex', producto.idproducto, idbodega, page],
    queryFn: () => almacenApi.kardex(producto.idproducto, { idbodega, page, limit: 30 }),
  });
  return (
    <Modal titulo={`Kárdex · ${producto.nombre}`} onClose={onClose} ancho={1000}>
      {q.data && (
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
          Existencia actual{idbodega ? ' en la bodega' : ' (todas las bodegas)'}: <b>{num(q.data.producto.stock)} {String(q.data.producto.unidadmedida).toLowerCase()}</b>
        </div>
      )}
      <Tabla
        cargando={q.isLoading}
        filas={q.data?.items ?? []}
        clave={(k: any) => k.idmovimiento}
        vacio="Este producto aún no tiene movimientos."
        columnas={[
          { label: 'Fecha', render: (k: any) => fecha(k.fecha) },
          { label: 'Movimiento', render: (k: any) => <Badge tone={TIPOS[k.tipo]?.tone ?? 'gray'}>{TIPOS[k.tipo]?.label ?? k.tipo}</Badge> },
          ...(idbodega ? [] : [{ label: 'Bodega', render: (k: any) => k.nombrebodega }]),
          {
            label: 'Cantidad', align: 'right', render: (k: any) => (
              <b style={{ color: Number(k.cantidad) > 0 ? '#15803d' : '#b91c1c' }}>{Number(k.cantidad) > 0 ? '+' : ''}{num(k.cantidad)}</b>
            )
          },
          { label: 'Costo unit.', align: 'right', render: (k: any) => money(k.costounitario) },
          { label: 'Saldo', align: 'right', render: (k: any) => <b>{num(k.saldocantidad)}</b> },
          { label: 'Costo prom.', align: 'right', render: (k: any) => money(k.saldocostopromedio) },
          { label: 'Detalle', render: (k: any) => <span style={{ fontSize: 12 }}>{k.observacion ?? ''}<div style={{ color: '#94a3b8' }}>{k.usuario}</div></span> },
        ]}
      />
      {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
    </Modal>
  );
}

function AjusteModal({ producto, idbodega, nombreBodega, onClose, onOk }: {
  producto: Producto; idbodega: number | null; nombreBodega: string; onClose: () => void; onOk: (t: string) => void;
}) {
  const [sentido, setSentido] = useState<'+' | '-'>('+');
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState(String(Number(producto.costopromedio ?? 0) || ''));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const ajustar = useMutation({
    mutationFn: () => almacenApi.ajustar({
      idbodega, idproducto: producto.idproducto, motivo,
      cantidad: (sentido === '+' ? 1 : -1) * Number(cantidad),
      costounitario: sentido === '+' && costo !== '' ? Number(costo) : undefined,
    }),
    onSuccess: (r: any) => onOk(`Ajuste registrado. Nuevo saldo: ${num(r.saldo)}`),
    onError: (e: any) => setError(e?.response?.data?.message || 'No se pudo ajustar'),
  });
  const valido = Number(cantidad) > 0 && motivo.trim().length >= 3 && !!idbodega;
  return (
    <Modal titulo={`Ajustar inventario · ${producto.nombre}`} onClose={onClose} ancho={560}>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
        Bodega <b>{nombreBodega || '—'}</b>. Úsalo para el inventario inicial, conteos físicos, mermas o daños. Queda registrado en el kárdex con tu usuario.
      </p>
      {error && <Alerta msg={{ tipo: 'err', texto: error }} />}
      <Grid cols={2}>
        <Field label="Tipo" required>
          <select value={sentido} onChange={(e) => setSentido(e.target.value as '+' | '-')} style={inputStyle}>
            <option value="+">Entrada (+)</option><option value="-">Salida (−)</option>
          </select>
        </Field>
        <Field label="Cantidad" required><input type="number" min={0.01} step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={inputStyle} /></Field>
        {sentido === '+' && (
          <Field label="Costo unitario (sin IVA)"><input type="number" min={0} value={costo} onChange={(e) => setCosto(e.target.value)} style={inputStyle} /></Field>
        )}
      </Grid>
      <Field label="Motivo" required style={{ marginTop: 14 }}>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Inventario inicial / conteo físico / producto dañado…" style={inputStyle} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="save" disabled={!valido || ajustar.isPending} onClick={() => ajustar.mutate()}>Registrar ajuste</Btn>
      </div>
    </Modal>
  );
}
