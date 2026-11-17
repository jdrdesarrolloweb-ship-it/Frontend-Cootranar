import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { ROUTES } from '../../../shared/constants';
import { Badge, Btn, Card, CardHeader, Kpi, MESES, Tabla, Valor, hoyCO, inputStyle, money } from './contUi';

export const ContabilidadDashboardPage = () => {
  const [anio, setAnio] = useState(Number(hoyCO().slice(0, 4)));
  const d = useQuery({ queryKey: ['cont', 'dashboard', anio], queryFn: () => cont.get('/dashboard', { anio }) });
  const conc = useQuery({ queryKey: ['cont', 'conciliaciones'], queryFn: () => cont.get('/integraciones/conciliaciones') });
  const x = d.data;
  const errores = (x?.eventos ?? []).find((e: any) => e.estado === 'ERROR')?.n ?? 0;
  const pendientes = (x?.eventos ?? []).find((e: any) => e.estado === 'PENDIENTE')?.n ?? 0;
  const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${v}%`);
  return (
    <Layout>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ ...inputStyle, width: 'auto' }} aria-label="Año">
          {[0, 1, 2].map((i) => <option key={i} value={Number(hoyCO().slice(0, 4)) - i}>{Number(hoyCO().slice(0, 4)) - i}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={ROUTES.CONT_COMPROBANTES}><Btn icon="add">Comprobante</Btn></Link>
          <Link to={ROUTES.CONT_ESTADOS}><Btn variant="secondary" icon="account_balance">Estados financieros</Btn></Link>
        </div>
      </div>
      {(errores > 0 || pendientes > 0) && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: errores ? '#fef2f2' : '#fffbeb', color: errores ? '#b91c1c' : '#b45309' }}>
          {errores ? `${errores} evento(s) con error de contabilización` : ''}{errores && pendientes ? ' · ' : ''}{pendientes ? `${pendientes} pendiente(s)` : ''} ·{' '}
          <Link to={ROUTES.CONT_INTEGRACIONES} style={{ color: 'inherit', fontWeight: 700 }}>revisar integraciones</Link>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Ingresos del año" valor={money(x?.totales.ingresos)} tono="#15803d" />
        <Kpi label="Costos" valor={money(x?.totales.costos)} />
        <Kpi label="Gastos" valor={money(x?.totales.gastos)} />
        <Kpi label="Utilidad" valor={money(x?.totales.utilidad)} tono={Number(x?.totales.utilidad) < 0 ? '#b91c1c' : '#0D3B8E'} />
        <Kpi label="Caja" valor={money(x?.saldos.caja)} />
        <Kpi label="Bancos" valor={money(x?.saldos.bancos)} />
        <Kpi label="Cartera (1305)" valor={money(x?.saldos.cartera)} />
        <Kpi label="Proveedores (2205)" valor={money(x?.saldos.proveedores)} />
        <Kpi label="Inventario (1435)" valor={money(x?.saldos.inventario)} />
        <Kpi label="Impuestos por pagar (24)" valor={money(x?.saldos.impuestos)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <Card style={{ flex: '2 1 520px', minWidth: 0 }}>
          <CardHeader icon="calendar_month" title={`Resultados por mes ${anio}`} />
          <Tabla filas={x?.meses ?? []} clave={(m: any) => m.mes} columnas={[
            { label: 'Mes', render: (m: any) => MESES[m.mes - 1] },
            { label: 'Ingresos', align: 'right', render: (m: any) => money(m.ingresos) },
            { label: 'Costos', align: 'right', render: (m: any) => money(m.costos) },
            { label: 'Gastos', align: 'right', render: (m: any) => money(m.gastos) },
            { label: 'Utilidad', align: 'right', render: (m: any) => <Valor v={m.utilidad} fuerte /> },
          ]} />
        </Card>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardHeader icon="monitoring" title="Indicadores" />
            <div style={{ padding: 16, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <div>Liquidez corriente: <b>{x?.indicadores.liquidezCorriente ?? '—'}</b></div>
              <div>Endeudamiento: <b>{pct(x?.indicadores.endeudamiento)}</b></div>
              <div>Margen bruto: <b>{pct(x?.indicadores.margenBruto)}</b></div>
              <div>Margen neto: <b>{pct(x?.indicadores.margenNeto)}</b></div>
            </div>
          </Card>
          <Card>
            <CardHeader icon="rule" title="Conciliación módulos ↔ contabilidad" />
            <Tabla filas={conc.data?.conciliaciones ?? []} clave={(c: any) => c.nombre} columnas={[
              { label: 'Control', render: (c: any) => <span style={{ fontSize: 12 }}>{c.nombre}</span> },
              { label: 'Diferencia', align: 'right', render: (c: any) => <Badge tone={c.diferencia === 0 ? 'green' : 'amber'}>{money(c.diferencia)}</Badge> },
            ]} />
          </Card>
        </div>
      </div>
    </Layout>
  );
};
