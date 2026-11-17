import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont, type Cuenta } from '../../../infrastructure/services/contabilidadApi';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Btn, Card, CardHeader, CentroSelect, CuentaSelect, Field, FiltroFechas, Tabla, Tabs, Valor, escHtml, exportarExcel, hoyCO,
  imprimirDocumento, inicioMes, inputStyle, money, tablaHtml,
} from './contUi';

type Tab = 'balance' | 'diario' | 'mayor' | 'auxiliar';

export const LibrosPage = () => {
  const [tab, setTab] = useState<Tab>('balance');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'balance', label: 'Balance de prueba', icon: 'balance' }, { id: 'diario', label: 'Libro diario', icon: 'menu_book' },
        { id: 'mayor', label: 'Libro mayor', icon: 'account_tree' }, { id: 'auxiliar', label: 'Auxiliar por tercero', icon: 'groups' },
      ]} />
      {tab === 'balance' && <Balance desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />}
      {tab === 'diario' && <Diario desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />}
      {tab === 'mayor' && <Mayor desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />}
      {tab === 'auxiliar' && <Auxiliar hasta={hasta} setHasta={setHasta} />}
    </Layout>
  );
};

interface P { desde: string; hasta: string; setDesde: (v: string) => void; setHasta: (v: string) => void }

function Balance({ desde, hasta, setDesde, setHasta }: P) {
  const [nivel, setNivel] = useState('4');
  const [idcentro, setIdcentro] = useState<number | null>(null);
  const q = useQuery({ queryKey: ['cont', 'balance', desde, hasta, nivel, idcentro], queryFn: () => cont.get('/libros/balance-prueba', { desde, hasta, nivel, idcentro }) });
  const filas = q.data?.filas ?? [];
  const exportar = () => exportarExcel(`balance-prueba-${desde}-${hasta}`, [{
    nombre: 'Balance', filas: filas.map((f: any) => ({
      Código: f.codigo, Cuenta: f.nombre, Nivel: f.nivel, 'Saldo inicial': f.inicial, Débitos: f.debitos, Créditos: f.creditos, 'Saldo final': f.final
    }))
  }]);
  const imprimir = () => imprimirDocumento('Balance de prueba', `<h1>Balance de prueba</h1><div class="muted">${desde} a ${hasta}</div>${tablaHtml(
    [{ t: 'Código' }, { t: 'Cuenta' }, { t: 'Saldo inicial', r: true }, { t: 'Débitos', r: true }, { t: 'Créditos', r: true }, { t: 'Saldo final', r: true }],
    filas.map((f: any) => [f.codigo, ' '.repeat((f.nivel - 1) * 3) + f.nombre, money(f.inicial), money(f.debitos), money(f.creditos), money(f.final)]),
    ['', 'Totales (clases)', '', money(q.data?.totales.debitos), money(q.data?.totales.creditos), ''])}`);
  return (
    <Card>
      <CardHeader icon="balance" title="Balance de prueba">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Nivel">
          <option value="1">Clase</option><option value="2">Grupo</option><option value="3">Cuenta</option><option value="4">Subcuenta</option><option value="5">Auxiliar</option>
        </select>
        <div style={{ width: 200 }}><CentroSelect value={idcentro} onChange={setIdcentro} /></div>
        <Btn variant="secondary" icon="download" onClick={exportar}>Excel</Btn>
        <Btn variant="secondary" icon="print" onClick={imprimir}>Imprimir</Btn>
      </CardHeader>
      {q.data && (
        <div style={{ padding: '10px 20px', fontSize: 13, color: q.data.totales.cuadra ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
          {q.data.totales.cuadra ? '✔ Sumas iguales' : '✘ Descuadre'}: débitos {money(q.data.totales.debitos)} · créditos {money(q.data.totales.creditos)}
        </div>
      )}
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any) => f.idcuenta} vacio="Sin movimientos en el período" columnas={[
        { label: 'Código', render: (f: any) => <b>{f.codigo}</b> },
        { label: 'Cuenta', render: (f: any) => <span style={{ paddingLeft: (f.nivel - 1) * 12, fontWeight: f.nivel <= 2 ? 700 : 400 }}>{f.nombre}</span> },
        { label: 'Saldo inicial', align: 'right', render: (f: any) => <Valor v={f.inicial} /> },
        { label: 'Débitos', align: 'right', render: (f: any) => money(f.debitos) },
        { label: 'Créditos', align: 'right', render: (f: any) => money(f.creditos) },
        { label: 'Saldo final', align: 'right', render: (f: any) => <Valor v={f.final} fuerte={f.nivel <= 2} /> },
      ]} />
    </Card>
  );
}

function Diario({ desde, hasta, setDesde, setHasta }: P) {
  const q = useQuery({ queryKey: ['cont', 'diario', desde, hasta], queryFn: () => cont.get('/libros/diario', { desde, hasta }) });
  const filas = q.data?.filas ?? [];
  return (
    <Card>
      <CardHeader icon="menu_book" title="Libro diario">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`libro-diario-${desde}-${hasta}`, [{
          nombre: 'Diario', filas: filas.map((f: any) => ({
            Fecha: String(f.fecha).slice(0, 10), Comprobante: f.comprobante, Descripción: f.descripcion, Cuenta: f.codigo, 'Nombre cuenta': f.cuenta,
            Tercero: f.documento ?? '', 'Nombre tercero': f.tercero ?? '', Centro: f.centro ?? '', Débito: Number(f.debito), Crédito: Number(f.credito)
          }))
        }])}>Excel</Btn>
      </CardHeader>
      {q.data && <div style={{ padding: '10px 20px', fontSize: 13 }}>Débitos <b>{money(q.data.debitos)}</b> · Créditos <b>{money(q.data.creditos)}</b> · <b style={{ color: q.data.cuadra ? '#15803d' : '#b91c1c' }}>{q.data.cuadra ? 'Cuadrado' : 'Descuadre'}</b>{filas.length >= 5000 ? ' · mostrando las primeras 5.000 líneas' : ''}</div>}
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any,) => `${f.idcomprobante}-${f.codigo}-${f.debito}-${f.credito}-${f.detalle}-${f.documento}`} columnas={[
        { label: 'Fecha', render: (f: any) => String(f.fecha).slice(0, 10) },
        { label: 'Comprobante', render: (f: any) => <b>{f.comprobante}</b> },
        { label: 'Cuenta', render: (f: any) => <><b>{f.codigo}</b> {f.cuenta}</> },
        { label: 'Tercero', render: (f: any) => <span style={{ fontSize: 12 }}>{f.tercero ?? ''}</span> },
        { label: 'Detalle', render: (f: any) => <span style={{ fontSize: 12 }}>{f.detalle ?? f.descripcion}</span> },
        { label: 'Débito', align: 'right', render: (f: any) => (Number(f.debito) ? money(f.debito) : '') },
        { label: 'Crédito', align: 'right', render: (f: any) => (Number(f.credito) ? money(f.credito) : '') },
      ]} />
    </Card>
  );
}

function Mayor({ desde, hasta, setDesde, setHasta }: P) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [codigo, setCodigo] = useState('');
  const cuentas = useQuery({ queryKey: ['cont', 'cuentas', 'todas'], queryFn: () => cont.get<Cuenta[]>('/cuentas') });
  const sel = cuenta ?? (cuentas.data ?? []).find((c) => c.codigo === codigo) ?? null;
  const q = useQuery({ queryKey: ['cont', 'mayor', sel?.idcuenta, desde, hasta], queryFn: () => cont.get('/libros/mayor', { idcuenta: sel!.idcuenta, desde, hasta }), enabled: !!sel });
  return (
    <Card>
      <CardHeader icon="account_tree" title="Libro mayor por cuenta">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <div style={{ width: 260 }}><CuentaSelect value={cuenta?.idcuenta ?? null} onChange={(c) => { setCuenta(c); setCodigo(''); }} placeholder="Cuenta de movimiento…" /></div>
        <select value={codigo} onChange={(e) => { setCodigo(e.target.value); setCuenta(null); }} style={{ ...inputStyle, width: 220, padding: '7px 10px' }} aria-label="Cuenta mayor">
          <option value="">o una cuenta mayor…</option>
          {(cuentas.data ?? []).filter((c) => c.nivel <= 3).map((c) => <option key={c.idcuenta} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
        </select>
        {q.data && <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`mayor-${q.data.cuenta.codigo}`, [{
          nombre: 'Mayor', filas: q.data.filas.map((f: any) => ({
            Fecha: String(f.fecha).slice(0, 10), Comprobante: f.comprobante, Cuenta: f.codigo, Tercero: f.tercero ?? '', Detalle: f.detalle ?? f.descripcion,
            Débito: Number(f.debito), Crédito: Number(f.credito), Saldo: f.saldo
          }))
        }])}>Excel</Btn>}
      </CardHeader>
      {!sel ? <p style={{ padding: 20, color: '#94a3b8' }}>Elige una cuenta.</p> : q.data && (
        <>
          <div style={{ padding: '10px 20px', fontSize: 13 }}>
            {q.data.cuenta.codigo} {q.data.cuenta.nombre} (naturaleza {q.data.cuenta.naturaleza === 'D' ? 'débito' : 'crédito'}) · Saldo inicial <b>{money(q.data.saldoInicial)}</b> · Saldo final <b>{money(q.data.saldoFinal)}</b>
          </div>
          <Tabla filas={q.data.filas} clave={(f: any) => `${f.idcomprobante}-${f.codigo}-${f.debito}-${f.credito}-${f.saldo}`} vacio="Sin movimientos" columnas={[
            { label: 'Fecha', render: (f: any) => String(f.fecha).slice(0, 10) },
            { label: 'Comprobante', render: (f: any) => <b>{f.comprobante}</b> },
            { label: 'Cuenta', render: (f: any) => f.codigo },
            { label: 'Tercero', render: (f: any) => <span style={{ fontSize: 12 }}>{f.tercero ?? ''}</span> },
            { label: 'Detalle', render: (f: any) => <span style={{ fontSize: 12 }}>{f.detalle ?? f.descripcion}</span> },
            { label: 'Débito', align: 'right', render: (f: any) => (Number(f.debito) ? money(f.debito) : '') },
            { label: 'Crédito', align: 'right', render: (f: any) => (Number(f.credito) ? money(f.credito) : '') },
            { label: 'Saldo', align: 'right', render: (f: any) => <Valor v={f.saldo} fuerte /> },
          ]} />
        </>
      )}
    </Card>
  );
}

function Auxiliar({ hasta, setHasta }: { hasta: string; setHasta: (v: string) => void }) {
  const cuentas = useQuery({ queryKey: ['cont', 'cuentas', 'todas'], queryFn: () => cont.get<Cuenta[]>('/cuentas') });
  const [codigo, setCodigo] = useState('1305');
  const sel = (cuentas.data ?? []).find((c) => c.codigo === codigo);
  const q = useQuery({ queryKey: ['cont', 'auxiliar', sel?.idcuenta, hasta], queryFn: () => cont.get('/libros/auxiliar-terceros', { idcuenta: sel!.idcuenta, hasta }), enabled: !!sel });
  const filas = q.data?.filas ?? [];
  const imprimir = () => imprimirDocumento('Auxiliar por tercero', `<h1>Auxiliar por tercero · ${escHtml(sel?.codigo)} ${escHtml(sel?.nombre)}</h1><div class="muted">Corte ${hasta}</div>${tablaHtml(
    [{ t: 'Documento' }, { t: 'Tercero' }, { t: 'Débitos', r: true }, { t: 'Créditos', r: true }, { t: 'Saldo', r: true }],
    filas.map((f: any) => [f.documento ?? '', f.nombre ?? 'Sin tercero', money(f.debitos), money(f.creditos), money(f.final)]))}`);
  return (
    <Card>
      <CardHeader icon="groups" title="Auxiliar por tercero">
        <Field label="Corte" style={{ width: 160 }}>
          <DatePicker value={hasta} onChange={setHasta} inputClassName="h-[36px] text-xs rounded-lg" />
        </Field>
        <select value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ ...inputStyle, width: 280, padding: '7px 10px' }} aria-label="Cuenta">
          {(cuentas.data ?? []).filter((c) => c.nivel <= 4 && /^(13|22|23|24|25|28|1355|2365)/.test(c.codigo)).map((c) => <option key={c.idcuenta} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
        </select>
        <Btn variant="secondary" icon="print" onClick={imprimir}>Imprimir</Btn>
      </CardHeader>
      <Tabla cargando={q.isLoading} filas={filas} clave={(f: any) => f.idtercero ?? 'sin'} vacio="Sin saldos" columnas={[
        { label: 'Documento', render: (f: any) => f.documento ?? '—' },
        { label: 'Tercero', render: (f: any) => f.nombre ?? 'Sin tercero' },
        { label: 'Débitos', align: 'right', render: (f: any) => money(f.debitos) },
        { label: 'Créditos', align: 'right', render: (f: any) => money(f.creditos) },
        { label: 'Saldo', align: 'right', render: (f: any) => <Valor v={f.final} fuerte /> },
      ]} />
    </Card>
  );
}
