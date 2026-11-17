import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Btn, Card, CardHeader, CentroSelect, Field, FiltroFechas, Tabla, Tabs, Valor, escHtml, exportarExcel, hoyCO, imprimirDocumento,
  money, tablaHtml,
} from './contUi';

type Tab = 'situacion' | 'resultados' | 'flujo' | 'patrimonio' | 'comparativo';
const inicioAnio = () => `${hoyCO().slice(0, 4)}-01-01`;

export const EstadosFinancierosPage = () => {
  const [tab, setTab] = useState<Tab>('situacion');
  const empresa = useQuery({ queryKey: ['cont', 'empresa'], queryFn: () => cont.get('/empresa'), staleTime: 300_000 });
  const encabezado = (titulo: string, periodo: string) =>
    `<h1>${escHtml(empresa.data?.razonsocial ?? 'COOTRANAR')}</h1><div class="muted">NIT ${escHtml(empresa.data?.nit ?? '')}${empresa.data?.dv !== null && empresa.data?.dv !== undefined ? '-' + empresa.data.dv : ''}</div><h2>${escHtml(titulo)}</h2><div class="muted">${escHtml(periodo)} · Cifras en pesos colombianos</div>`;
  const firmas = `<p class="muted" style="margin-top:50px">Representante legal ____________________ &nbsp;&nbsp; Contador público ____________________ T.P. ________</p>`;
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'situacion', label: 'Situación financiera', icon: 'account_balance' }, { id: 'resultados', label: 'Resultados', icon: 'trending_up' },
        { id: 'flujo', label: 'Flujo de efectivo', icon: 'water' }, { id: 'patrimonio', label: 'Cambios en el patrimonio', icon: 'savings' },
        { id: 'comparativo', label: 'Comparativo', icon: 'compare_arrows' },
      ]} />
      {tab === 'situacion' && <Situacion encabezado={encabezado} firmas={firmas} />}
      {tab === 'resultados' && <Resultados encabezado={encabezado} firmas={firmas} />}
      {tab === 'flujo' && <Flujo encabezado={encabezado} firmas={firmas} />}
      {tab === 'patrimonio' && <Patrimonio encabezado={encabezado} firmas={firmas} />}
      {tab === 'comparativo' && <Comparativo encabezado={encabezado} />}
    </Layout>
  );
};

interface E { encabezado: (t: string, p: string) => string; firmas?: string }

function Situacion({ encabezado, firmas }: E) {
  const [corte, setCorte] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'situacion', corte], queryFn: () => cont.get('/estados/situacion', { corte }) });
  const d = q.data;
  const seccion = (titulo: string, s: any) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, borderBottom: '2px solid #0f172a', padding: '6px 0' }}><span>{titulo}</span><Valor v={s.total} fuerte /></div>
      {s.cuentas.map((c: any) => <div key={c.codigo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}><span>{c.codigo} {c.nombre}</span><Valor v={c.final} /></div>)}
    </div>
  );
  const imprimir = () => d && imprimirDocumento('Estado de situación financiera', encabezado('Estado de situación financiera', `A ${corte}`) +
    ['activo', 'pasivo', 'patrimonio'].map((k) => `<h2>${k.toUpperCase()}</h2>` + tablaHtml([{ t: 'Cuenta' }, { t: 'Valor', r: true }],
      d[k].cuentas.map((c: any) => [`${c.codigo} ${c.nombre}`, money(c.final)]).concat(k === 'patrimonio' ? [['Resultado del ejercicio', money(d.patrimonio.resultadoEjercicio)]] : []),
      [`Total ${k}`, money(d[k].total)])).join('') + `<p><b>Total pasivo + patrimonio: ${money(d.pasivo.total + d.patrimonio.total)}</b></p>` + (firmas ?? ''));
  return (
    <Card>
      <CardHeader icon="account_balance" title="Estado de situación financiera">
        <Field label="Corte" style={{ width: 160 }}>
          <DatePicker value={corte} onChange={setCorte} inputClassName="h-[36px] text-xs rounded-lg" />
        </Field>
        <Btn variant="secondary" icon="print" onClick={imprimir}>PDF / imprimir</Btn>
        {d && <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`situacion-financiera-${corte}`, ['activo', 'pasivo', 'patrimonio'].map((k) => ({ nombre: k, filas: d[k].cuentas.map((c: any) => ({ Código: c.codigo, Cuenta: c.nombre, Valor: c.final })) })))}>Excel</Btn>}
      </CardHeader>
      {d && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div>{seccion('ACTIVO', d.activo)}</div>
            <div>
              {seccion('PASIVO', d.pasivo)}
              {seccion('PATRIMONIO', d.patrimonio)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>Resultado del ejercicio (incluido)</span><Valor v={d.patrimonio.resultadoEjercicio} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, borderTop: '2px solid #0f172a', padding: '6px 0', marginTop: 8 }}>
                <span>PASIVO + PATRIMONIO</span><Valor v={d.pasivo.total + d.patrimonio.total} fuerte />
              </div>
            </div>
          </div>
          <p style={{ fontWeight: 700, color: d.cuadra ? '#15803d' : '#b91c1c' }}>{d.cuadra ? '✔ Activo = Pasivo + Patrimonio' : `✘ Diferencia ${money(d.diferencia)}`}</p>
        </div>
      )}
    </Card>
  );
}

function Resultados({ encabezado, firmas }: E) {
  const [desde, setDesde] = useState(inicioAnio());
  const [hasta, setHasta] = useState(hoyCO());
  const [idcentro, setIdcentro] = useState<number | null>(null);
  const q = useQuery({ queryKey: ['cont', 'resultados', desde, hasta, idcentro], queryFn: () => cont.get('/estados/resultados', { desde, hasta, idcentro }) });
  const r = q.data?.resumen;
  const filas: [string, number, boolean?][] = r ? [
    ['Ingresos operacionales', r.ingresosOperacionales], ['(−) Costo de ventas', r.costoVentas], ['= Utilidad bruta', r.utilidadBruta, true],
    ['(−) Gastos de administración', r.gastosAdministracion], ['(−) Gastos de ventas', r.gastosVentas], ['= Utilidad operacional', r.utilidadOperacional, true],
    ['(+) Ingresos no operacionales', r.ingresosNoOperacionales], ['(−) Gastos no operacionales', r.gastosNoOperacionales],
    ['= Utilidad antes de impuestos', r.utilidadAntesImpuestos, true], ['(−) Impuesto de renta', r.impuestoRenta], ['= UTILIDAD NETA', r.utilidadNeta, true],
  ] : [];
  return (
    <Card>
      <CardHeader icon="trending_up" title="Estado de resultados">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <div style={{ width: 200 }}><CentroSelect value={idcentro} onChange={setIdcentro} /></div>
        <Btn variant="secondary" icon="print" onClick={() => imprimirDocumento('Estado de resultados', encabezado('Estado de resultados', `Del ${desde} al ${hasta}`) +
          tablaHtml([{ t: 'Concepto' }, { t: 'Valor', r: true }], filas.map(([n, v]) => [n, money(v)])) + (firmas ?? ''))}>PDF / imprimir</Btn>
        {q.data && <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`estado-resultados-${desde}-${hasta}`, [
          { nombre: 'Resumen', filas: filas.map(([n, v]) => ({ Concepto: n, Valor: v })) },
          { nombre: 'Detalle', filas: [...q.data.ingresos, ...q.data.costos, ...q.data.gastos].map((c: any) => ({ Código: c.codigo, Cuenta: c.nombre, Valor: c.valor })) },
        ])}>Excel</Btn>}
      </CardHeader>
      <div style={{ padding: 20, maxWidth: 720 }}>
        {filas.map(([n, v, total]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: total ? '2px solid #0f172a' : '1px solid #f1f5f9', fontWeight: total ? 800 : 400, fontSize: 13.5 }}>
            <span>{n}</span><Valor v={v} fuerte={total} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Flujo({ encabezado, firmas }: E) {
  const [desde, setDesde] = useState(inicioAnio());
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'flujo', desde, hasta], queryFn: () => cont.get('/estados/flujo-efectivo', { desde, hasta }) });
  const d = q.data;
  const act = (a: string) => (d?.filas ?? []).filter((f: any) => f.actividad === a);
  return (
    <Card>
      <CardHeader icon="water" title="Estado de flujos de efectivo (método directo)">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        {d && <Btn variant="secondary" icon="print" onClick={() => imprimirDocumento('Flujo de efectivo', encabezado('Estado de flujos de efectivo', `Del ${desde} al ${hasta}`) +
          ['OPERACION', 'INVERSION', 'FINANCIACION'].map((a) => `<h2>Actividades de ${a.toLowerCase()}</h2>` + tablaHtml([{ t: 'Concepto' }, { t: 'Entradas', r: true }, { t: 'Salidas', r: true }],
            act(a).map((f: any) => [`${f.grupo} ${f.nombregrupo}`, money(f.entradas), money(f.salidas)]))).join('') +
          `<p>Efectivo inicial ${money(d.efectivoInicial)} · Efectivo final ${money(d.efectivoFinal)}</p>` + (firmas ?? ''))}>PDF / imprimir</Btn>}
      </CardHeader>
      {d && (
        <div style={{ padding: 20 }}>
          {(['OPERACION', 'INVERSION', 'FINANCIACION'] as const).map((a) => (
            <div key={a} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>Actividades de {a.toLowerCase()}: <Valor v={{ OPERACION: d.operacion, INVERSION: d.inversion, FINANCIACION: d.financiacion }[a]} fuerte /></div>
              <Tabla filas={act(a)} clave={(f: any) => `${a}-${f.grupo}`} vacio="Sin movimientos" columnas={[
                { label: 'Contrapartida', render: (f: any) => `${f.grupo} ${f.nombregrupo}` },
                { label: 'Entradas', align: 'right', render: (f: any) => money(f.entradas) },
                { label: 'Salidas', align: 'right', render: (f: any) => money(f.salidas) },
              ]} />
            </div>
          ))}
          <p style={{ fontSize: 13.5 }}>Efectivo inicial <b>{money(d.efectivoInicial)}</b> + variación <b>{money(d.operacion + d.inversion + d.financiacion)}</b> = efectivo final <b>{money(d.efectivoFinal)}</b></p>
        </div>
      )}
    </Card>
  );
}

function Patrimonio({ encabezado, firmas }: E) {
  const [desde, setDesde] = useState(inicioAnio());
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'patrimonio', desde, hasta], queryFn: () => cont.get('/estados/patrimonio', { desde, hasta }) });
  const filas = q.data?.filas ?? [];
  return (
    <Card>
      <CardHeader icon="savings" title="Estado de cambios en el patrimonio">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Btn variant="secondary" icon="print" onClick={() => imprimirDocumento('Cambios en el patrimonio', encabezado('Estado de cambios en el patrimonio', `Del ${desde} al ${hasta}`) +
          tablaHtml([{ t: 'Cuenta' }, { t: 'Saldo inicial', r: true }, { t: 'Aumentos', r: true }, { t: 'Disminuciones', r: true }, { t: 'Saldo final', r: true }],
            filas.map((f: any) => [`${f.codigo} ${f.nombre}`, money(f.inicial), money(f.creditos), money(f.debitos), money(f.final)])) +
          `<p>Resultado del período: ${money(q.data?.resultadoPeriodo)}</p>` + (firmas ?? ''))}>PDF / imprimir</Btn>
      </CardHeader>
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any) => f.codigo} vacio="Sin cuentas de patrimonio con saldo" columnas={[
        { label: 'Cuenta', render: (f: any) => `${f.codigo} ${f.nombre}` },
        { label: 'Saldo inicial', align: 'right', render: (f: any) => <Valor v={f.inicial} /> },
        { label: 'Aumentos', align: 'right', render: (f: any) => money(f.creditos) },
        { label: 'Disminuciones', align: 'right', render: (f: any) => money(f.debitos) },
        { label: 'Saldo final', align: 'right', render: (f: any) => <Valor v={f.final} fuerte /> },
      ]} />
      <div style={{ padding: '10px 20px', fontSize: 13 }}>Resultado del período (aún no trasladado al patrimonio): <b>{money(q.data?.resultadoPeriodo)}</b></div>
    </Card>
  );
}

function Comparativo({ encabezado }: E) {
  const anio = Number(hoyCO().slice(0, 4));
  const [a, setA] = useState({ desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` });
  const [b, setB] = useState({ desde: `${anio}-01-01`, hasta: hoyCO() });
  const q = useQuery({ queryKey: ['cont', 'comparativo', a, b], queryFn: () => cont.get('/estados/comparativo', { desdeA: a.desde, hastaA: a.hasta, desdeB: b.desde, hastaB: b.hasta }) });
  const filas = q.data?.filas ?? [];
  return (
    <Card>
      <CardHeader icon="compare_arrows" title="Comparativo entre períodos">
        <span style={{ fontSize: 12, fontWeight: 700 }}>Período A</span><FiltroFechas desde={a.desde} hasta={a.hasta} onDesde={(v) => setA({ ...a, desde: v })} onHasta={(v) => setA({ ...a, hasta: v })} />
        <span style={{ fontSize: 12, fontWeight: 700 }}>Período B</span><FiltroFechas desde={b.desde} hasta={b.hasta} onDesde={(v) => setB({ ...b, desde: v })} onHasta={(v) => setB({ ...b, hasta: v })} />
        <Btn variant="secondary" icon="print" onClick={() => imprimirDocumento('Comparativo', encabezado('Estados financieros comparativos', `A: ${a.desde} a ${a.hasta} · B: ${b.desde} a ${b.hasta}`) +
          tablaHtml([{ t: 'Concepto' }, { t: 'Período A', r: true }, { t: 'Período B', r: true }, { t: 'Variación', r: true }, { t: '%', r: true }],
            filas.map((f: any) => [f.nombre, money(f.a), money(f.b), money(f.variacion), f.porcentaje === null ? '—' : `${f.porcentaje}%`])))}>PDF / imprimir</Btn>
        <Btn variant="secondary" icon="download" onClick={() => exportarExcel('comparativo', [{ nombre: 'Comparativo', filas: filas.map((f: any) => ({ Concepto: f.nombre, A: f.a, B: f.b, Variación: f.variacion, '%': f.porcentaje })) }])}>Excel</Btn>
      </CardHeader>
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any) => f.nombre} columnas={[
        { label: 'Concepto', render: (f: any) => <b>{f.nombre}</b> },
        { label: 'Período A', align: 'right', render: (f: any) => <Valor v={f.a} /> },
        { label: 'Período B', align: 'right', render: (f: any) => <Valor v={f.b} /> },
        { label: 'Variación', align: 'right', render: (f: any) => <Valor v={f.variacion} fuerte /> },
        { label: '%', align: 'right', render: (f: any) => (f.porcentaje === null ? '—' : `${f.porcentaje}%`) },
      ]} />
    </Card>
  );
}
