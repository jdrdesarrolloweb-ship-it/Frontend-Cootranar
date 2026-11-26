import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, Tabs, TerceroPicker,
  escHtml, exportarExcel, fecha, imprimirDocumento, inicioMes, hoyCO, inputStyle, money, tablaHtml, useMensaje,
} from './contUi';

const CONTABLES = ['ADMINISTRADOR', 'CONTADOR'];

export const CajaPage = () => {
  const { user } = useAuth();
  const contable = CONTABLES.includes(user?.nombrerol ?? '');
  const [tab, setTab] = useState<'turno' | 'historial' | 'sinturno' | 'cajas'>('turno');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'turno', label: 'Mi turno', icon: 'point_of_sale' },
        ...(contable ? [
          { id: 'historial' as const, label: 'Turnos y movimientos', icon: 'history' },
          { id: 'sinturno' as const, label: 'Cobros sin turno', icon: 'report' },
          { id: 'cajas' as const, label: 'Cajas y conceptos', icon: 'settings' },
        ] : []),
      ]} />
      {tab === 'turno' && <MiTurno contable={contable} />}
      {tab === 'historial' && contable && <Historial />}
      {tab === 'sinturno' && contable && <CobrosSinTurno />}
      {tab === 'cajas' && contable && <ConfigCajas />}
    </Layout>
  );
};

function imprimirReporte(r: any, titulo: string) {
  const t = r.turno;
  imprimirDocumento(`${titulo} ${t.codigoapertura}`, `
    <h1>${titulo} · ${escHtml(t.caja)} (${escHtml(t.codigocaja)})</h1>
    <div class="muted">Apertura ${escHtml(t.codigoapertura)} · Cajero: ${escHtml(t.cajero)} · Apertura: ${escHtml(fecha(t.fechaapertura))}${t.fechacierre ? ` · Cierre: ${escHtml(fecha(t.fechacierre))}` : ''}</div>
    <h2>Totales por medio de pago</h2>
    ${tablaHtml([{ t: 'Medio' }, { t: 'Tipo' }, { t: 'Entradas', r: true }, { t: 'Salidas', r: true }, { t: 'Neto', r: true }],
      r.porMedio.map((m: any) => [m.metodopago, m.esefectivo ? 'Efectivo' : 'Electrónico', money(m.entradas), money(m.salidas), money(m.neto)]))}
    <h2>Resumen</h2>
    ${tablaHtml([{ t: 'Concepto' }, { t: 'Valor', r: true }], [
      ...(Number(t.fondoinicial) > 0 ? [['Fondo inicial', money(t.fondoinicial)]] : []), ['Ventas (' + r.numeroVentas + ')', money(r.porTipo.VENTA)], ['Ingresos', money(r.porTipo.INGRESO)],
      ['Egresos', money(r.porTipo.EGRESO)], ['Retiros', money(r.porTipo.RETIRO)], ['Devoluciones', money(r.porTipo.DEVOLUCION)],
      ['Total ingresado', money(Number(r.porTipo.VENTA) + Number(r.porTipo.INGRESO))], ['Total medios electrónicos', money(r.totalElectronico)], ['Efectivo esperado', money(r.efectivoEsperado)],
      ...(t.estado === 'CERRADO' ? [['Efectivo contado', money(t.efectivocontado)], ['Diferencia', money(t.diferencia)]] : []),
    ])}
    <h2>Movimientos</h2>
    ${tablaHtml([{ t: 'Hora' }, { t: 'Tipo' }, { t: 'Concepto' }, { t: 'Medio' }, { t: 'Valor', r: true }],
      r.movimientos.map((m: any) => [fecha(m.fecha), m.tipo, m.concepto, m.metodopago, money(m.valor)]))}
    ${t.observacioncierre ? `<p>Observación de cierre: ${escHtml(t.observacioncierre)}</p>` : ''}
    <p class="muted" style="margin-top:30px">Firma cajero: ______________________ &nbsp;&nbsp; Firma supervisor: ______________________</p>`);
}

/** Recibo de caja (RCJ) o comprobante de egreso (CEJ) de un movimiento manual. */
function imprimirDocumentoCaja(x: any, turno: any) {
  const ingreso = ['INGRESO', 'VENTA'].includes(x.tipo);
  const titulo = ingreso ? 'Recibo de caja' : 'Comprobante de egreso';
  imprimirDocumento(`${titulo} ${x.numerodocumento ?? ''}`, `
    <h1>${titulo} ${escHtml(x.numerodocumento ?? '')}</h1>
    <div class="muted">${escHtml(turno?.caja ?? '')} · Apertura ${escHtml(turno?.codigoapertura ?? '')} · ${escHtml(fecha(x.fecha))}</div>
    ${tablaHtml([{ t: 'Concepto' }, { t: 'Medio' }, { t: 'Referencia' }, { t: 'Valor', r: true }],
      [[x.concepto, x.metodopago ?? '', x.referencia ?? '', money(x.valor)]], ['Total', '', '', money(x.valor)])}
    <p>Registró: ${escHtml(x.usuario ?? '')}</p>
    <p class="muted" style="margin-top:40px">${ingreso ? 'Recibido por' : 'Entregado por'}: ______________________ &nbsp;&nbsp; ${ingreso ? 'Pagado por' : 'Recibido por'}: ______________________ &nbsp;&nbsp; C.C./NIT: ____________</p>`);
}

function MiTurno({ contable }: { contable: boolean }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const turno = useQuery({ queryKey: ['cont', 'caja', 'turno'], queryFn: () => cont.get('/caja/turno-actual'), refetchInterval: 30_000 });
  const cajas = useQuery({ queryKey: ['cont', 'caja', 'mis-cajas'], queryFn: () => cont.get<any[]>('/caja/mis-cajas') });
  const metodos = useQuery({ queryKey: ['cont', 'caja', 'metodos'], queryFn: () => cont.get<any[]>('/caja/metodos-pago'), staleTime: 300_000 });
  const [apertura, setApertura] = useState({ idcaja: '', observacion: '' });
  const [mov, setMov] = useState<{ tipo: string; concepto: string; valor: string; idmetodopago: string; idcuentacontra: number | null; idconceptocaja: string; libre: boolean; tercero: any } | null>(null);
  const [entrega, setEntrega] = useState<{ destino: string; idcuentabancaria: string; valor: string; referencia: string } | null>(null);
  const conceptos = useQuery({ queryKey: ['cont', 'caja', 'conceptos'], queryFn: () => cont.get<any[]>('/caja/conceptos'), staleTime: 120_000 });
  const bancos = useQuery({ queryKey: ['cont', 'caja', 'bancos'], queryFn: () => cont.get<any[]>('/caja/cuentas-bancarias'), staleTime: 300_000, enabled: !!entrega });
  const [arqueo, setArqueo] = useState<{ cierre: boolean } | null>(null);
  const [efectivo, setEfectivo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const invalidar = () => qc.invalidateQueries({ queryKey: ['cont', 'caja'] });

  const abrir = useMutation({
    mutationFn: () => cont.post('/caja/turnos', { idcaja: Number(apertura.idcaja), observacion: apertura.observacion }),
    onSuccess: (x: any) => { m.ok(`Apertura ${x?.codigoapertura ?? ''} creada. Ya puedes registrar ventas.`); invalidar(); },
    onError: (e) => m.err(e),
  });
  const r = turno.data;
  const idturno = r?.turno?.idturno;
  const registrar = useMutation({
    mutationFn: () => cont.post(`/caja/turnos/${idturno}/movimientos`, {
      tipo: mov?.tipo, concepto: mov?.concepto, valor: Number(mov?.valor), idmetodopago: Number(mov?.idmetodopago || 1), idtercero: mov?.tercero?.idtercero ?? undefined,
      ...(mov?.libre ? { idcuentacontra: mov?.idcuentacontra } : { idconceptocaja: Number(mov?.idconceptocaja) }),
    }),
    onSuccess: (x: any) => { m.ok(`Movimiento registrado ${x?.numerodocumento ?? ''}`); setMov(null); invalidar(); imprimirDocumentoCaja({ ...x, metodopago: (metodos.data ?? []).find((y) => y.idmetodopago === x.idmetodopago)?.nombre }, r?.turno); },
    onError: (e) => m.err(e),
  });
  const entregar = useMutation({
    mutationFn: () => cont.post(`/caja/turnos/${idturno}/entregas`, {
      destino: entrega?.destino, idcuentabancaria: entrega?.destino === 'BANCO' ? Number(entrega?.idcuentabancaria) : undefined,
      valor: Number(entrega?.valor), referencia: entrega?.referencia,
    }),
    onSuccess: (x: any) => { m.ok(`Entrega registrada ${x?.numerodocumento ?? ''}`); setEntrega(null); invalidar(); imprimirDocumentoCaja({ ...x, metodopago: 'Efectivo' }, r?.turno); },
    onError: (e) => m.err(e),
  });
  const conceptosTipo = (conceptos.data ?? []).filter((k) => mov && (mov.tipo === 'INGRESO' ? k.tipo === 'INGRESO' : k.tipo !== 'INGRESO') && (contable || !k.solocontable));
  const contado = Number(efectivo || 0);
  const arquear = useMutation({
    mutationFn: () => arqueo?.cierre
      ? cont.post(`/caja/turnos/${idturno}/cerrar`, { efectivocontado: contado, justificacion, observacion: justificacion })
      : cont.post(`/caja/turnos/${idturno}/arqueos`, { efectivocontado: contado, justificacion }),
    onSuccess: (x: any) => {
      if (arqueo?.cierre) { m.ok(`Apertura cerrada. Diferencia: ${money(x.diferencia)}`); if (x.reporteZ) imprimirReporte(x.reporteZ, 'Cuadre de caja'); }
      else m.ok(`Arqueo registrado. Diferencia: ${money(x.diferencia)}`);
      setArqueo(null); setEfectivo(''); setJustificacion(''); invalidar();
    },
    onError: (e) => m.err(e),
  });

  if (turno.isLoading) return <Card style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Cargando…</Card>;

  if (!r) {
    return (
      <>
        <Alerta msg={m.msg} onClose={m.cerrar} />
        <Card>
          <CardHeader icon="lock_open" title="Abrir caja (apertura del día)" />
          <div style={{ padding: 20 }}>
            {!cajas.data?.length ? (
              <p style={{ fontSize: 13, color: '#b45309' }}>No tienes cajas asignadas. {contable ? 'Asígnate una en la pestaña «Cajas».' : 'Pide al administrador que te asigne una.'}</p>
            ) : (
              <Grid cols={2}>
                <Field label="Caja" required>
                  <select value={apertura.idcaja} onChange={(e) => setApertura({ ...apertura, idcaja: e.target.value })} style={inputStyle}>
                    <option value="">Seleccionar…</option>
                    {cajas.data.map((c) => <option key={c.idcaja} value={c.idcaja} disabled={c.ocupada}>{c.nombre}{c.sede ? ` · ${c.sede}` : ''}{c.ocupada ? ' (en uso)' : ''}</option>)}
                  </select>
                </Field>
                <Field label="Observación"><input value={apertura.observacion} onChange={(e) => setApertura({ ...apertura, observacion: e.target.value })} style={inputStyle} /></Field>
              </Grid>
            )}
            <p style={{ fontSize: 12, color: '#64748b', margin: '12px 0 0' }}>Se genera un código de apertura (AP-…) que arranca en cero; al cerrar se hace el cuadre de lo que ingresó.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Btn icon="lock_open" disabled={!apertura.idcaja || abrir.isPending} onClick={() => abrir.mutate()}>Abrir caja</Btn>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label={`${r.turno.caja} · ${r.turno.codigoapertura}`} valor={<span style={{ fontSize: 13 }}>Abierto {fecha(r.turno.fechaapertura)}</span>} />
        <Kpi label="Total ingresado" valor={money(Number(r.porTipo.VENTA) + Number(r.porTipo.INGRESO))} />
        <Kpi label={`Ventas (${r.numeroVentas})`} valor={money(r.porTipo.VENTA)} />
        <Kpi label="Efectivo esperado" valor={money(r.efectivoEsperado)} tono="#15803d" />
        <Kpi label="Medios electrónicos" valor={money(r.totalElectronico)} tono="#1d4ed8" />
      </div>
      <Card>
        <CardHeader icon="receipt_long" title="Movimientos del turno">
          <Btn variant="secondary" icon="add" onClick={() => setMov({ tipo: 'INGRESO', concepto: '', valor: '', idmetodopago: '1', idcuentacontra: null, idconceptocaja: '', libre: false, tercero: null })}>Ingreso</Btn>
          {contable && <Btn variant="secondary" icon="remove" onClick={() => setMov({ tipo: 'EGRESO', concepto: '', valor: '', idmetodopago: '1', idcuentacontra: null, idconceptocaja: '', libre: false, tercero: null })}>Egreso / retiro</Btn>}
          <Btn variant="secondary" icon="account_balance" onClick={() => setEntrega({ destino: 'BANCO', idcuentabancaria: '', valor: '', referencia: '' })}>Entregar efectivo</Btn>
          <Btn variant="secondary" icon="print" onClick={() => imprimirReporte(r, 'Reporte X')}>Reporte X</Btn>
          <Btn variant="secondary" icon="calculate" onClick={() => setArqueo({ cierre: false })}>Arqueo</Btn>
          <Btn variant="danger" icon="lock" onClick={() => setArqueo({ cierre: true })}>Cerrar y cuadrar</Btn>
        </CardHeader>
        <Tabla filas={r.movimientos} clave={(x: any) => x.idmovimiento} vacio="Aún no hay movimientos. Las ventas de contado aparecen aquí automáticamente." columnas={[
          { label: 'Hora', render: (x: any) => fecha(x.fecha) },
          { label: 'Tipo', render: (x: any) => <Badge tone={['VENTA', 'INGRESO'].includes(x.tipo) ? 'green' : 'red'}>{x.tipo}</Badge> },
          { label: 'Concepto', render: (x: any) => <>{x.concepto}{x.referencia && <div style={{ fontSize: 11.5, color: '#64748b' }}>{x.referencia}</div>}</> },
          { label: 'Medio', render: (x: any) => <>{x.metodopago} <Badge tone={x.esefectivo ? 'amber' : 'blue'}>{x.esefectivo ? 'efectivo' : 'electrónico'}</Badge></> },
          { label: 'Valor', align: 'right', render: (x: any) => <b>{money(x.valor)}</b> },
          { label: 'Documento', render: (x: any) => (x.numerodocumento
            ? <Btn small variant="ghost" icon="print" title={`Imprimir ${x.numerodocumento}`} onClick={() => imprimirDocumentoCaja(x, r.turno)}>{x.numerodocumento}</Btn> : '—') },
        ]} />
        <div style={{ padding: 16 }}>
          <Tabla filas={r.porMedio} clave={(x: any) => x.metodopago} vacio="—" columnas={[
            { label: 'Medio de pago', render: (x: any) => x.metodopago },
            { label: 'Entradas', align: 'right', render: (x: any) => money(x.entradas) },
            { label: 'Salidas', align: 'right', render: (x: any) => money(x.salidas) },
            { label: 'Neto', align: 'right', render: (x: any) => <b>{money(x.neto)}</b> },
          ]} />
        </div>
      </Card>

      {mov && (
        <Modal titulo={mov.tipo === 'INGRESO' ? 'Ingreso de caja' : 'Egreso / retiro de caja'} onClose={() => setMov(null)} ancho={560}>
          <Grid cols={2}>
            {mov.tipo !== 'INGRESO' && mov.libre && (
              <Field label="Tipo" required>
                <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })} style={inputStyle}>
                  <option value="EGRESO">Egreso (gasto)</option><option value="RETIRO">Retiro (consignación/traslado)</option><option value="DEVOLUCION">Devolución / reembolso</option>
                </select>
              </Field>
            )}
            <Field label="Valor" required><input type="number" min={1} value={mov.valor} onChange={(e) => setMov({ ...mov, valor: e.target.value })} style={inputStyle} /></Field>
            <Field label="Medio" required>
              <select value={mov.idmetodopago} onChange={(e) => setMov({ ...mov, idmetodopago: e.target.value })} style={inputStyle}>
                {(metodos.data ?? []).map((x) => <option key={x.idmetodopago} value={x.idmetodopago}>{x.nombre}</option>)}
              </select>
            </Field>
          </Grid>
          {!mov.libre ? (
            <Field label="Concepto de caja" required style={{ marginTop: 12 }}>
              <select value={mov.idconceptocaja} onChange={(e) => {
                const k = conceptosTipo.find((x) => String(x.idconceptocaja) === e.target.value);
                setMov({ ...mov, idconceptocaja: e.target.value, tipo: k?.tipo ?? mov.tipo });
              }} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {conceptosTipo.map((k) => <option key={k.idconceptocaja} value={k.idconceptocaja}>{k.nombre}{mov.tipo !== 'INGRESO' ? ` (${k.tipo.toLowerCase()})` : ''}</option>)}
              </select>
              {!conceptosTipo.length && <span style={{ fontSize: 12, color: '#b45309' }}>No hay conceptos configurados. {contable ? 'Créelos en «Cajas y conceptos».' : 'Pida al contador que los cree.'}</span>}
            </Field>
          ) : (
            <Field label="Cuenta contable de contrapartida" required style={{ marginTop: 12 }}>
              <CuentaSelect value={mov.idcuentacontra} onChange={(c) => setMov({ ...mov, idcuentacontra: c?.idcuenta ?? null })} />
            </Field>
          )}
          {contable && (
            <label style={{ display: 'flex', gap: 6, marginTop: 8, fontSize: 12.5, color: '#64748b' }}>
              <input type="checkbox" checked={mov.libre} onChange={(e) => setMov({ ...mov, libre: e.target.checked })} /> Usar una cuenta contable directamente (solo contador)
            </label>
          )}
          {(mov.libre || conceptosTipo.find((x) => String(x.idconceptocaja) === mov.idconceptocaja)?.exigetercero) && (
            <Field label="Tercero" style={{ marginTop: 12 }}>
              <TerceroPicker value={mov.tercero} onChange={(t) => setMov({ ...mov, tercero: t })} />
            </Field>
          )}
          <Field label={mov.libre ? 'Concepto' : 'Detalle (opcional)'} required={mov.libre} style={{ marginTop: 12 }}><input value={mov.concepto} onChange={(e) => setMov({ ...mov, concepto: e.target.value })} style={inputStyle} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setMov(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!(Number(mov.valor) > 0) || (mov.libre ? (!mov.concepto.trim() || !mov.idcuentacontra) : !mov.idconceptocaja) || registrar.isPending} onClick={() => registrar.mutate()}>Registrar e imprimir</Btn>
          </div>
        </Modal>
      )}

      {entrega && (
        <Modal titulo="Entregar efectivo (consignación o traslado)" onClose={() => setEntrega(null)} ancho={560}>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>Saca efectivo del turno hacia el banco o la caja general. Efectivo disponible: <b>{money(r.efectivoEsperado)}</b></p>
          <Grid cols={2}>
            <Field label="Destino" required>
              <select value={entrega.destino} onChange={(e) => setEntrega({ ...entrega, destino: e.target.value })} style={inputStyle}>
                <option value="BANCO">Consignación en banco</option><option value="CAJA_GENERAL">Caja general / tesorería</option>
              </select>
            </Field>
            {entrega.destino === 'BANCO' && (
              <Field label="Cuenta bancaria" required>
                <select value={entrega.idcuentabancaria} onChange={(e) => setEntrega({ ...entrega, idcuentabancaria: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
                </select>
              </Field>
            )}
            <Field label="Valor" required><input type="number" min={1} value={entrega.valor} onChange={(e) => setEntrega({ ...entrega, valor: e.target.value })} style={inputStyle} /></Field>
            <Field label={entrega.destino === 'BANCO' ? 'N.º de consignación' : 'Referencia'} required={entrega.destino === 'BANCO'}>
              <input value={entrega.referencia} onChange={(e) => setEntrega({ ...entrega, referencia: e.target.value })} style={inputStyle} />
            </Field>
          </Grid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setEntrega(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={entregar.isPending || !(Number(entrega.valor) > 0) || Number(entrega.valor) > r.efectivoEsperado || (entrega.destino === 'BANCO' && (!entrega.idcuentabancaria || !entrega.referencia.trim()))}
              onClick={() => entregar.mutate()}>Registrar e imprimir</Btn>
          </div>
        </Modal>
      )}

      {arqueo && (
        <Modal titulo={arqueo.cierre ? `Cierre y cuadre · ${r.turno.codigoapertura}` : 'Arqueo de caja'} onClose={() => setArqueo(null)} ancho={560}>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>Lo que ingresó desde la apertura, por medio de pago:</p>
          <Tabla filas={r.porMedio} clave={(x: any) => x.metodopago} vacio="Sin movimientos en esta apertura" columnas={[
            { label: 'Medio de pago', render: (x: any) => x.metodopago },
            { label: 'Ingresó', align: 'right', render: (x: any) => money(x.entradas) },
            { label: 'Salió', align: 'right', render: (x: any) => money(x.salidas) },
            { label: 'Neto', align: 'right', render: (x: any) => <b>{money(x.neto)}</b> },
          ]} />
          <Field label="Efectivo contado en caja" required style={{ marginTop: 14 }}>
            <input type="number" min={0} step="any" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} style={inputStyle} autoFocus />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 14 }}>
            <span>Efectivo esperado: <b>{money(r.efectivoEsperado)}</b></span>
            <span>Diferencia: <b style={{ color: contado - r.efectivoEsperado === 0 ? '#15803d' : '#b91c1c' }}>{money(contado - r.efectivoEsperado)}</b></span>
          </div>
          <Field label={contado !== r.efectivoEsperado ? 'Justificación de la diferencia *' : 'Observación'} style={{ marginTop: 12 }}>
            <input value={justificacion} onChange={(e) => setJustificacion(e.target.value)} style={inputStyle} />
          </Field>
          {arqueo.cierre && <p style={{ fontSize: 12, color: '#b45309' }}>Al cerrar, la apertura queda bloqueada y se imprime el cuadre. Si hay faltante o sobrante, un supervisor debe aprobarlo y decidir si el faltante lo asume la empresa o el cajero.</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setArqueo(null)}>Cancelar</Btn>
            <Btn icon={arqueo.cierre ? 'lock' : 'save'} variant={arqueo.cierre ? 'danger' : 'primary'}
              disabled={arquear.isPending || efectivo === '' || (contado !== r.efectivoEsperado && arqueo.cierre && !justificacion.trim())} onClick={() => arquear.mutate()}>
              {arqueo.cierre ? 'Cerrar y cuadrar' : 'Registrar arqueo'}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Historial() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [soloDif, setSoloDif] = useState(false);
  const [soloPend, setSoloPend] = useState(false);
  const [ver, setVer] = useState<number | null>(null);
  const [aprobar, setAprobar] = useState<{ t: any; cargo: string; observacion: string } | null>(null);
  const turnos = useQuery({ queryKey: ['cont', 'caja', 'historial', desde, hasta, soloDif, soloPend], queryFn: () => cont.get<any[]>('/caja/historial', { desde, hasta, conDiferencia: soloDif ? 'true' : undefined, pendientes: soloPend ? 'true' : undefined }) });
  const aprobarM = useMutation({
    mutationFn: () => cont.patch(`/caja/turnos/${aprobar?.t.idturno}/aprobar`, { cargo: aprobar?.cargo, observacion: aprobar?.observacion }),
    onSuccess: () => { m.ok('Cierre aprobado: la diferencia se contabiliza en el próximo ciclo de integración'); setAprobar(null); qc.invalidateQueries({ queryKey: ['cont', 'caja'] }); },
    onError: (e) => m.err(e),
  });
  const movs = useQuery({ queryKey: ['cont', 'caja', 'movs', desde, hasta], queryFn: () => cont.get<any[]>('/caja/movimientos', { desde, hasta }) });
  const detalle = useQuery({ queryKey: ['cont', 'caja', 'turno', ver], queryFn: () => cont.get(`/caja/turnos/${ver}/reporte`), enabled: !!ver });
  const lista = turnos.data ?? [];
  return (
    <>
      <Card>
        <CardHeader icon="history" title="Turnos (aperturas, cierres, faltantes y sobrantes)">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <label style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={soloDif} onChange={(e) => setSoloDif(e.target.checked)} /> Solo con diferencia</label>
          <label style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={soloPend} onChange={(e) => setSoloPend(e.target.checked)} /> Pendientes de aprobar</label>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`turnos-caja-${desde}-${hasta}`, [
            { nombre: 'Aperturas', filas: lista.map((t) => ({ Apertura: t.codigoapertura, Caja: t.caja, Cajero: t.cajero, FechaApertura: fecha(t.fechaapertura), Cierre: t.fechacierre ? fecha(t.fechacierre) : '',
              Estado: t.estado, Fondo: Number(t.fondoinicial), Esperado: Number(t.efectivoesperado ?? 0), Contado: Number(t.efectivocontado ?? 0), Diferencia: Number(t.diferencia ?? 0) })) },
            { nombre: 'Movimientos', filas: (movs.data ?? []).map((x) => ({ Fecha: fecha(x.fecha), Caja: x.caja, Usuario: x.usuario, Tipo: x.tipo, Concepto: x.concepto, Medio: x.metodopago, Valor: Number(x.valor) })) },
          ])}>Excel</Btn>
        </CardHeader>
        <Tabla filas={lista} clave={(t: any) => t.idturno} onFila={(t: any) => setVer(t.idturno)} vacio="Sin turnos en el período" columnas={[
          { label: 'Apertura', render: (t: any) => <b>{t.codigoapertura}</b> },
          { label: 'Caja', render: (t: any) => t.caja },
          { label: 'Cajero', render: (t: any) => t.cajero },
          { label: 'Apertura', render: (t: any) => fecha(t.fechaapertura) },
          { label: 'Cierre', render: (t: any) => (t.fechacierre ? fecha(t.fechacierre) : '—') },
          { label: 'Esperado', align: 'right', render: (t: any) => (t.efectivoesperado !== null ? money(t.efectivoesperado) : '—') },
          { label: 'Contado', align: 'right', render: (t: any) => (t.efectivocontado !== null ? money(t.efectivocontado) : '—') },
          { label: 'Diferencia', align: 'right', render: (t: any) => (t.diferencia !== null ? <b style={{ color: Number(t.diferencia) === 0 ? '#15803d' : '#b91c1c' }}>{money(t.diferencia)}</b> : '—') },
          { label: 'Estado', render: (t: any) => <Badge tone={t.estado === 'ABIERTO' ? 'amber' : 'gray'}>{t.estado}</Badge> },
          { label: 'Aprobación', render: (t: any) => (t.pendienteaprobacion
            ? <span onClick={(e) => e.stopPropagation()}><Btn small icon="verified" onClick={() => setAprobar({ t, cargo: 'EMPRESA', observacion: '' })}>Aprobar</Btn></span>
            : t.cargodiferencia ? <Badge tone={t.cargodiferencia === 'EMPLEADO' ? 'amber' : 'green'}>{t.cargodiferencia === 'EMPLEADO' ? 'A cargo del cajero' : 'Asume la empresa'}</Badge> : '—') },
        ]} />
      </Card>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      {aprobar && (
        <Modal titulo={`Aprobar cierre ${aprobar.t.codigoapertura} · diferencia ${money(aprobar.t.diferencia)}`} onClose={() => setAprobar(null)} ancho={560}>
          <p style={{ fontSize: 13, marginTop: 0 }}>Cajero: <b>{aprobar.t.cajero}</b> · Caja {aprobar.t.caja}</p>
          <Field label="¿Quién asume la diferencia?" required>
            <select value={aprobar.cargo} onChange={(e) => setAprobar({ ...aprobar, cargo: e.target.value })} style={inputStyle}>
              <option value="EMPRESA">{Number(aprobar.t.diferencia) < 0 ? 'La empresa (gasto por faltante)' : 'Sobrante: ingreso de la empresa'}</option>
              {Number(aprobar.t.diferencia) < 0 && <option value="EMPLEADO">El cajero (cuenta por cobrar, se descuenta por nómina)</option>}
            </select>
          </Field>
          <Field label="Observación" style={{ marginTop: 12 }}><input value={aprobar.observacion} onChange={(e) => setAprobar({ ...aprobar, observacion: e.target.value })} style={inputStyle} /></Field>
          <p style={{ fontSize: 12, color: '#64748b' }}>No puede aprobar su propio turno. Descontar un faltante al trabajador exige su autorización escrita (art. 149 C.S.T.).</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setAprobar(null)}>Cancelar</Btn>
            <Btn icon="verified" disabled={aprobarM.isPending} onClick={() => aprobarM.mutate()}>Aprobar</Btn>
          </div>
        </Modal>
      )}
      {ver && (
        <Modal titulo={`Apertura AP-${String(ver).padStart(6, '0')}`} onClose={() => setVer(null)} ancho={900}>
          {!detalle.data ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Btn icon="print" onClick={() => imprimirReporte(detalle.data, detalle.data.turno.estado === 'CERRADO' ? 'Cuadre de caja' : 'Reporte X')}>Imprimir {detalle.data.turno.estado === 'CERRADO' ? 'cuadre' : 'reporte X'}</Btn>
              </div>
              <Tabla filas={detalle.data.arqueos} clave={(a: any) => a.idarqueo} vacio="Sin arqueos" columnas={[
                { label: 'Arqueo', render: (a: any) => `${a.escierre ? 'Cierre' : 'Parcial'} · ${fecha(a.fecha)}` },
                { label: 'Contado', align: 'right', render: (a: any) => money(a.contado) },
                { label: 'Esperado', align: 'right', render: (a: any) => money(a.esperado) },
                { label: 'Diferencia', align: 'right', render: (a: any) => <b>{money(a.diferencia)}</b> },
                { label: 'Justificación', render: (a: any) => a.justificacion ?? '—' },
              ]} />
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function CobrosSinTurno() {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'caja', 'sinturno', desde, hasta], queryFn: () => cont.get<any[]>('/caja/cobros-sin-turno', { desde, hasta }) });
  const filas = q.data ?? [];
  const total = filas.reduce((a, x) => a + Number(x.valor), 0);
  const ORIGEN: Record<string, string> = { VENTA_ALMACEN: 'Venta almacén', TIQUETE: 'Tiquete taquilla', ENCOMIENDA: 'Encomienda', ABONO_CARTERA: 'Abono cartera' };
  return (
    <Card>
      <CardHeader icon="report" title={`Cobros en efectivo sin turno de caja abierto · ${money(total)}`}>
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
      </CardHeader>
      <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Este efectivo no entró a ningún cuadre de caja. Revise con cada usuario; para evitarlo, el cajero debe abrir su turno antes de cobrar.</p>
      <Tabla cargando={q.isLoading} filas={filas} clave={(x: any) => `${x.origen}-${x.idorigen}`} vacio="Todo cobro en efectivo del período quedó dentro de un turno de caja." columnas={[
        { label: 'Fecha', render: (x: any) => fecha(x.fecha) },
        { label: 'Origen', render: (x: any) => ORIGEN[x.origen] ?? x.origen },
        { label: 'Documento', render: (x: any) => x.documento },
        { label: 'Usuario', render: (x: any) => x.usuario },
        { label: 'Valor', align: 'right', render: (x: any) => <b>{money(x.valor)}</b> },
      ]} />
    </Card>
  );
}

function ConceptosCaja() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'caja', 'conceptos', 'todos'], queryFn: () => cont.get<any[]>('/caja/conceptos/todos') });
  const [form, setForm] = useState<any | null>(null);
  const guardar = useMutation({
    mutationFn: () => (form.idconceptocaja ? cont.put(`/caja/conceptos/${form.idconceptocaja}`, form) : cont.post('/caja/conceptos', form)),
    onSuccess: () => { m.ok('Concepto guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'caja'] }); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card style={{ marginTop: 16 }}>
        <CardHeader icon="list_alt" title="Conceptos de caja (lo que el cajero puede registrar)">
          <Btn icon="add" onClick={() => setForm({ nombre: '', tipo: 'INGRESO', idcuenta: null, exigetercero: false, solocontable: false, activo: true })}>Nuevo concepto</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(k: any) => k.idconceptocaja} vacio="Cree los conceptos (p. ej. «Reintegro de anticipo», «Pago de servicios públicos», «Compra de papelería»)." columnas={[
          { label: 'Concepto', render: (k: any) => <b>{k.nombre}</b> },
          { label: 'Tipo', render: (k: any) => <Badge tone={k.tipo === 'INGRESO' ? 'green' : 'red'}>{k.tipo}</Badge> },
          { label: 'Cuenta', render: (k: any) => `${k.codigocuenta} ${k.nombrecuenta}` },
          { label: 'Reglas', render: (k: any) => [k.exigetercero && 'exige tercero', k.solocontable && 'solo contador'].filter(Boolean).join(' · ') || '—' },
          { label: 'Estado', render: (k: any) => <Badge tone={k.activo ? 'green' : 'gray'}>{k.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: '', render: (k: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...k })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idconceptocaja ? 'Editar concepto de caja' : 'Nuevo concepto de caja'} onClose={() => setForm(null)} ancho={600}>
          <Grid cols={2}>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Tipo" required>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                <option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso (gasto)</option><option value="RETIRO">Retiro</option><option value="DEVOLUCION">Devolución</option>
              </select>
            </Field>
          </Grid>
          <Field label="Cuenta contable de contrapartida" required style={{ marginTop: 12 }}>
            <CuentaSelect value={form.idcuenta} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} />
          </Field>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13 }}>
            <label><input type="checkbox" checked={form.exigetercero} onChange={(e) => setForm({ ...form, exigetercero: e.target.checked })} /> Exige tercero</label>
            <label><input type="checkbox" checked={form.solocontable} onChange={(e) => setForm({ ...form, solocontable: e.target.checked })} /> Solo contador/administrador</label>
            <label><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.nombre.trim() || !form.idcuenta || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function ConfigCajas() {
  const qc = useQueryClient();
  const m = useMensaje();
  const cajas = useQuery({ queryKey: ['cont', 'caja', 'cajas'], queryFn: () => cont.get<any[]>('/caja/cajas') });
  const usuarios = useQuery({ queryKey: ['cont', 'caja', 'usuarios'], queryFn: () => cont.get<any[]>('/caja/usuarios-asignables') });
  const bodegas = useQuery({ queryKey: ['almacen', 'bodegas'], queryFn: async () => (await import('../../../infrastructure/services/almacenApi')).almacenApi.bodegas() });
  const { user } = useAuth();
  const [form, setForm] = useState<any | null>(null);
  const [asignar, setAsignar] = useState<any | null>(null);
  // Caja nueva: siempre del usuario autenticado; código (CAJ-<id>) y nombre (Caja <usuario>) los genera el sistema.
  const yo = (usuarios.data ?? []).find((u) => u.idusuario === user?.idusuario);
  const nombreYo = yo?.nombre ?? [user?.nombre, user?.apellido].filter(Boolean).join(' ');
  const yaTengoCaja = !!yo?.tienecaja;
  const nuevaCaja = () => setForm({ idusuario: user?.idusuario ?? null, idbodega: yo?.idbodega ?? null });
  const guardar = useMutation({
    mutationFn: () => (form.idcaja
      ? cont.put(`/caja/cajas/${form.idcaja}`, form)
      : cont.post('/caja/cajas/empleado', { idbodega: form.idbodega })),
    onSuccess: () => { m.ok('Caja guardada'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'caja'] }); },
    onError: (e) => m.err(e),
  });
  const guardarUsuarios = useMutation({
    mutationFn: () => cont.put(`/caja/cajas/${asignar.idcaja}/usuarios`, { usuarios: asignar.usuarios }),
    onSuccess: () => { m.ok('Usuarios autorizados actualizados'); setAsignar(null); qc.invalidateQueries({ queryKey: ['cont', 'caja'] }); },
    onError: (e) => m.err(e),
  });
  const cajasAlmacenistas = useMutation({
    mutationFn: () => cont.post<{ total: number }>('/caja/cajas/almacenistas'),
    onSuccess: (r) => {
      m.ok(r.total ? `Se crearon ${r.total} caja(s) para almacenistas` : 'Todos los almacenistas ya tienen caja');
      qc.invalidateQueries({ queryKey: ['cont', 'caja'] });
    },
    onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="settings" title="Cajas">
          <Btn variant="secondary" icon="group_add" disabled={cajasAlmacenistas.isPending} onClick={() => cajasAlmacenistas.mutate()}
            title="Crea una caja propia (CAJ-<id>) para cada almacenista activo que no tenga caja">
            {cajasAlmacenistas.isPending ? 'Creando…' : 'Crear cajas para almacenistas'}
          </Btn>
          <Btn icon="add" disabled={yaTengoCaja || !user?.idusuario} onClick={nuevaCaja}
            title={yaTengoCaja ? `Ya tiene su caja (CAJ-${user?.idusuario})` : 'Crear la caja del usuario actual'}>Nueva caja</Btn>
        </CardHeader>
        <Tabla cargando={cajas.isLoading} filas={cajas.data ?? []} clave={(c: any) => c.idcaja} vacio="Crea la primera caja." columnas={[
          { label: 'Caja', render: (c: any) => <><b>{c.codigo}</b> · {c.nombre}{c.nombrebodega && <div style={{ fontSize: 11.5, color: '#64748b' }}>Almacén {c.nombrebodega}</div>}</> },
          { label: 'Cuenta', render: (c: any) => c.codigocuenta ? `${c.codigocuenta} ${c.nombrecuenta}` : '110505 (por defecto)' },
          { label: 'Autorizados', render: (c: any) => (c.usuarios ?? []).map((u: any) => u.nombre).join(', ') || '—' },
          { label: 'Turno', render: (c: any) => c.turnoabierto ? <Badge tone="amber">Abierto · {c.turnoabierto.cajero}</Badge> : <Badge tone="gray">Libre</Badge> },
          { label: 'Estado', render: (c: any) => <Badge tone={c.activa ? 'green' : 'red'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge> },
          { label: 'Acciones', render: (c: any) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...c })} />
              <Btn small variant="ghost" icon="group" title="Usuarios autorizados" onClick={() => setAsignar({ idcaja: c.idcaja, nombre: c.nombre, usuarios: (c.usuarios ?? []).map((u: any) => u.idusuario) })} />
            </div>
          ) },
        ]} />
      </Card>
      <ConceptosCaja />
      {form && (
        <Modal titulo={form.idcaja ? 'Editar caja' : 'Nueva caja'} onClose={() => setForm(null)} ancho={620}>
          <Grid cols={2}>
            <Field label="Código">
              <input readOnly value={form.idcaja ? form.codigo : (form.idusuario ? `CAJ-${form.idusuario}` : '')} placeholder="Automático"
                style={{ ...inputStyle, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }} />
            </Field>
            <Field label="Nombre">
              <input readOnly value={form.idcaja ? form.nombre : `Caja ${nombreYo}`.trim()}
                style={{ ...inputStyle, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }} />
            </Field>
          </Grid>
          <Grid cols={1}>
            <Field label="Punto de almacén (POS)" style={{ marginTop: 12 }}>
              <select value={form.idbodega ?? ''} onChange={(e) => setForm({ ...form, idbodega: e.target.value ? Number(e.target.value) : null })} style={inputStyle}>
                <option value="">— Ninguno (taquilla u otra) —</option>
                {(bodegas.data ?? []).map((b) => <option key={b.idbodega} value={b.idbodega}>{b.nombre}</option>)}
              </select>
            </Field>
          </Grid>
          {form.idcaja && (
            <Field label="Cuenta contable de la caja (subcuenta 1105)" style={{ marginTop: 12 }}>
              <CuentaSelect soloCaja value={form.idcuenta ?? null} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} placeholder="110505 Caja general (por defecto)" />
            </Field>
          )}
          {form.idcaja && (
            <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa</label>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={(!form.idcaja && !form.idusuario) || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {asignar && (
        <Modal titulo={`Usuarios autorizados · ${asignar.nombre}`} onClose={() => setAsignar(null)} ancho={520}>
          <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {(usuarios.data ?? []).map((u) => (
              <label key={u.idusuario} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={asignar.usuarios.includes(u.idusuario)}
                  onChange={(e) => setAsignar({ ...asignar, usuarios: e.target.checked ? [...asignar.usuarios, u.idusuario] : asignar.usuarios.filter((x: number) => x !== u.idusuario) })} />
                {u.nombre} <span style={{ color: '#94a3b8' }}>· {u.rol}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setAsignar(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={guardarUsuarios.isPending} onClick={() => guardarUsuarios.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
