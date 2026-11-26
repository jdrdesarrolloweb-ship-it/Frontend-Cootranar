import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, Tabs, Valor,
  escHtml, exportarExcel, hoyCO, imprimirDocumento, inicioMes, inputStyle, money, pedirMotivo, tablaHtml, useMensaje,
} from './contUi';

/**
 * Liquidación a propietarios de vehículos (socios).
 *  - Vehículos: propios de la cooperativa (el pasaje es ingreso) o de socios (recaudo para terceros).
 *  - Conceptos: descuentos de la liquidación (administración, rodamiento, fondo de reposición…).
 *  - Liquidaciones: recaudo pendiente − descuentos = neto a pagar al propietario.
 */
type Tab = 'liquidaciones' | 'extractos' | 'vehiculos' | 'conceptos';
const TIPOS: Record<string, string> = { PORCENTAJE: '% del recaudo', VALOR_VIAJE: 'Valor por viaje', VALOR_FIJO: 'Valor fijo por liquidación' };

export const LiquidacionPropietariosPage = () => {
  const [tab, setTab] = useState<Tab>('liquidaciones');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'liquidaciones', label: 'Liquidaciones', icon: 'request_quote' },
        { id: 'extractos', label: 'Extractos de socios', icon: 'contact_page' },
        { id: 'vehiculos', label: 'Vehículos propios y de socios', icon: 'directions_bus' },
        { id: 'conceptos', label: 'Descuentos', icon: 'tune' },
      ]} />
      {tab === 'liquidaciones' && <Liquidaciones />}
      {tab === 'extractos' && <Extractos />}
      {tab === 'vehiculos' && <Vehiculos />}
      {tab === 'conceptos' && <Conceptos />}
    </Layout>
  );
};

function imprimirLiquidacion(l: any) {
  imprimirDocumento(`Liquidación ${l.idliquidacion}`, `
    <h1>Liquidación a propietario N.º ${l.idliquidacion}</h1>
    <div class="muted">Móvil ${escHtml(l.numeromovil)} · Placa ${escHtml(l.placa)} · Propietario: ${escHtml(l.propietario)} (${escHtml(l.documento)})</div>
    <div class="muted">Período: ${escHtml(l.desde)} a ${escHtml(l.hasta)} · Viajes: ${l.viajes} · Comprobante ${escHtml(l.comprobante ?? '')} · Estado ${escHtml(l.estado)}</div>
    <h2>Resumen</h2>
    ${tablaHtml([{ t: 'Concepto' }, { t: 'Base', r: true }, { t: 'Valor', r: true }], [
      ['Pasajes recaudados', '', money(l.totalrecaudado)],
      ...(l.detalle ?? []).map((d: any) => [`(−) ${d.nombre}${d.tipo === 'PORCENTAJE' ? ` ${Number(d.tasa)} %` : ''}`,
        d.tipo === 'PORCENTAJE' ? money(d.base) : d.tipo === 'VALOR_VIAJE' ? `${Number(d.base)} viajes` : '', money(d.valor)]),
    ], ['Neto a pagar', '', money(l.neto)])}
    ${l.recaudos?.length ? `<h2>Recaudos incluidos</h2>${tablaHtml([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: 'Detalle' }, { t: 'Valor', r: true }],
      l.recaudos.map((r: any) => [String(r.fecha).slice(0, 10), r.comprobante, r.detalle ?? '', money(r.valor)]))}` : ''}
    ${l.estado === 'PAGADA' && l.comprobantepago ? `<p>Pagado el ${escHtml(String(l.fechapago).slice(0, 10))} · ${escHtml(l.mediopago)} · ${escHtml(l.referenciapago ?? '')} · ${escHtml(l.comprobantepago)}</p>` : ''}
    <p class="muted" style="margin-top:30px">Elaboró: ______________________ &nbsp;&nbsp; Recibí conforme (propietario): ______________________</p>`);
}

/** HTML del extracto de un socio (para imprimir uno o varios con salto de página). */
function htmlExtracto(e: any) {
  const t = e.tercero;
  const lado = (c: any) => (c.lado === 'FAVOR' ? 'A favor del socio' : 'A cargo del socio');
  return `
    <div style="page-break-after:always">
    <h1>Extracto del asociado</h1>
    <div class="muted">${escHtml(e.empresa?.razonsocial ?? 'Cootranar')} · NIT ${escHtml(e.empresa?.nit ?? '')}-${escHtml(e.empresa?.dv ?? '')}</div>
    <h2>${escHtml(t.nombre)} · ${escHtml(t.tipodocumento)} ${escHtml(t.documento)}</h2>
    <div class="muted">Período: ${escHtml(e.desde)} a ${escHtml(e.hasta)}${e.vehiculos?.length ? ` · Vehículos: ${escHtml(e.vehiculos.map((v: any) => `${v.numeromovil} (${v.placa})`).join(', '))}` : ''}</div>
    <h2>Resumen de saldos</h2>
    ${tablaHtml([{ t: 'Cuenta' }, { t: 'Concepto' }, { t: 'Saldo anterior', r: true }, { t: 'Débitos', r: true }, { t: 'Créditos', r: true }, { t: 'Saldo al corte', r: true }],
      (e.cuentas ?? []).map((c: any) => [`${c.codigo} ${c.nombre}`, lado(c), money(c.saldoInicial), money(c.debitos), money(c.creditos), money(c.saldoFinal)]),
      ['', '', '', '', 'Neto a favor del socio', money(e.totales.neto)])}
    ${e.liquidaciones?.length ? `<h2>Liquidaciones del período</h2>${tablaHtml(
      [{ t: 'N.º' }, { t: 'Móvil' }, { t: 'Período' }, { t: 'Viajes', r: true }, { t: 'Recaudado', r: true }, { t: 'Descuentos', r: true }, { t: 'Neto', r: true }, { t: 'Estado' }],
      e.liquidaciones.map((l: any) => [l.idliquidacion, `${l.numeromovil} ${l.placa}`, `${l.desde} a ${l.hasta}`, l.viajes, money(l.totalrecaudado), money(l.totaldescuentos), money(l.neto), l.estado + (l.fechapago ? ` ${l.fechapago}` : '')]),
      ['', '', '', '', money(e.totales.recaudado), money(e.totales.descuentos), money(e.totales.liquidado), ''])}` : ''}
    ${e.movimientos?.length ? `<h2>Detalle de movimientos</h2>${tablaHtml([{ t: 'Fecha' }, { t: 'Comprobante' }, { t: 'Cuenta' }, { t: 'Detalle' }, { t: 'Débito', r: true }, { t: 'Crédito', r: true }],
      e.movimientos.map((m: any) => [m.fecha, m.comprobante, m.codigo, m.detalle ?? '', m.debito ? money(m.debito) : '', m.credito ? money(m.credito) : '']))}` : ''}
    <p class="muted" style="margin-top:24px">Este extracto se genera de la contabilidad de la cooperativa. Si encuentra diferencias, comuníquese con contabilidad dentro de los 30 días siguientes.</p>
    </div>`;
}

function Extractos() {
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [filtro, setFiltro] = useState('');
  const [generando, setGenerando] = useState(false);
  const q = useQuery({ queryKey: ['cont', 'socios', hasta], queryFn: () => cont.get<any[]>('/socios', { hasta }) });
  const t = filtro.trim().toLowerCase();
  const filas = (q.data ?? []).filter((s) => !t || `${s.propietario} ${s.documento} ${s.vehiculos.join(' ')}`.toLowerCase().includes(t));
  const obtener = (s: any) => cont.get(`/socios/${s.idtercero}/extracto`, { desde, hasta });
  const imprimir = async (lista: any[]) => {
    const conTercero = lista.filter((s) => s.idtercero);
    if (!conTercero.length) { m.err(new Error('Los socios seleccionados aún no tienen movimientos contables')); return; }
    setGenerando(true);
    try {
      const extractos = [];
      for (const s of conTercero) extractos.push(await obtener(s));
      imprimirDocumento(conTercero.length === 1 ? `Extracto ${conTercero[0].propietario}` : `Extractos ${desde} a ${hasta}`, extractos.map(htmlExtracto).join(''));
    } catch (e) { m.err(e); } finally { setGenerando(false); }
  };
  const excel = async (s: any) => {
    try {
      const e: any = await obtener(s);
      exportarExcel(`extracto-${s.documento}-${desde}-${hasta}`, [
        { nombre: 'Saldos', filas: e.cuentas.map((c: any) => ({ Cuenta: c.codigo, Nombre: c.nombre, Lado: c.lado === 'FAVOR' ? 'A favor' : 'A cargo', 'Saldo anterior': c.saldoInicial, Débitos: c.debitos, Créditos: c.creditos, 'Saldo al corte': c.saldoFinal })) },
        { nombre: 'Liquidaciones', filas: e.liquidaciones.map((l: any) => ({ N: l.idliquidacion, Movil: l.numeromovil, Desde: l.desde, Hasta: l.hasta, Viajes: l.viajes, Recaudado: l.totalrecaudado, Descuentos: l.totaldescuentos, Neto: l.neto, Estado: l.estado })) },
        { nombre: 'Movimientos', filas: e.movimientos.map((x: any) => ({ Fecha: x.fecha, Comprobante: x.comprobante, Cuenta: x.codigo, Detalle: x.detalle, Debito: x.debito, Credito: x.credito })) },
      ]);
    } catch (err) { m.err(err); }
  };
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="contact_page" title="Extractos de socios (propietarios de buses vinculados)">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <input placeholder="Buscar socio, documento o móvil…" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, width: 240, padding: '7px 10px' }} />
          <Btn icon="print" disabled={generando || !filas.length} onClick={() => imprimir(filas)}>{generando ? 'Generando…' : `Imprimir ${filas.length} extracto(s)`}</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Saldos al {hasta}: <b>a favor</b> = lo que la cooperativa le debe (recaudos por liquidar, liquidaciones por pagar, fondo de reposición); <b>a cargo</b> = lo que el socio debe (almacén a crédito, saldos de liquidaciones).</p>
        <Tabla cargando={q.isLoading} filas={filas} clave={(s: any) => s.idusuario} vacio="No hay buses de socios registrados" columnas={[
          { label: 'Socio', render: (s: any) => <><b>{s.propietario}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{s.documento}</div></> },
          { label: 'Vehículos', render: (s: any) => s.vehiculos.join(', ') },
          { label: 'A favor', align: 'right', render: (s: any) => money(s.aFavor) },
          { label: 'A cargo', align: 'right', render: (s: any) => money(s.aCargo) },
          { label: 'Neto', align: 'right', render: (s: any) => <Valor v={s.neto} fuerte /> },
          { label: '', render: (s: any) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn small variant="secondary" icon="print" disabled={!s.idtercero || generando} onClick={() => imprimir([s])}>Extracto</Btn>
              <Btn small variant="ghost" icon="download" title="Excel" disabled={!s.idtercero} onClick={() => excel(s)} />
            </div>
          ) },
        ]} />
      </Card>
    </>
  );
}

function Liquidaciones() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [nueva, setNueva] = useState<any | null>(null);
  const [pago, setPago] = useState<any | null>(null);
  const lista = useQuery({ queryKey: ['cont', 'liq', desde, hasta], queryFn: () => cont.get<any[]>('/transporte/liquidaciones', { desde, hasta }) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const ver = async (id: number) => { try { imprimirLiquidacion(await cont.get(`/transporte/liquidaciones/${id}`)); } catch (e) { m.err(e); } };
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/transporte/liquidaciones/${id}/anular`, { motivo }),
    onSuccess: () => { m.ok('Liquidación anulada: los recaudos quedan otra vez pendientes'); inv(); }, onError: (e) => m.err(e),
  });
  const filas = lista.data ?? [];
  const tot = (k: string, est?: string) => filas.filter((x) => x.estado !== 'ANULADA' && (!est || x.estado === est)).reduce((a, x) => a + Number(x[k]), 0);
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Recaudado liquidado" valor={money(tot('totalrecaudado'))} />
        <Kpi label="Descuentos (ingreso y fondos)" valor={money(tot('totaldescuentos'))} tono="#15803d" />
        <Kpi label="Neto liquidado" valor={money(tot('neto'))} />
        <Kpi label="Pendiente por pagar" valor={money(tot('neto', 'LIQUIDADA'))} tono="#b45309" />
      </div>
      <Card>
        <CardHeader icon="request_quote" title="Liquidaciones a propietarios">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`liquidaciones-${desde}-${hasta}`, [{ nombre: 'Liquidaciones', filas: filas.map((l) => ({
            N: l.idliquidacion, Movil: l.numeromovil, Placa: l.placa, Propietario: l.propietario, Desde: l.desde, Hasta: l.hasta, Viajes: l.viajes,
            Recaudado: Number(l.totalrecaudado), Descuentos: Number(l.totaldescuentos), Neto: Number(l.neto), Estado: l.estado, Comprobante: l.comprobante, Pago: l.comprobantepago ?? '' })) }])}>Excel</Btn>
          <Btn icon="add" onClick={() => setNueva({ idvehiculo: '', desde: inicioMes(), hasta: hoyCO(), otros: [], observacion: '' })}>Nueva liquidación</Btn>
        </CardHeader>
        <Tabla cargando={lista.isLoading} filas={filas} clave={(l: any) => l.idliquidacion} vacio="Sin liquidaciones en el período" columnas={[
          { label: 'N.º', render: (l: any) => <b>{l.idliquidacion}</b> },
          { label: 'Móvil', render: (l: any) => <>{l.numeromovil} · {l.placa}</> },
          { label: 'Propietario', render: (l: any) => l.propietario },
          { label: 'Período', render: (l: any) => `${String(l.desde).slice(0, 10)} a ${String(l.hasta).slice(0, 10)}` },
          { label: 'Recaudado', align: 'right', render: (l: any) => money(l.totalrecaudado) },
          { label: 'Descuentos', align: 'right', render: (l: any) => money(l.totaldescuentos) },
          { label: 'Neto', align: 'right', render: (l: any) => <Valor v={l.neto} fuerte /> },
          { label: 'Estado', render: (l: any) => <Badge tone={l.estado === 'PAGADA' ? 'green' : l.estado === 'ANULADA' ? 'gray' : 'amber'}>{l.estado}</Badge> },
          { label: '', render: (l: any) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn small variant="ghost" icon="print" title="Imprimir" onClick={() => ver(l.idliquidacion)} />
              {l.estado === 'LIQUIDADA' && <Btn small variant="secondary" icon="payments" onClick={() => setPago({ ...l, medio: 'BANCO', idcuentabancaria: '', referencia: '', fecha: hoyCO() })}>Pagar</Btn>}
              {l.estado !== 'ANULADA' && !l.comprobantepago && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const motivo = pedirMotivo('anular la liquidación'); if (motivo) anular.mutate({ id: l.idliquidacion, motivo }); }} />}
            </div>
          ) },
        ]} />
      </Card>
      {nueva && <NuevaLiquidacion inicial={nueva} onClose={() => setNueva(null)} onOk={(r) => { m.ok(`Liquidación ${r.idliquidacion} registrada (${r.comprobante})`); setNueva(null); inv(); }} />}
      {pago && <PagarLiquidacion l={pago} onClose={() => setPago(null)} onOk={() => { m.ok('Pago registrado'); setPago(null); inv(); }} />}
    </>
  );
}

function NuevaLiquidacion({ inicial, onClose, onOk }: { inicial: any; onClose: () => void; onOk: (r: any) => void }) {
  const [f, setF] = useState<any>(inicial);
  const [err, setErr] = useState<string | null>(null);
  const vehiculos = useQuery({ queryKey: ['cont', 'transp', 'vehiculos'], queryFn: () => cont.get<any[]>('/transporte/vehiculos') });
  const cuerpo = () => ({ ...f, idvehiculo: Number(f.idvehiculo), otros: f.otros.filter((o: any) => o.nombre && Number(o.valor) > 0 && o.idcuenta).map((o: any) => ({ ...o, valor: Number(o.valor) })) });
  const prev = useQuery({
    queryKey: ['cont', 'liq-prev', f.idvehiculo, f.desde, f.hasta, JSON.stringify(f.otros)],
    queryFn: () => cont.post('/transporte/liquidaciones/previsualizar', cuerpo()), enabled: !!f.idvehiculo, retry: false,
  });
  const guardar = useMutation({ mutationFn: () => cont.post('/transporte/liquidaciones', cuerpo()), onSuccess: onOk, onError: (e: any) => setErr(e?.response?.data?.message ?? e.message) });
  const p: any = prev.data;
  const socios = (vehiculos.data ?? []).filter((v) => !v.espropio);
  return (
    <Modal titulo="Nueva liquidación a propietario" onClose={onClose} ancho={860}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <Grid cols={3}>
        <Field label="Vehículo de socio" required>
          <select value={f.idvehiculo} onChange={(e) => setF({ ...f, idvehiculo: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar…</option>
            {socios.map((v) => <option key={v.idvehiculo} value={v.idvehiculo}>{v.numeromovil} · {v.placa} · {v.propietario}{v.pendiente ? ` · pendiente ${money(v.pendiente)}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Desde (viajes)"><input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} style={inputStyle} /></Field>
        <Field label="Corte (hasta)" required><input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>Se liquidan todos los pasajes recaudados hasta la fecha de corte que aún no estén en otra liquidación. «Desde» solo define los viajes que se cuentan para el rodamiento.</p>

      <h4 style={{ margin: '16px 0 6px', fontSize: 13 }}>Otros descuentos (anticipos, multas, cuotas)</h4>
      {f.otros.map((o: any, i: number) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, marginBottom: 6 }}>
          <input placeholder="Descripción" value={o.nombre} onChange={(e) => { const x = [...f.otros]; x[i] = { ...o, nombre: e.target.value }; setF({ ...f, otros: x }); }} style={inputStyle} />
          <input type="number" placeholder="Valor" value={o.valor} onChange={(e) => { const x = [...f.otros]; x[i] = { ...o, valor: e.target.value }; setF({ ...f, otros: x }); }} style={inputStyle} />
          <CuentaSelect value={o.idcuenta ?? null} onChange={(c) => { const x = [...f.otros]; x[i] = { ...o, idcuenta: c?.idcuenta ?? null }; setF({ ...f, otros: x }); }} placeholder="Cuenta contrapartida…" />
          <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setF({ ...f, otros: f.otros.filter((_: any, k: number) => k !== i) })} />
        </div>
      ))}
      <Btn small variant="secondary" icon="add" onClick={() => setF({ ...f, otros: [...f.otros, { nombre: '', valor: '', idcuenta: null }] })}>Agregar descuento</Btn>

      {f.idvehiculo && (
        <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 8 }}>
          {prev.isLoading && <span style={{ color: '#94a3b8' }}>Calculando…</span>}
          {prev.error && <Alerta msg={{ tipo: 'err', texto: (prev.error as any)?.response?.data?.message ?? 'No se pudo calcular' }} />}
          {p && (
            <>
              <div style={{ fontSize: 13, marginBottom: 8 }}>Recaudos pendientes: <b>{p.movimientos}</b> movimientos · Viajes en el período: <b>{p.viajes}</b></div>
              <Tabla filas={[{ nombre: 'Pasajes recaudados', valor: p.recaudo, positivo: true }, ...p.detalle]} clave={(x: any) => x.nombre} columnas={[
                { label: 'Concepto', render: (x: any) => (x.positivo ? <b>{x.nombre}</b> : `(−) ${x.nombre}${x.tipo === 'PORCENTAJE' ? ` ${Number(x.tasa)} %` : x.tipo === 'VALOR_VIAJE' ? ` × ${x.base} viajes` : ''}`) },
                { label: 'Valor', align: 'right', render: (x: any) => <Valor v={x.valor} fuerte={x.positivo} /> },
              ]} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 15, marginTop: 8 }}>Neto a pagar: <b style={{ marginLeft: 8 }}><Valor v={p.neto} fuerte /></b></div>
              {p.neto < 0 && <p style={{ fontSize: 12, color: '#b45309' }}>Los descuentos superan el recaudo: la diferencia queda como saldo a cargo del propietario.</p>}
            </>
          )}
        </div>
      )}
      <Field label="Observación" style={{ marginTop: 12 }}><input value={f.observacion} onChange={(e) => setF({ ...f, observacion: e.target.value })} style={inputStyle} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="check" disabled={!p || !p.movimientos || guardar.isPending} onClick={() => guardar.mutate()}>Liquidar y contabilizar</Btn>
      </div>
    </Modal>
  );
}

function PagarLiquidacion({ l, onClose, onOk }: { l: any; onClose: () => void; onOk: () => void }) {
  const [f, setF] = useState<any>(l);
  const [err, setErr] = useState<string | null>(null);
  const bancos = useQuery({ queryKey: ['cont', 'caja', 'bancos'], queryFn: () => cont.get<any[]>('/caja/cuentas-bancarias') });
  const pagar = useMutation({
    mutationFn: () => cont.post(`/transporte/liquidaciones/${l.idliquidacion}/pagar`, {
      medio: f.medio, idcuentabancaria: f.medio === 'BANCO' ? Number(f.idcuentabancaria) : undefined, referencia: f.referencia, fecha: f.fecha,
    }),
    onSuccess: onOk, onError: (e: any) => setErr(e?.response?.data?.message ?? e.message),
  });
  return (
    <Modal titulo={`Pagar liquidación ${l.idliquidacion} · ${money(l.neto)}`} onClose={onClose} ancho={560}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <p style={{ fontSize: 13, marginTop: 0 }}>{l.propietario} · móvil {l.numeromovil} ({l.placa})</p>
      <Grid cols={2}>
        <Field label="Medio" required>
          <select value={f.medio} onChange={(e) => setF({ ...f, medio: e.target.value })} style={inputStyle}>
            <option value="BANCO">Transferencia / cheque</option><option value="CAJA">Efectivo (mi turno de caja)</option>
          </select>
        </Field>
        <Field label="Fecha" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
        {f.medio === 'BANCO' && (
          <Field label="Cuenta bancaria" required>
            <select value={f.idcuentabancaria} onChange={(e) => setF({ ...f, idcuentabancaria: e.target.value })} style={inputStyle}>
              <option value="">Seleccionar…</option>
              {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
            </select>
          </Field>
        )}
        <Field label="Referencia" required={f.medio === 'BANCO'}><input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="payments" disabled={pagar.isPending || (f.medio === 'BANCO' && (!f.idcuentabancaria || !f.referencia))} onClick={() => pagar.mutate()}>Registrar pago</Btn>
      </div>
    </Modal>
  );
}

function Vehiculos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [filtro, setFiltro] = useState('');
  const q = useQuery({ queryKey: ['cont', 'transp', 'vehiculos'], queryFn: () => cont.get<any[]>('/transporte/vehiculos') });
  const clasificar = useMutation({
    mutationFn: ({ id, espropio }: { id: number; espropio: boolean }) => cont.put(`/transporte/vehiculos/${id}`, { espropio }),
    onSuccess: () => { m.ok('Vehículo clasificado. Aplica a las ventas que se contabilicen desde ahora.'); qc.invalidateQueries({ queryKey: ['cont', 'transp'] }); },
    onError: (e) => m.err(e),
  });
  const t = filtro.trim().toLowerCase();
  const filas = (q.data ?? []).filter((v) => !t || `${v.numeromovil} ${v.placa} ${v.propietario}`.toLowerCase().includes(t));
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="directions_bus" title="Vehículos: propios de la cooperativa o de socios">
          <input placeholder="Buscar móvil, placa o propietario…" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, width: 260, padding: '7px 10px' }} />
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>
          Bus <b>propio</b>: el pasaje es ingreso de la cooperativa. Bus <b>de socio</b>: el pasaje se registra como recaudo para el propietario (281505) y se le liquida descontando administración y demás conceptos.
          Si no lo clasifica, se considera propio cuando el documento del propietario es el NIT de la empresa.
        </p>
        <Tabla cargando={q.isLoading} filas={filas} clave={(v: any) => v.idvehiculo} vacio="No hay vehículos" columnas={[
          { label: 'Móvil', render: (v: any) => <b>{v.numeromovil}</b> },
          { label: 'Placa', render: (v: any) => v.placa },
          { label: 'Propietario', render: (v: any) => <>{v.propietario}<div style={{ fontSize: 11.5, color: '#64748b' }}>{v.documentopropietario}</div></> },
          { label: 'Tipo', render: (v: any) => <><Badge tone={v.espropio ? 'blue' : 'green'}>{v.espropio ? 'Propio' : 'De socio'}</Badge>{!v.clasificado && <span style={{ fontSize: 11, color: '#94a3b8' }}> (automático)</span>}</> },
          { label: 'Recaudo sin liquidar', align: 'right', render: (v: any) => (v.espropio ? '—' : money(v.pendiente)) },
          { label: 'Última liquidación', render: (v: any) => (v.ultimaliquidacion ? String(v.ultimaliquidacion).slice(0, 10) : '—') },
          { label: '', render: (v: any) => (
            <Btn small variant="secondary" icon="swap_horiz" disabled={clasificar.isPending}
              onClick={() => clasificar.mutate({ id: v.idvehiculo, espropio: !v.espropio })}>{v.espropio ? 'Marcar de socio' : 'Marcar propio'}</Btn>
          ) },
        ]} />
      </Card>
    </>
  );
}

function Conceptos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'transp', 'conceptos'], queryFn: () => cont.get<any[]>('/transporte/conceptos') });
  const [form, setForm] = useState<any | null>(null);
  const guardar = useMutation({
    mutationFn: () => (form.idconcepto ? cont.put(`/transporte/conceptos/${form.idconcepto}`, form) : cont.post('/transporte/conceptos', form)),
    onSuccess: () => { m.ok('Concepto guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'transp'] }); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="tune" title="Descuentos que se aplican en cada liquidación">
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', tipo: 'PORCENTAJE', valor: 0, idcuenta: null, orden: 10, activo: true })}>Nuevo descuento</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#b45309' }}>Configure los valores que aprobó la cooperativa (por ejemplo, la cuota de administración). Los conceptos en 0 o inactivos no se descuentan.</p>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(c: any) => c.idconcepto} vacio="Sin conceptos" columnas={[
          { label: 'Concepto', render: (c: any) => <><b>{c.nombre}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{c.codigo}</div></> },
          { label: 'Cálculo', render: (c: any) => TIPOS[c.tipo] },
          { label: 'Valor', align: 'right', render: (c: any) => (c.tipo === 'PORCENTAJE' ? `${Number(c.valor)} %` : money(c.valor)) },
          { label: 'Cuenta', render: (c: any) => `${c.codigocuenta} ${c.nombrecuenta}` },
          { label: 'Estado', render: (c: any) => <Badge tone={c.activo ? 'green' : 'gray'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: '', render: (c: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...c, valor: Number(c.valor) })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idconcepto ? 'Editar descuento' : 'Nuevo descuento'} onClose={() => setForm(null)} ancho={620}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Cálculo" required>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label={form.tipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Valor ($)'} required>
              <input type="number" min={0} step="any" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Orden"><input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <Field label="Cuenta contable (ingreso de la cooperativa, fondo o retención)" required style={{ marginTop: 12 }}>
            <CuentaSelect value={form.idcuenta} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} />
          </Field>
          <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || !form.idcuenta || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
