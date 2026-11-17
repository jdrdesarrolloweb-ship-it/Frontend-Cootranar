import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BodegaSelector, Btn, Card, CardHeader, EstadoFactura, FiltroFechas, Modal, Paginador, Tabla,
  exportarExcel, fecha, haceDiasISO, hoyISO, imprimirRecibo, inputStyle, money, num, pedirMotivo, useAlmacen, useMensaje,
} from './almacenUi';

const tonoEstado = { PAGADA: 'green', CREDITO: 'amber', ANULADA: 'red' } as const;

export const VentasAlmacenPage = () => {
  const qc = useQueryClient();
  const { idbodega, esAdmin } = useAlmacen();
  const m = useMensaje();
  const [desde, setDesde] = useState(haceDiasISO(7));
  const [hasta, setHasta] = useState(hoyISO());
  const [estado, setEstado] = useState('');
  const [tipocliente, setTipocliente] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estadofactura, setEstadofactura] = useState('');
  const [page, setPage] = useState(1);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const filtros = { idbodega, desde, hasta, estado, tipocliente, busqueda, estadofactura, page, limit: 20 };
  const q = useQuery({ queryKey: ['almacen', 'ventas', filtros], queryFn: () => almacenApi.ventas(filtros) });
  const detalle = useQuery({ queryKey: ['almacen', 'venta', detalleId], queryFn: () => almacenApi.venta(detalleId!), enabled: !!detalleId });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => almacenApi.anularVenta(id, motivo),
    onSuccess: (v: any) => { m.ok(`Venta ${v.consecutivo} anulada; el inventario y la cartera se reversaron.`); qc.invalidateQueries({ queryKey: ['almacen'] }); },
    onError: (e) => m.err(e),
  });
  const refacturar = useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: boolean }) => (nota ? almacenApi.reintentarNotaCredito(id) : almacenApi.reintentarFactura(id)),
    onSuccess: (v: any, { nota }) => {
      const estadoDoc = nota ? v.estadonotacredito : v.estadofactura;
      if (estadoDoc === 'APROBADA') m.ok(nota ? `Nota crédito ${v.numeronotacredito} validada por la DIAN.` : `Factura ${v.numerofactura} validada por la DIAN.`);
      else m.err(null, `La DIAN/Factus rechazó el documento: ${(nota ? v.errornotacredito : v.errorfactura) ?? 'sin detalle'}`);
      qc.invalidateQueries({ queryKey: ['almacen'] });
    },
    onError: (e) => m.err(e),
  });

  const exportar = async () => {
    const todo = await almacenApi.ventas({ ...filtros, page: 1, limit: 200 });
    await exportarExcel(`ventas-almacen-${desde}-a-${hasta}`, [{
      nombre: 'Ventas',
      filas: todo.items.map((v: any) => ({
        Recibo: v.consecutivo, Fecha: fecha(v.fechaventa), Bodega: v.nombrebodega, Cliente: v.nombrecliente,
        Tipo: v.tipocliente, Placa: v.placa ?? '', Pago: v.formapago === 'CREDITO' ? 'Crédito' : v.metodopago,
        Subtotal: Number(v.subtotal), IVA: Number(v.iva), Total: Number(v.total), Estado: v.estado, Vendedor: v.vendedor,
        'Factura electrónica': v.numerofactura ?? '', 'Estado factura': v.estadofactura, CUFE: v.cufe ?? '', 'Nota crédito': v.numeronotacredito ?? '',
      })),
    }]);
  };

  const data = q.data;
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="receipt_long" title="Historial de ventas">
          <BodegaSelector />
          <FiltroFechas desde={desde} hasta={hasta} onDesde={(v) => { setDesde(v); setPage(1); }} onHasta={(v) => { setHasta(v); setPage(1); }} />
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="">Todos los estados</option><option value="PAGADA">Pagada</option><option value="CREDITO">Crédito</option><option value="ANULADA">Anulada</option>
          </select>
          <select value={tipocliente} onChange={(e) => { setTipocliente(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Tipo de cliente">
            <option value="">Socios y público</option><option value="SOCIO">Socios</option><option value="PUBLICO">Público</option>
          </select>
          <select value={estadofactura} onChange={(e) => { setEstadofactura(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Factura electrónica">
            <option value="">Toda facturación</option><option value="APROBADA">Facturadas</option><option value="ERROR">Con error DIAN</option><option value="PENDIENTE">Pendientes</option>
          </select>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Recibo, cliente o placa" style={{ ...inputStyle, width: 190, padding: '7px 10px' }} />
          <Btn variant="secondary" icon="download" onClick={exportar}>Excel</Btn>
        </CardHeader>
        <Tabla
          cargando={q.isLoading}
          filas={data?.items ?? []}
          clave={(v: any) => v.idventa}
          onFila={(v: any) => setDetalleId(v.idventa)}
          columnas={[
            { label: 'Recibo', render: (v: any) => <b>{v.consecutivo}</b> },
            { label: 'Fecha', render: (v: any) => fecha(v.fechaventa) },
            { label: 'Cliente', render: (v: any) => <>{v.nombrecliente}{v.placa && <div style={{ fontSize: 11.5, color: '#64748b' }}>{v.placa}</div>}</> },
            { label: 'Tipo', render: (v: any) => <Badge tone={v.tipocliente === 'SOCIO' ? 'blue' : 'gray'}>{v.tipocliente === 'SOCIO' ? 'Socio' : 'Público'}</Badge> },
            { label: 'Pago', render: (v: any) => (v.formapago === 'CREDITO' ? 'Crédito' : v.metodopago) },
            ...(esAdmin && !idbodega ? [{ label: 'Bodega', render: (v: any) => v.nombrebodega }] : []),
            { label: 'Total', align: 'right', render: (v: any) => <b>{money(v.total)}</b> },
            { label: 'Estado', render: (v: any) => <Badge tone={tonoEstado[v.estado as keyof typeof tonoEstado]}>{v.estado}</Badge> },
            { label: 'Factura DIAN', render: (v: any) => <EstadoFactura v={v} /> },
          ]}
        />
        {data && <Paginador pagina={page} totalPaginas={data.paginacion.totalPaginas} total={data.paginacion.total} onCambio={setPage} />}
      </Card>

      {detalleId && (
        <Modal titulo={detalle.data ? `Venta ${detalle.data.consecutivo}` : 'Venta'} onClose={() => setDetalleId(null)}>
          {!detalle.data ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13, color: '#475569', marginBottom: 14 }}>
                <div><b>Cliente:</b> {detalle.data.nombrecliente} {detalle.data.documentocliente ? `(${detalle.data.documentocliente})` : ''}</div>
                <div><b>Fecha:</b> {fecha(detalle.data.fechaventa)}</div>
                <div><b>Bodega:</b> {detalle.data.nombrebodega}</div>
                <div><b>Vehículo:</b> {detalle.data.placa ?? '—'}</div>
                <div><b>Pago:</b> {detalle.data.formapago === 'CREDITO' ? 'Crédito' : detalle.data.metodopago}</div>
                <div><b>Vendedor:</b> {detalle.data.vendedor}</div>
              </div>
              {detalle.data.estado === 'ANULADA' && <Alerta msg={{ tipo: 'err', texto: `Anulada: ${detalle.data.motivoanulacion ?? ''}` }} />}
              <FacturaDetalle v={detalle.data} esAdmin={esAdmin} procesando={refacturar.isPending}
                onReintentar={(nota) => refacturar.mutate({ id: detalle.data.idventa, nota }, { onSuccess: () => detalle.refetch() })} />
              <Tabla
                filas={detalle.data.items}
                clave={(i: any) => i.iddetalle}
                columnas={[
                  { label: 'Producto', render: (i: any) => <>{i.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{i.codigo}</div></> },
                  { label: 'Cant.', align: 'right', render: (i: any) => num(i.cantidad) },
                  { label: 'Precio', align: 'right', render: (i: any) => money(i.preciounitario) },
                  { label: 'Total', align: 'right', render: (i: any) => money(i.total) },
                ]}
              />
              <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13, color: '#475569' }}>
                Subtotal {money(detalle.data.subtotal)} · IVA {money(detalle.data.iva)} · <b style={{ fontSize: 16, color: '#0f172a' }}>Total {money(detalle.data.total)}</b>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                {esAdmin && detalle.data.estado !== 'ANULADA' && (
                  <Btn variant="danger" icon="block" disabled={anular.isPending} onClick={() => {
                    const motivo = pedirMotivo(`anular la venta ${detalle.data.consecutivo}`);
                    if (motivo) anular.mutate({ id: detalle.data.idventa, motivo }, { onSuccess: () => setDetalleId(null) });
                  }}>Anular venta</Btn>
                )}
                <Btn icon="print" onClick={() => imprimirRecibo(detalle.data)}>Imprimir recibo</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
    </Layout>
  );
};

/** Bloque de factura electrónica DIAN (y nota crédito) dentro del detalle de la venta. */
function FacturaDetalle({ v, esAdmin, procesando, onReintentar }: {
  v: any; esAdmin: boolean; procesando: boolean; onReintentar: (nota: boolean) => void;
}) {
  const aprobada = v.estadofactura === 'APROBADA';
  const anulada = v.estado === 'ANULADA';
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {aprobada && v.qrfactura && <img src={v.qrfactura} alt="QR de verificación DIAN" width={96} height={96} />}
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <b style={{ color: '#0f172a' }}>Factura electrónica</b> <EstadoFactura v={v} />
        </div>
        {aprobada ? (
          <>
            <div style={{ fontSize: 11.5, wordBreak: 'break-all' }}>CUFE: {v.cufe}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {v.urlfactura && <a href={v.urlfactura} target="_blank" rel="noreferrer" style={{ color: '#0D3B8E', fontWeight: 700 }}>Ver factura (PDF)</a>}
              {v.urlqrfactura && <a href={v.urlqrfactura} target="_blank" rel="noreferrer" style={{ color: '#0D3B8E', fontWeight: 700 }}>Verificar en la DIAN</a>}
            </div>
          </>
        ) : (
          <>
            {v.errorfactura && <div style={{ color: '#b91c1c', fontSize: 12 }}>{v.errorfactura}</div>}
            {!anulada && <div style={{ marginTop: 8 }}><Btn small icon="refresh" disabled={procesando} onClick={() => onReintentar(false)}>Reintentar factura</Btn></div>}
          </>
        )}
        {anulada && aprobada && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            <b style={{ color: '#0f172a' }}>Nota crédito de anulación: </b>
            {v.estadonotacredito === 'APROBADA'
              ? <Badge tone="green">{v.numeronotacredito}</Badge>
              : <>
                <Badge tone={v.estadonotacredito === 'ERROR' ? 'red' : 'amber'}>{v.estadonotacredito === 'ERROR' ? 'Error DIAN' : 'Pendiente'}</Badge>
                {v.errornotacredito && <div style={{ color: '#b91c1c', fontSize: 12 }}>{v.errornotacredito}</div>}
                {esAdmin && <div style={{ marginTop: 8 }}><Btn small icon="refresh" disabled={procesando} onClick={() => onReintentar(true)}>Reintentar nota crédito</Btn></div>}
              </>}
          </div>
        )}
      </div>
    </div>
  );
}
