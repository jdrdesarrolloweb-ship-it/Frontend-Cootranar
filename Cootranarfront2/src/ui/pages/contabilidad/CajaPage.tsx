import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, Tabs,
  escHtml, exportarExcel, fecha, imprimirDocumento, inicioMes, hoyCO, inputStyle, money, tablaHtml, useMensaje,
} from './contUi';

const CONTABLES = ['ADMINISTRADOR', 'CONTADOR'];

export const CajaPage = () => {
  const { user } = useAuth();
  const contable = CONTABLES.includes(user?.nombrerol ?? '');
  const [tab, setTab] = useState<'turno' | 'historial' | 'cajas'>('turno');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'turno', label: 'Mi turno', icon: 'point_of_sale' },
        ...(contable ? [{ id: 'historial' as const, label: 'Turnos y movimientos', icon: 'history' }, { id: 'cajas' as const, label: 'Cajas', icon: 'settings' }] : []),
      ]} />
      {tab === 'turno' && <MiTurno contable={contable} />}
      {tab === 'historial' && contable && <Historial />}
      {tab === 'cajas' && contable && <ConfigCajas />}
    </Layout>
  );
};

function imprimirReporte(r: any, titulo: string) {
  const t = r.turno;
  imprimirDocumento(`${titulo} turno ${t.idturno}`, `
    <h1>${titulo} · ${escHtml(t.caja)} (${escHtml(t.codigocaja)})</h1>
    <div class="muted">Turno ${t.idturno} · Cajero: ${escHtml(t.cajero)} · Apertura: ${escHtml(fecha(t.fechaapertura))}${t.fechacierre ? ` · Cierre: ${escHtml(fecha(t.fechacierre))}` : ''}</div>
    <h2>Totales por medio de pago</h2>
    ${tablaHtml([{ t: 'Medio' }, { t: 'Tipo' }, { t: 'Entradas', r: true }, { t: 'Salidas', r: true }, { t: 'Neto', r: true }],
      r.porMedio.map((m: any) => [m.metodopago, m.esefectivo ? 'Efectivo' : 'Electrónico', money(m.entradas), money(m.salidas), money(m.neto)]))}
    <h2>Resumen</h2>
    ${tablaHtml([{ t: 'Concepto' }, { t: 'Valor', r: true }], [
      ['Fondo inicial', money(t.fondoinicial)], ['Ventas (' + r.numeroVentas + ')', money(r.porTipo.VENTA)], ['Ingresos', money(r.porTipo.INGRESO)],
      ['Egresos', money(r.porTipo.EGRESO)], ['Retiros', money(r.porTipo.RETIRO)], ['Devoluciones', money(r.porTipo.DEVOLUCION)],
      ['Total medios electrónicos', money(r.totalElectronico)], ['Efectivo esperado', money(r.efectivoEsperado)],
      ...(t.estado === 'CERRADO' ? [['Efectivo contado', money(t.efectivocontado)], ['Diferencia', money(t.diferencia)]] : []),
    ])}
    <h2>Movimientos</h2>
    ${tablaHtml([{ t: 'Hora' }, { t: 'Tipo' }, { t: 'Concepto' }, { t: 'Medio' }, { t: 'Valor', r: true }],
      r.movimientos.map((m: any) => [fecha(m.fecha), m.tipo, m.concepto, m.metodopago, money(m.valor)]))}
    ${t.observacioncierre ? `<p>Observación de cierre: ${escHtml(t.observacioncierre)}</p>` : ''}
    <p class="muted" style="margin-top:30px">Firma cajero: ______________________ &nbsp;&nbsp; Firma supervisor: ______________________</p>`);
}

function MiTurno({ contable }: { contable: boolean }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const turno = useQuery({ queryKey: ['cont', 'caja', 'turno'], queryFn: () => cont.get('/caja/turno-actual'), refetchInterval: 30_000 });
  const cajas = useQuery({ queryKey: ['cont', 'caja', 'mis-cajas'], queryFn: () => cont.get<any[]>('/caja/mis-cajas') });
  const metodos = useQuery({ queryKey: ['cont', 'caja', 'metodos'], queryFn: () => cont.get<any[]>('/caja/metodos-pago'), staleTime: 300_000 });
  const denoms = useQuery({ queryKey: ['cont', 'caja', 'denominaciones'], queryFn: () => cont.get<number[]>('/caja/denominaciones'), staleTime: Infinity });
  const [apertura, setApertura] = useState({ idcaja: '', fondoinicial: '', observacion: '' });
  const [mov, setMov] = useState<{ tipo: string; concepto: string; valor: string; idmetodopago: string; idcuentacontra: number | null } | null>(null);
  const [arqueo, setArqueo] = useState<{ cierre: boolean } | null>(null);
  const [conteo, setConteo] = useState<Record<string, string>>({});
  const [justificacion, setJustificacion] = useState('');
  const invalidar = () => qc.invalidateQueries({ queryKey: ['cont', 'caja'] });

  const abrir = useMutation({
    mutationFn: () => cont.post('/caja/turnos', { idcaja: Number(apertura.idcaja), fondoinicial: Number(apertura.fondoinicial || 0), observacion: apertura.observacion }),
    onSuccess: () => { m.ok('Turno abierto. Ya puedes registrar ventas y movimientos.'); invalidar(); },
    onError: (e) => m.err(e),
  });
  const r = turno.data;
  const idturno = r?.turno?.idturno;
  const registrar = useMutation({
    mutationFn: () => cont.post(`/caja/turnos/${idturno}/movimientos`, { ...mov, valor: Number(mov?.valor), idmetodopago: Number(mov?.idmetodopago || 1) }),
    onSuccess: () => { m.ok('Movimiento registrado'); setMov(null); invalidar(); },
    onError: (e) => m.err(e),
  });
  const denominaciones = () => Object.fromEntries(Object.entries(conteo).filter(([, v]) => v !== '' && Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  const contado = (denoms.data ?? []).reduce((a, d) => a + d * Number(conteo[d] || 0), 0);
  const arquear = useMutation({
    mutationFn: () => arqueo?.cierre
      ? cont.post(`/caja/turnos/${idturno}/cerrar`, { denominaciones: denominaciones(), justificacion, observacion: justificacion })
      : cont.post(`/caja/turnos/${idturno}/arqueos`, { denominaciones: denominaciones(), justificacion }),
    onSuccess: (x: any) => {
      if (arqueo?.cierre) { m.ok(`Turno cerrado. Diferencia: ${money(x.diferencia)}`); if (x.reporteZ) imprimirReporte(x.reporteZ, 'Reporte Z'); }
      else m.ok(`Arqueo registrado. Diferencia: ${money(x.diferencia)}`);
      setArqueo(null); setConteo({}); setJustificacion(''); invalidar();
    },
    onError: (e) => m.err(e),
  });

  if (turno.isLoading) return <Card style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Cargando…</Card>;

  if (!r) {
    return (
      <>
        <Alerta msg={m.msg} onClose={m.cerrar} />
        <Card>
          <CardHeader icon="lock_open" title="Abrir turno de caja" />
          <div style={{ padding: 20 }}>
            {!cajas.data?.length ? (
              <p style={{ fontSize: 13, color: '#b45309' }}>No tienes cajas asignadas. {contable ? 'Asígnate una en la pestaña «Cajas».' : 'Pide al administrador que te asigne una.'}</p>
            ) : (
              <Grid cols={3}>
                <Field label="Caja" required>
                  <select value={apertura.idcaja} onChange={(e) => setApertura({ ...apertura, idcaja: e.target.value })} style={inputStyle}>
                    <option value="">Seleccionar…</option>
                    {cajas.data.map((c) => <option key={c.idcaja} value={c.idcaja} disabled={c.ocupada}>{c.nombre}{c.sede ? ` · ${c.sede}` : ''}{c.ocupada ? ' (en uso)' : ''}</option>)}
                  </select>
                </Field>
                <Field label="Fondo inicial (base)"><input type="number" min={0} value={apertura.fondoinicial} onChange={(e) => setApertura({ ...apertura, fondoinicial: e.target.value })} style={inputStyle} /></Field>
                <Field label="Observación"><input value={apertura.observacion} onChange={(e) => setApertura({ ...apertura, observacion: e.target.value })} style={inputStyle} /></Field>
              </Grid>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Btn icon="lock_open" disabled={!apertura.idcaja || abrir.isPending} onClick={() => abrir.mutate()}>Abrir turno</Btn>
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
        <Kpi label={`${r.turno.caja} · turno ${r.turno.idturno}`} valor={<span style={{ fontSize: 13 }}>Abierto {fecha(r.turno.fechaapertura)}</span>} />
        <Kpi label="Fondo inicial" valor={money(r.turno.fondoinicial)} />
        <Kpi label={`Ventas (${r.numeroVentas})`} valor={money(r.porTipo.VENTA)} />
        <Kpi label="Efectivo esperado" valor={money(r.efectivoEsperado)} tono="#15803d" />
        <Kpi label="Medios electrónicos" valor={money(r.totalElectronico)} tono="#1d4ed8" />
      </div>
      <Card>
        <CardHeader icon="receipt_long" title="Movimientos del turno">
          <Btn variant="secondary" icon="add" onClick={() => setMov({ tipo: 'INGRESO', concepto: '', valor: '', idmetodopago: '1', idcuentacontra: null })}>Ingreso</Btn>
          {contable && <Btn variant="secondary" icon="remove" onClick={() => setMov({ tipo: 'EGRESO', concepto: '', valor: '', idmetodopago: '1', idcuentacontra: null })}>Egreso / retiro</Btn>}
          <Btn variant="secondary" icon="print" onClick={() => imprimirReporte(r, 'Reporte X')}>Reporte X</Btn>
          <Btn variant="secondary" icon="calculate" onClick={() => setArqueo({ cierre: false })}>Arqueo</Btn>
          <Btn variant="danger" icon="lock" onClick={() => setArqueo({ cierre: true })}>Cerrar turno</Btn>
        </CardHeader>
        <Tabla filas={r.movimientos} clave={(x: any) => x.idmovimiento} vacio="Aún no hay movimientos. Las ventas de contado aparecen aquí automáticamente." columnas={[
          { label: 'Hora', render: (x: any) => fecha(x.fecha) },
          { label: 'Tipo', render: (x: any) => <Badge tone={['VENTA', 'INGRESO'].includes(x.tipo) ? 'green' : 'red'}>{x.tipo}</Badge> },
          { label: 'Concepto', render: (x: any) => <>{x.concepto}{x.referencia && <div style={{ fontSize: 11.5, color: '#64748b' }}>{x.referencia}</div>}</> },
          { label: 'Medio', render: (x: any) => <>{x.metodopago} <Badge tone={x.esefectivo ? 'amber' : 'blue'}>{x.esefectivo ? 'efectivo' : 'electrónico'}</Badge></> },
          { label: 'Valor', align: 'right', render: (x: any) => <b>{money(x.valor)}</b> },
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
            {mov.tipo !== 'INGRESO' && (
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
          <Field label="Concepto" required style={{ marginTop: 12 }}><input value={mov.concepto} onChange={(e) => setMov({ ...mov, concepto: e.target.value })} style={inputStyle} /></Field>
          <Field label="Cuenta contable de contrapartida" required style={{ marginTop: 12 }}>
            <CuentaSelect value={mov.idcuentacontra} onChange={(c) => setMov({ ...mov, idcuentacontra: c?.idcuenta ?? null })} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setMov(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!mov.concepto.trim() || !(Number(mov.valor) > 0) || !mov.idcuentacontra || registrar.isPending} onClick={() => registrar.mutate()}>Registrar</Btn>
          </div>
        </Modal>
      )}

      {arqueo && (
        <Modal titulo={arqueo.cierre ? 'Cierre de turno · arqueo final' : 'Arqueo de caja'} onClose={() => setArqueo(null)} ancho={560}>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>Cuenta el efectivo físico por denominación. Efectivo esperado: <b>{money(r.efectivoEsperado)}</b></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {(denoms.data ?? []).map((d) => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 70, textAlign: 'right', fontWeight: 700 }}>{money(d)}</span>
                <input type="number" min={0} step={1} value={conteo[d] ?? ''} onChange={(e) => setConteo({ ...conteo, [d]: e.target.value })} style={{ ...inputStyle, width: 70 }} aria-label={`Cantidad de ${d}`} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 14 }}>
            <span>Contado: <b>{money(contado)}</b></span>
            <span>Diferencia: <b style={{ color: contado - r.efectivoEsperado === 0 ? '#15803d' : '#b91c1c' }}>{money(contado - r.efectivoEsperado)}</b></span>
          </div>
          <Field label={contado !== r.efectivoEsperado ? 'Justificación de la diferencia *' : 'Observación'} style={{ marginTop: 12 }}>
            <input value={justificacion} onChange={(e) => setJustificacion(e.target.value)} style={inputStyle} />
          </Field>
          {arqueo.cierre && <p style={{ fontSize: 12, color: '#b45309' }}>Al cerrar, el turno queda bloqueado y se genera el reporte Z. Las diferencias se contabilizan como faltante o sobrante.</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setArqueo(null)}>Cancelar</Btn>
            <Btn icon={arqueo.cierre ? 'lock' : 'save'} variant={arqueo.cierre ? 'danger' : 'primary'}
              disabled={arquear.isPending || (contado !== r.efectivoEsperado && arqueo.cierre && !justificacion.trim())} onClick={() => arquear.mutate()}>
              {arqueo.cierre ? 'Cerrar turno' : 'Registrar arqueo'}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Historial() {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [soloDif, setSoloDif] = useState(false);
  const [ver, setVer] = useState<number | null>(null);
  const turnos = useQuery({ queryKey: ['cont', 'caja', 'historial', desde, hasta, soloDif], queryFn: () => cont.get<any[]>('/caja/historial', { desde, hasta, conDiferencia: soloDif ? 'true' : undefined }) });
  const movs = useQuery({ queryKey: ['cont', 'caja', 'movs', desde, hasta], queryFn: () => cont.get<any[]>('/caja/movimientos', { desde, hasta }) });
  const detalle = useQuery({ queryKey: ['cont', 'caja', 'turno', ver], queryFn: () => cont.get(`/caja/turnos/${ver}/reporte`), enabled: !!ver });
  const lista = turnos.data ?? [];
  return (
    <>
      <Card>
        <CardHeader icon="history" title="Turnos (aperturas, cierres, faltantes y sobrantes)">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <label style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={soloDif} onChange={(e) => setSoloDif(e.target.checked)} /> Solo con diferencia</label>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`turnos-caja-${desde}-${hasta}`, [
            { nombre: 'Turnos', filas: lista.map((t) => ({ Turno: t.idturno, Caja: t.caja, Cajero: t.cajero, Apertura: fecha(t.fechaapertura), Cierre: t.fechacierre ? fecha(t.fechacierre) : '',
              Estado: t.estado, Fondo: Number(t.fondoinicial), Esperado: Number(t.efectivoesperado ?? 0), Contado: Number(t.efectivocontado ?? 0), Diferencia: Number(t.diferencia ?? 0) })) },
            { nombre: 'Movimientos', filas: (movs.data ?? []).map((x) => ({ Fecha: fecha(x.fecha), Caja: x.caja, Usuario: x.usuario, Tipo: x.tipo, Concepto: x.concepto, Medio: x.metodopago, Valor: Number(x.valor) })) },
          ])}>Excel</Btn>
        </CardHeader>
        <Tabla filas={lista} clave={(t: any) => t.idturno} onFila={(t: any) => setVer(t.idturno)} vacio="Sin turnos en el período" columnas={[
          { label: 'Turno', render: (t: any) => <b>{t.idturno}</b> },
          { label: 'Caja', render: (t: any) => t.caja },
          { label: 'Cajero', render: (t: any) => t.cajero },
          { label: 'Apertura', render: (t: any) => fecha(t.fechaapertura) },
          { label: 'Cierre', render: (t: any) => (t.fechacierre ? fecha(t.fechacierre) : '—') },
          { label: 'Esperado', align: 'right', render: (t: any) => (t.efectivoesperado !== null ? money(t.efectivoesperado) : '—') },
          { label: 'Contado', align: 'right', render: (t: any) => (t.efectivocontado !== null ? money(t.efectivocontado) : '—') },
          { label: 'Diferencia', align: 'right', render: (t: any) => (t.diferencia !== null ? <b style={{ color: Number(t.diferencia) === 0 ? '#15803d' : '#b91c1c' }}>{money(t.diferencia)}</b> : '—') },
          { label: 'Estado', render: (t: any) => <Badge tone={t.estado === 'ABIERTO' ? 'amber' : 'gray'}>{t.estado}</Badge> },
        ]} />
      </Card>
      {ver && (
        <Modal titulo={`Turno ${ver}`} onClose={() => setVer(null)} ancho={900}>
          {!detalle.data ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Btn icon="print" onClick={() => imprimirReporte(detalle.data, detalle.data.turno.estado === 'CERRADO' ? 'Reporte Z' : 'Reporte X')}>Imprimir {detalle.data.turno.estado === 'CERRADO' ? 'reporte Z' : 'reporte X'}</Btn>
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

function ConfigCajas() {
  const qc = useQueryClient();
  const m = useMensaje();
  const cajas = useQuery({ queryKey: ['cont', 'caja', 'cajas'], queryFn: () => cont.get<any[]>('/caja/cajas') });
  const usuarios = useQuery({ queryKey: ['cont', 'caja', 'usuarios'], queryFn: () => cont.get<any[]>('/caja/usuarios-asignables') });
  const bodegas = useQuery({ queryKey: ['almacen', 'bodegas'], queryFn: async () => (await import('../../../infrastructure/services/almacenApi')).almacenApi.bodegas() });
  const [form, setForm] = useState<any | null>(null);
  const [asignar, setAsignar] = useState<any | null>(null);
  const guardar = useMutation({
    mutationFn: () => (form.idcaja ? cont.put(`/caja/cajas/${form.idcaja}`, form) : cont.post('/caja/cajas', form)),
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
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', sede: '', idbodega: null, idcuenta: null, activa: true })}>Nueva caja</Btn>
        </CardHeader>
        <Tabla cargando={cajas.isLoading} filas={cajas.data ?? []} clave={(c: any) => c.idcaja} vacio="Crea la primera caja." columnas={[
          { label: 'Caja', render: (c: any) => <><b>{c.codigo}</b> · {c.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{c.sede ?? ''}{c.nombrebodega ? ` · Almacén ${c.nombrebodega}` : ''}</div></> },
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
      {form && (
        <Modal titulo={form.idcaja ? 'Editar caja' : 'Nueva caja'} onClose={() => setForm(null)} ancho={620}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Sede / establecimiento"><input value={form.sede ?? ''} onChange={(e) => setForm({ ...form, sede: e.target.value })} style={inputStyle} /></Field>
            <Field label="Punto de almacén (POS)">
              <select value={form.idbodega ?? ''} onChange={(e) => setForm({ ...form, idbodega: e.target.value ? Number(e.target.value) : null })} style={inputStyle}>
                <option value="">— Ninguno (taquilla u otra) —</option>
                {(bodegas.data ?? []).map((b) => <option key={b.idbodega} value={b.idbodega}>{b.nombre}</option>)}
              </select>
            </Field>
          </Grid>
          <Field label="Cuenta contable de la caja (grupo 1105)" style={{ marginTop: 12 }}>
            <CuentaSelect soloCaja value={form.idcuenta} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} />
          </Field>
          <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa</label>
          <p style={{ fontSize: 12, color: '#64748b' }}>Si la caja se asocia a un punto de almacén, el punto de venta exigirá turno abierto para cobrar de contado.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
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
