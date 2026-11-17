import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { almacenApi } from '../../../infrastructure/services/almacenApi';
import { ROUTES } from '../../../shared/constants';
import {
  Badge, BodegaSelector, Btn, Card, CardHeader, FiltroFechas, StatCard, Tabla,
  exportarExcel, fecha, haceDiasISO, hoyISO, money, num, useAlmacen,
} from './almacenUi';

export const AlmacenDashboardPage = () => {
  const { idbodega, esAdmin, bodegas, cargando, error } = useAlmacen();
  const d = useQuery({ queryKey: ['almacen', 'dashboard', idbodega], queryFn: () => almacenApi.dashboard(idbodega), enabled: !cargando && !error });
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());
  const ventas = useQuery({
    queryKey: ['almacen', 'reporte-ventas', idbodega, desde, hasta],
    queryFn: () => almacenApi.reporteVentas({ idbodega, desde, hasta }),
    enabled: !cargando && !error,
  });

  if (error) {
    return (
      <Layout>
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#b45309' }}>warehouse</span>
          <p style={{ fontSize: 14, color: '#475569' }}>{(error as any)?.response?.data?.message ?? 'No se pudo cargar el almacén.'}</p>
        </Card>
      </Layout>
    );
  }

  if (esAdmin && !cargando && bodegas.length === 0) {
    return (
      <Layout>
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#0D3B8E' }}>warehouse</span>
          <h3 style={{ margin: '8px 0', color: '#0f172a' }}>Configura el almacén</h3>
          <p style={{ fontSize: 14, color: '#475569' }}>Crea la primera bodega y asigna sus almacenistas para empezar a vender repuestos y lubricantes.</p>
          <Link to={ROUTES.ALMACEN_CONFIGURACION}><Btn icon="settings">Ir a configuración</Btn></Link>
        </Card>
      </Layout>
    );
  }

  const k = d.data;
  const exportarVentas = () => ventas.data && exportarExcel(`reporte-ventas-almacen-${desde}-a-${hasta}`, [
    { nombre: 'Por día', filas: ventas.data.porDia.map((r: any) => ({ Fecha: String(r.fecha).slice(0, 10), Ventas: r.ventas, Total: Number(r.total), Socios: Number(r.totalsocios ?? 0), Público: Number(r.totalpublico ?? 0), Crédito: Number(r.totalcredito ?? 0) })) },
    { nombre: 'Top productos', filas: ventas.data.topProductos.map((r: any) => ({ Código: r.codigo, Producto: r.nombre, Cantidad: Number(r.cantidad), Total: Number(r.total), 'Margen (sin IVA)': Number(r.margen) })) },
  ]);
  const exportarVehiculos = async () => {
    const r: any = await almacenApi.reporteVehiculos({ idbodega, desde, hasta });
    await exportarExcel(`repuestos-por-vehiculo-${desde}-a-${hasta}`, [{
      nombre: 'Por vehículo',
      filas: r.vehiculos.map((v: any) => ({ Placa: v.placa, Móvil: v.numeromovil ?? '', 'Consumos flota': v.consumos, 'Costo consumo': Number(v.costoconsumo), 'Compras socio': v.comprassocio, 'Total compras socio': Number(v.totalcomprassocio) })),
    }]);
  };

  const totalPeriodo = (ventas.data?.porDia ?? []).reduce((a: number, r: any) => a + Number(r.total), 0);

  return (
    <Layout>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <BodegaSelector />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to={ROUTES.ALMACEN_VENTA}><Btn icon="point_of_sale">Nueva venta</Btn></Link>
          <Link to={ROUTES.ALMACEN_COMPRAS}><Btn variant="secondary" icon="add_shopping_cart">Registrar compra</Btn></Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon="payments" label="Ventas de hoy" valor={money(k?.ventashoy)} detalle={`${k?.transaccioneshoy ?? 0} transacción(es)`} />
        <StatCard icon="calendar_month" label="Ventas del mes" valor={money(k?.ventasmes)} />
        <StatCard icon="inventory_2" label="Valor del inventario" valor={money(k?.valorinventario)} detalle={`${k?.referenciasconstock ?? 0} referencias con existencias`} tone="#15803d" />
        <StatCard icon="account_balance_wallet" label="Cartera de socios" valor={money(k?.carteratotal)} detalle={`${k?.sociosconsaldo ?? 0} socio(s) con saldo`} tone="#b45309" />
        <StatCard icon="local_shipping" label="Traslados por recibir" valor={k?.trasladospendientes ?? 0} tone="#475569" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card style={{ flex: '1 1 420px', minWidth: 0 }}>
          <CardHeader icon="warning" title="Productos bajo el stock mínimo">
            <Link to={ROUTES.ALMACEN_INVENTARIO}><Btn small variant="secondary">Ver inventario</Btn></Link>
          </CardHeader>
          <Tabla cargando={d.isLoading} filas={k?.bajominimo ?? []} clave={(p: any) => p.idproducto} vacio="Todo en orden: ningún producto está bajo el mínimo." columnas={[
            { label: 'Producto', render: (p: any) => <>{p.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{p.codigo}</div></> },
            { label: 'Existencia', align: 'right', render: (p: any) => <Badge tone={Number(p.stock) <= 0 ? 'red' : 'amber'}>{num(p.stock)}</Badge> },
            { label: 'Mínimo', align: 'right', render: (p: any) => num(p.stockminimo) },
          ]} />
        </Card>

        <Card style={{ flex: '1 1 320px', minWidth: 0 }}>
          <CardHeader icon="date_range" title="Últimos 7 días" />
          <Tabla cargando={d.isLoading} filas={k?.ventasultimos7dias ?? []} clave={(r: any) => String(r.fecha)} columnas={[
            { label: 'Día', render: (r: any) => fecha(String(r.fecha).slice(0, 10) + 'T12:00:00', false) },
            { label: 'Ventas', align: 'right', render: (r: any) => <b>{money(r.total)}</b> },
          ]} />
        </Card>
      </div>

      <Card>
        <CardHeader icon="analytics" title="Reportes">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn variant="secondary" icon="download" onClick={exportarVentas} disabled={!ventas.data}>Ventas (Excel)</Btn>
          <Btn variant="secondary" icon="directions_bus" onClick={exportarVehiculos}>Por vehículo (Excel)</Btn>
        </CardHeader>
        <div style={{ padding: '12px 20px', fontSize: 13, color: '#475569' }}>
          Total vendido en el periodo: <b style={{ color: '#0f172a' }}>{money(totalPeriodo)}</b>
          {esAdmin && !idbodega && ' (todas las bodegas)'}
        </div>
        <Tabla cargando={ventas.isLoading} filas={ventas.data?.topProductos ?? []} clave={(r: any) => r.codigo} vacio="Sin ventas en el periodo." columnas={[
          { label: 'Más vendidos', render: (r: any) => <>{r.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{r.codigo}</div></> },
          { label: 'Cantidad', align: 'right', render: (r: any) => `${num(r.cantidad)} ${String(r.unidadmedida).toLowerCase()}` },
          { label: 'Vendido', align: 'right', render: (r: any) => <b>{money(r.total)}</b> },
          { label: 'Margen (sin IVA)', align: 'right', render: (r: any) => (
            <span style={{ color: Number(r.margen) >= 0 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{money(r.margen)}</span>
          ) },
        ]} />
      </Card>
    </Layout>
  );
};
