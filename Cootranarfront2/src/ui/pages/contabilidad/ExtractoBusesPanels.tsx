import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cont, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, TerceroPicker, Valor,
  exportarExcel, hoyCO, inicioMes, inputStyle, money, pedirMotivo, useMensaje,
} from './contUi';

/**
 * Novedades del extracto de los buses:
 *  - Cargos y abonos al socio (combustible, conduces, taller, anticipos, almacén, nómina…), con cuotas.
 *  - Expresos (VH10), traslados de recaudo entre buses y producido por agencia.
 */

const errTxt = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Ocurrió un error';
const CONTRAPARTIDAS: Record<string, string> = {
  PROVEEDOR: 'Factura de proveedor (la cooperativa la paga)', CUENTA: 'Cuenta contable fija', CAJA: 'Efectivo de mi turno de caja', CARTERA: 'Cartera del almacén',
};

type Bus = { idvehiculo: number; numeromovil: string; placa: string; propietario: string; documentopropietario: string; espropio: boolean };

/** Número de bus o placa → placa, propietario y cédula (como en la digitación de facturas). */
export function BusPicker({ value, onChange, soloSocios = true, autoFocus }: { value: Bus | null; onChange: (b: Bus | null) => void; soloSocios?: boolean; autoFocus?: boolean }) {
  const [texto, setTexto] = useState('');
  const [deb, setDeb] = useState('');
  useEffect(() => { const t = setTimeout(() => setDeb(texto.trim()), 200); return () => clearTimeout(t); }, [texto]);
  const q = useQuery({ queryKey: ['cont', 'buscar-bus', deb], queryFn: () => cont.get<Bus[]>('/transporte/buscar-vehiculo', { q: deb }), enabled: deb.length >= 1 });
  const opciones = (q.data ?? []).filter((b) => !soloSocios || !b.espropio);
  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...inputStyle, padding: '6px 10px' }}>
        <span style={{ flex: 1, fontSize: 12.5 }}><b>Móvil {value.numeromovil}</b> · {value.placa} · {value.propietario?.trim()} ({value.documentopropietario})</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Quitar bus" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <input autoFocus={autoFocus} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="N.º de bus o placa…" style={inputStyle} aria-label="Bus"
        onKeyDown={(e) => { if (e.key === 'Enter' && opciones[0]) { e.preventDefault(); onChange(opciones[0]); setTexto(''); } }} />
      {deb && (
        <div style={{ position: 'absolute', zIndex: 40, top: '100%', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
          {opciones.map((b) => (
            <button key={b.idvehiculo} type="button" onClick={() => { onChange(b); setTexto(''); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>
              <b>{b.numeromovil}</b> · {b.placa} · {b.propietario?.trim()} <span style={{ color: '#94a3b8' }}>{b.documentopropietario}</span>
            </button>
          ))}
          {q.data && !opciones.length && <div style={{ padding: 10, fontSize: 12.5, color: '#94a3b8' }}>{soloSocios ? 'Ningún bus de socio coincide' : 'Sin coincidencias'}</div>}
        </div>
      )}
    </div>
  );
}

function PagoFields({ f, setF }: { f: any; setF: (x: any) => void }) {
  const bancos = useQuery({ queryKey: ['cont', 'caja', 'bancos'], queryFn: () => cont.get<any[]>('/caja/cuentas-bancarias') });
  return (
    <>
      <Field label="Medio" required>
        <select value={f.medio} onChange={(e) => setF({ ...f, medio: e.target.value })} style={inputStyle}>
          <option value="BANCO">Transferencia / cheque</option><option value="CAJA">Efectivo (mi turno de caja)</option>
        </select>
      </Field>
      {f.medio === 'BANCO' && (
        <Field label="Cuenta bancaria" required>
          <select value={f.idcuentabancaria} onChange={(e) => setF({ ...f, idcuentabancaria: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar…</option>
            {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
          </select>
        </Field>
      )}
      <Field label="Referencia" required={f.medio === 'BANCO'}><input value={f.referencia ?? ''} onChange={(e) => setF({ ...f, referencia: e.target.value })} style={inputStyle} /></Field>
    </>
  );
}

// ── Cargos y abonos al socio ────────────────────────────────────────────────
export function CargosSocio() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState<any | null>(null);
  const [lote, setLote] = useState(false);
  const [nomina, setNomina] = useState(false);
  const [pago, setPago] = useState<any | null>(null);
  const q = useQuery({ queryKey: ['cont', 'cargos', desde, hasta], queryFn: () => cont.get<any[]>('/transporte/cargos', { desde, hasta }) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/transporte/cargos/${id}/anular`, { motivo }),
    onSuccess: () => { m.ok('Cargo anulado'); inv(); }, onError: (e) => m.err(e),
  });
  const t = filtro.trim().toLowerCase();
  const filas = (q.data ?? []).filter((x) => !t || `${x.numeromovil} ${x.placa} ${x.propietario} ${x.concepto} ${x.documento ?? ''} ${x.terceroorigen ?? ''}`.toLowerCase().includes(t));
  const activos = filas.filter((x) => x.estado === 'ACTIVO');
  const signo = (x: any) => (x.naturaleza === 'ABONO' ? -1 : 1) * Number(x.valor);
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Cargos del período" valor={money(activos.filter((x) => x.naturaleza === 'CARGO').reduce((a, x) => a + Number(x.valor), 0))} />
        <Kpi label="Notas crédito / abonos" valor={money(activos.filter((x) => x.naturaleza === 'ABONO').reduce((a, x) => a + Number(x.valor), 0))} tono="#15803d" />
        <Kpi label="Por pagar a proveedores" valor={money(activos.reduce((a, x) => a + Number(x.saldoproveedor), 0))} tono="#b45309" />
      </div>
      <Card>
        <CardHeader icon="receipt_long" title="Cargos y abonos al socio (se descuentan en el extracto del bus)">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <input placeholder="Buscar móvil, socio, factura…" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, width: 220, padding: '7px 10px' }} />
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`cargos-${desde}-${hasta}`, [{ nombre: 'Cargos', filas: filas.map((x) => ({
            N: x.idcargo, Fecha: String(x.fecha).slice(0, 10), Movil: x.numeromovil, Placa: x.placa, Socio: x.propietario, Concepto: x.concepto, Tipo: x.naturaleza,
            Documento: x.documento ?? '', CUFE: x.cufe ?? '', Proveedor: x.terceroorigen ?? '', Valor: signo(x), Cuotas: x.cuotas, Descontadas: x.cuotasdescontadas,
            PorPagarProveedor: Number(x.saldoproveedor), Estado: x.estado, Comprobante: x.comprobante })) }])}>Excel</Btn>
          <Btn variant="secondary" icon="badge" onClick={() => setNomina(true)}>Cargar nómina</Btn>
          <Btn variant="secondary" icon="local_gas_station" onClick={() => setLote(true)}>Digitación rápida</Btn>
          <Btn icon="add" onClick={() => setForm({ naturaleza: 'CARGO', fecha: hoyCO(), cuotas: 1 })}>Nuevo cargo</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={filas} clave={(x: any) => x.idcargo} vacio="Sin cargos en el período" columnas={[
          { label: 'Fecha', render: (x: any) => String(x.fecha).slice(0, 10) },
          { label: 'Móvil', render: (x: any) => <><b>{x.numeromovil}</b> · {x.placa}<div style={{ fontSize: 11.5, color: '#64748b' }}>{x.propietario}</div></> },
          { label: 'Concepto', render: (x: any) => <>{x.naturaleza === 'ABONO' && <Badge tone="green">Nota crédito</Badge>} {x.concepto}<div style={{ fontSize: 11.5, color: '#64748b' }}>{x.descripcion ?? ''}</div></> },
          { label: 'Documento', render: (x: any) => <>{x.documento ?? '—'}<div style={{ fontSize: 11.5, color: '#64748b' }}>{x.terceroorigen ?? ''}</div></> },
          { label: 'Valor', align: 'right', render: (x: any) => <Valor v={signo(x)} fuerte /> },
          { label: 'Cuotas', align: 'right', render: (x: any) => (x.cuotas > 1 ? `${x.cuotasdescontadas}/${x.cuotas}` : x.cuotasdescontadas ? 'Descontado' : 'Pendiente') },
          { label: 'Proveedor', align: 'right', render: (x: any) => (x.contrapartida === 'PROVEEDOR' && x.naturaleza === 'CARGO' ? (Number(x.saldoproveedor) > 0 ? <Valor v={x.saldoproveedor} /> : <Badge tone="green">Pagado</Badge>) : '—') },
          { label: 'Estado', render: (x: any) => <Badge tone={x.estado === 'ACTIVO' ? 'blue' : 'gray'}>{x.estado}</Badge> },
          { label: '', render: (x: any) => x.estado === 'ACTIVO' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {Number(x.saldoproveedor) > 0 && <Btn small variant="secondary" icon="payments" onClick={() => setPago({ ...x, medio: 'BANCO', idcuentabancaria: '', referencia: '', fecha: hoyCO(), valor: Number(x.saldoproveedor) })}>Pagar</Btn>}
              {x.naturaleza === 'CARGO' && <Btn small variant="ghost" icon="undo" title="Nota crédito / devolución" onClick={() => setForm({
                naturaleza: 'ABONO', fecha: hoyCO(), cuotas: 1, idcargorelacionado: x.idcargo, idconcepto: x.idconcepto, idterceroorigen: x.idterceroorigen,
                bus: { idvehiculo: x.idvehiculo, numeromovil: x.numeromovil, placa: x.placa, propietario: x.propietario, documentopropietario: '' },
                descripcion: `Nota crédito de ${x.documento ?? `cargo ${x.idcargo}`}`,
              })} />}
              {!x.cuotasdescontadas && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const motivo = pedirMotivo('anular el cargo'); if (motivo) anular.mutate({ id: x.idcargo, motivo }); }} />}
            </div>
          ) },
        ]} />
      </Card>
      {form && <CargoForm inicial={form} onClose={() => setForm(null)} onOk={(r) => { m.ok(`${r.naturaleza === 'ABONO' ? 'Nota crédito' : 'Cargo'} ${r.idcargo} registrado (${r.comprobante})`); setForm(null); inv(); }} />}
      {lote && <LoteCargos onClose={() => setLote(false)} onOk={(r) => { m.ok(`${r.registrados} factura(s) registradas por ${money(r.total)}`); setLote(false); inv(); }} />}
      {nomina && <CargarNomina onClose={() => setNomina(false)} onOk={() => inv()} />}
      {pago && <PagarProveedor g={pago} onClose={() => setPago(null)} onOk={() => { m.ok('Pago al proveedor registrado'); setPago(null); inv(); }} />}
    </>
  );
}

function useConceptosCargo() {
  return useQuery({ queryKey: ['cont', 'transp', 'conceptos-cargo'], queryFn: () => cont.get<any[]>('/transporte/conceptos-cargo') });
}

function CargoForm({ inicial, onClose, onOk }: { inicial: any; onClose: () => void; onOk: (r: any) => void }) {
  const [f, setF] = useState<any>(inicial);
  const [prov, setProv] = useState<Tercero | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const conceptos = useConceptosCargo();
  const k = (conceptos.data ?? []).find((c) => c.idconcepto === Number(f.idconcepto));
  const esNota = !!f.idcargorelacionado;
  const guardar = useMutation({
    mutationFn: () => cont.post('/transporte/cargos', {
      idvehiculo: f.bus?.idvehiculo, idconcepto: Number(f.idconcepto), naturaleza: f.naturaleza, fecha: f.fecha, documento: f.documento, cufe: f.cufe,
      idterceroorigen: prov?.idtercero ?? f.idterceroorigen, valor: Number(f.valor), cuotas: Number(f.cuotas || 1),
      fechaprimeracuota: f.fechaprimeracuota || undefined, descripcion: f.descripcion, idcargorelacionado: f.idcargorelacionado,
    }),
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  const faltaProv = k?.contrapartida === 'PROVEEDOR' && !prov && !f.idterceroorigen;
  return (
    <Modal titulo={esNota ? `Nota crédito del cargo ${f.idcargorelacionado}` : f.naturaleza === 'ABONO' ? 'Nuevo abono al socio' : 'Nuevo cargo al socio'} onClose={onClose} ancho={760}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <Grid cols={2}>
        <Field label="Bus" required>{esNota ? <div style={{ ...inputStyle, padding: '8px 10px' }}>Móvil {f.bus?.numeromovil} · {f.bus?.placa}</div> : <BusPicker value={f.bus ?? null} onChange={(b) => setF({ ...f, bus: b })} autoFocus />}</Field>
        <Field label="Concepto" required>
          <select value={f.idconcepto ?? ''} disabled={esNota} onChange={(e) => setF({ ...f, idconcepto: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar…</option>
            {(conceptos.data ?? []).filter((c) => c.activo).map((c) => <option key={c.idconcepto} value={c.idconcepto}>{c.nombre}</option>)}
          </select>
        </Field>
        {!esNota && (
          <Field label="Tipo" required>
            <select value={f.naturaleza} onChange={(e) => setF({ ...f, naturaleza: e.target.value })} style={inputStyle}>
              <option value="CARGO">Cargo (se le descuenta al socio)</option><option value="ABONO">Abono (se le reconoce al socio)</option>
            </select>
          </Field>
        )}
        <Field label="Fecha" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
        {k?.contrapartida === 'PROVEEDOR' && !esNota && <Field label="Proveedor (quien factura)" required><TerceroPicker value={prov} onChange={setProv} /></Field>}
        <Field label="N.º de factura / documento"><input value={f.documento ?? ''} onChange={(e) => setF({ ...f, documento: e.target.value })} style={inputStyle} /></Field>
        <Field label="CUFE (factura electrónica)"><input value={f.cufe ?? ''} onChange={(e) => setF({ ...f, cufe: e.target.value })} style={inputStyle} /></Field>
        <Field label="Valor" required><input type="number" min={0} value={f.valor ?? ''} onChange={(e) => setF({ ...f, valor: e.target.value })} style={inputStyle} /></Field>
        <Field label="Cuotas (diferido)"><input type="number" min={1} max={60} value={f.cuotas} onChange={(e) => setF({ ...f, cuotas: e.target.value })} style={inputStyle} /></Field>
        {Number(f.cuotas) > 1 && <Field label="Primera cuota se descuenta desde"><input type="date" value={f.fechaprimeracuota ?? f.fecha} onChange={(e) => setF({ ...f, fechaprimeracuota: e.target.value })} style={inputStyle} /></Field>}
      </Grid>
      <Field label="Descripción" style={{ marginTop: 12 }}><input value={f.descripcion ?? ''} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Galones, repuesto, ruta del anticipo…" style={inputStyle} /></Field>
      {k && <p style={{ fontSize: 12, color: '#64748b' }}>Contrapartida: <b>{CONTRAPARTIDAS[k.contrapartida]}</b>{k.contrapartida === 'CAJA' ? ' — sale del efectivo de su turno abierto.' : ''}{k.contrapartida === 'CARTERA' ? ' — la deuda del socio en el almacén pasa al extracto del bus.' : ''}</p>}
      {Number(f.cuotas) > 1 && Number(f.valor) > 0 && <p style={{ fontSize: 12, color: '#64748b' }}>Se descontará {money(Number(f.valor) / Number(f.cuotas))} aprox. en cada una de las {f.cuotas} liquidaciones mensuales.</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="check" disabled={!f.bus || !f.idconcepto || !(Number(f.valor) > 0) || faltaProv || guardar.isPending} onClick={() => guardar.mutate()}>Registrar</Btn>
      </div>
    </Modal>
  );
}

/** Digitación rápida de facturas del día (combustible, conduces…): bus → placa y propietario automáticos. */
function LoteCargos({ onClose, onOk }: { onClose: () => void; onOk: (r: any) => void }) {
  const conceptos = useConceptosCargo();
  const [elegido, setIdconcepto] = useState<string>('');
  const [prov, setProv] = useState<Tercero | null>(null);
  const [fecha, setFecha] = useState(hoyCO());
  const [filas, setFilas] = useState<any[]>([{ bus: null, documento: '', valor: '', descripcion: '' }]);
  const [err, setErr] = useState<string | null>(null);
  // Por defecto: combustible (la digitación diaria de facturas de la estación).
  const idconcepto = elegido || String((conceptos.data ?? []).find((c) => c.codigo === 'COMBUSTIBLE')?.idconcepto ?? conceptos.data?.[0]?.idconcepto ?? '');
  const k = (conceptos.data ?? []).find((c) => c.idconcepto === Number(idconcepto));
  const validas = filas.filter((x) => x.bus && Number(x.valor) > 0);
  const guardar = useMutation({
    mutationFn: () => cont.post('/transporte/cargos/lote', {
      comunes: { idconcepto: Number(idconcepto), fecha, idterceroorigen: prov?.idtercero, naturaleza: 'CARGO' },
      cargos: validas.map((x) => ({ idvehiculo: x.bus.idvehiculo, documento: x.documento || undefined, valor: Number(x.valor), descripcion: x.descripcion || undefined })),
    }),
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  const set = (i: number, cambio: any) => setFilas(filas.map((x, k2) => (k2 === i ? { ...x, ...cambio } : x)));
  return (
    <Modal titulo="Digitación rápida de facturas" onClose={onClose} ancho={980}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <Grid cols={3}>
        <Field label="Concepto" required>
          <select value={idconcepto} onChange={(e) => setIdconcepto(e.target.value)} style={inputStyle}>
            {(conceptos.data ?? []).filter((c) => c.activo && c.contrapartida !== 'CAJA' && c.contrapartida !== 'CARTERA').map((c) => <option key={c.idconcepto} value={c.idconcepto}>{c.nombre}</option>)}
          </select>
        </Field>
        {k?.contrapartida === 'PROVEEDOR' && <Field label="Proveedor (estación, terminal…)" required><TerceroPicker value={prov} onChange={setProv} /></Field>}
        <Field label="Fecha" required><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} /></Field>
      </Grid>
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.1fr 1fr 1.6fr auto', gap: 8, margin: '14px 0 4px', fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>
        <span>BUS (n.º o placa + Enter)</span><span>FACTURA</span><span>VALOR</span><span>DETALLE (galones…)</span><span />
      </div>
      {filas.map((x, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.1fr 1fr 1.6fr auto', gap: 8, marginBottom: 6 }}>
          <BusPicker value={x.bus} onChange={(b) => set(i, { bus: b })} autoFocus={i === filas.length - 1 && i > 0} />
          <input value={x.documento} onChange={(e) => set(i, { documento: e.target.value })} style={inputStyle} aria-label="Factura" />
          <input type="number" min={0} value={x.valor} onChange={(e) => set(i, { valor: e.target.value })} style={inputStyle} aria-label="Valor"
            onKeyDown={(e) => { if (e.key === 'Enter' && i === filas.length - 1) setFilas([...filas, { bus: null, documento: '', valor: '', descripcion: '' }]); }} />
          <input value={x.descripcion} onChange={(e) => set(i, { descripcion: e.target.value })} style={inputStyle} aria-label="Detalle" />
          <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setFilas(filas.length > 1 ? filas.filter((_, k2) => k2 !== i) : filas)} />
        </div>
      ))}
      <Btn small variant="secondary" icon="add" onClick={() => setFilas([...filas, { bus: null, documento: '', valor: '', descripcion: '' }])}>Agregar fila</Btn>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <span style={{ fontSize: 13 }}>{validas.length} factura(s) · total <b>{money(validas.reduce((a, x) => a + Number(x.valor), 0))}</b></span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn icon="check" disabled={!validas.length || (k?.contrapartida === 'PROVEEDOR' && !prov) || guardar.isPending} onClick={() => guardar.mutate()}>Registrar todas</Btn>
        </div>
      </div>
    </Modal>
  );
}

function CargarNomina({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const nominas = useQuery({ queryKey: ['cont', 'nominas'], queryFn: () => cont.get<any[]>('/nominas') });
  const [id, setId] = useState('');
  const [res, setRes] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const cargar = useMutation({ mutationFn: () => cont.post(`/transporte/nomina/${id}/cargar`, {}), onSuccess: (r) => { setRes(r); onOk(); }, onError: (e) => setErr(errTxt(e)) });
  return (
    <Modal titulo="Cargar la nómina de conductores a los socios" onClose={onClose} ancho={720}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>El socio es el patrono del conductor y la cooperativa es intermediaria: a cada socio se le carga el costo total de su conductor (salario, auxilio de transporte, aportes de salud, pensión, ARL, parafiscales y provisión de prestaciones). El conductor se toma de la asignación vigente del bus.</p>
      <Field label="Nómina causada" required>
        <select value={id} onChange={(e) => setId(e.target.value)} style={inputStyle}>
          <option value="">Seleccionar…</option>
          {(nominas.data ?? []).filter((n) => n.estado === 'CAUSADA').map((n) => <option key={n.idnomina} value={n.idnomina}>{n.anio}-{String(n.mes).padStart(2, '0')} · {n.descripcion} · {n.empleados} empleados</option>)}
        </select>
      </Field>
      {res && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <b>{res.cargados.length}</b> conductor(es) cargados por {money(res.total)}.
          {res.cargados.map((c: any) => <div key={c.idcargo}>· {c.empleado} → móvil {c.movil}: {money(c.valor)}</div>)}
          {!!res.omitidos.length && <div style={{ marginTop: 8, color: '#b45309' }}>Omitidos: {res.omitidos.map((o: any) => `${o.empleado} (${o.motivo})`).join('; ')}</div>}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>{res ? 'Cerrar' : 'Cancelar'}</Btn>
        {!res && <Btn icon="check" disabled={!id || cargar.isPending} onClick={() => cargar.mutate()}>Cargar a los socios</Btn>}
      </div>
    </Modal>
  );
}

function PagarProveedor({ g, onClose, onOk }: { g: any; onClose: () => void; onOk: () => void }) {
  const [f, setF] = useState<any>(g);
  const [err, setErr] = useState<string | null>(null);
  const pagar = useMutation({
    mutationFn: () => cont.post(`/transporte/cargos/${g.idcargo}/pagar-proveedor`, {
      medio: f.medio, idcuentabancaria: f.medio === 'BANCO' ? Number(f.idcuentabancaria) : undefined, referencia: f.referencia, fecha: f.fecha, valor: Number(f.valor),
    }),
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  return (
    <Modal titulo={`Pagar factura ${g.documento ?? g.idcargo} a ${g.terceroorigen ?? 'proveedor'}`} onClose={onClose} ancho={560}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <p style={{ fontSize: 13, marginTop: 0 }}>{g.concepto} · móvil {g.numeromovil} · saldo {money(g.saldoproveedor)}</p>
      <Grid cols={2}>
        <PagoFields f={f} setF={setF} />
        <Field label="Fecha" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
        <Field label="Valor" required><input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="payments" disabled={pagar.isPending || !(Number(f.valor) > 0) || (f.medio === 'BANCO' && (!f.idcuentabancaria || !f.referencia))} onClick={() => pagar.mutate()}>Registrar pago</Btn>
      </div>
    </Modal>
  );
}

// ── Expresos ────────────────────────────────────────────────────────────────
export function Expresos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [form, setForm] = useState<any | null>(null);
  const q = useQuery({ queryKey: ['cont', 'expresos', desde, hasta], queryFn: () => cont.get<any[]>('/transporte/expresos', { desde, hasta }) });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/transporte/expresos/${id}/anular`, { motivo }),
    onSuccess: () => { m.ok('Expreso anulado'); qc.invalidateQueries({ queryKey: ['cont'] }); }, onError: (e) => m.err(e),
  });
  const filas = q.data ?? [];
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="airport_shuttle" title="Expresos (VH10): servicios especiales contratados">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn icon="add" onClick={() => setForm({ fecha: hoyCO(), fechaservicio: hoyCO(), formapago: 'CREDITO', pasajeros: '', medio: 'BANCO' })}>Nuevo expreso</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>En un bus de socio el expreso es recaudo para el propietario: en su extracto se le descuenta el seguro por pasajero ($500) y el 10 % de administración sobre el valor neto del seguro, además de los fondos.</p>
        <Tabla cargando={q.isLoading} filas={filas} clave={(x: any) => x.idexpreso} vacio="Sin expresos en el período" columnas={[
          { label: 'N.º', render: (x: any) => <b>{x.numero}</b> },
          { label: 'Servicio', render: (x: any) => <>{String(x.fechaservicio).slice(0, 10)} · {x.origen} → {x.destino}<div style={{ fontSize: 11.5, color: '#64748b' }}>{x.contrato ?? ''}</div></> },
          { label: 'Móvil', render: (x: any) => <>{x.numeromovil} · {x.placa}</> },
          { label: 'Cliente', render: (x: any) => x.cliente },
          { label: 'Pasajeros', align: 'right', render: (x: any) => x.pasajeros },
          { label: 'Valor', align: 'right', render: (x: any) => <Valor v={x.valor} fuerte /> },
          { label: 'Pago', render: (x: any) => x.formapago },
          { label: 'Estado', render: (x: any) => <Badge tone={x.estado === 'ANULADO' ? 'gray' : x.liquidado ? 'green' : 'amber'}>{x.estado === 'ANULADO' ? 'Anulado' : x.liquidado ? 'Liquidado' : 'Por liquidar'}</Badge> },
          { label: '', render: (x: any) => x.estado === 'ACTIVO' && !x.liquidado && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const motivo = pedirMotivo('anular el expreso'); if (motivo) anular.mutate({ id: x.idexpreso, motivo }); }} /> },
        ]} />
      </Card>
      {form && <ExpresoForm inicial={form} onClose={() => setForm(null)} onOk={(r) => { m.ok(`Expreso ${r.numero} registrado (${r.comprobante})`); setForm(null); qc.invalidateQueries({ queryKey: ['cont'] }); }} />}
    </>
  );
}

function ExpresoForm({ inicial, onClose, onOk }: { inicial: any; onClose: () => void; onOk: (r: any) => void }) {
  const [f, setF] = useState<any>(inicial);
  const [cliente, setCliente] = useState<Tercero | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bancos = useQuery({ queryKey: ['cont', 'caja', 'bancos'], queryFn: () => cont.get<any[]>('/caja/cuentas-bancarias') });
  const guardar = useMutation({
    mutationFn: () => cont.post('/transporte/expresos', {
      idvehiculo: f.bus?.idvehiculo, idtercerocliente: cliente?.idtercero, fecha: f.fecha, fechaservicio: f.fechaservicio, origen: f.origen, destino: f.destino,
      pasajeros: Number(f.pasajeros || 0), valor: Number(f.valor), formapago: f.formapago, idcuentabancaria: f.formapago === 'BANCO' ? Number(f.idcuentabancaria) : undefined,
      referencia: f.referencia, contrato: f.contrato, numerofactura: f.numerofactura, observacion: f.observacion,
    }),
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  const seguro = Number(f.pasajeros || 0) * 500;
  return (
    <Modal titulo="Nuevo expreso" onClose={onClose} ancho={800}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <Grid cols={2}>
        <Field label="Bus" required><BusPicker value={f.bus ?? null} onChange={(b) => setF({ ...f, bus: b })} soloSocios={false} autoFocus /></Field>
        <Field label="Cliente (contratante)" required><TerceroPicker value={cliente} onChange={setCliente} /></Field>
        <Field label="Fecha del servicio" required><input type="date" value={f.fechaservicio} onChange={(e) => setF({ ...f, fechaservicio: e.target.value })} style={inputStyle} /></Field>
        <Field label="Fecha contable" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
        <Field label="Origen" required><input value={f.origen ?? ''} onChange={(e) => setF({ ...f, origen: e.target.value })} style={inputStyle} /></Field>
        <Field label="Destino" required><input value={f.destino ?? ''} onChange={(e) => setF({ ...f, destino: e.target.value })} style={inputStyle} /></Field>
        <Field label="Pasajeros" required><input type="number" min={0} value={f.pasajeros} onChange={(e) => setF({ ...f, pasajeros: e.target.value })} style={inputStyle} /></Field>
        <Field label="Valor del contrato" required><input type="number" min={0} value={f.valor ?? ''} onChange={(e) => setF({ ...f, valor: e.target.value })} style={inputStyle} /></Field>
        <Field label="Forma de pago" required>
          <select value={f.formapago} onChange={(e) => setF({ ...f, formapago: e.target.value })} style={inputStyle}>
            <option value="CREDITO">Crédito (cuenta por cobrar al cliente)</option><option value="BANCO">Transferencia / consignación</option><option value="CAJA">Efectivo (mi turno de caja)</option>
          </select>
        </Field>
        {f.formapago === 'BANCO' && (
          <Field label="Cuenta bancaria" required>
            <select value={f.idcuentabancaria ?? ''} onChange={(e) => setF({ ...f, idcuentabancaria: e.target.value })} style={inputStyle}>
              <option value="">Seleccionar…</option>
              {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
            </select>
          </Field>
        )}
        {f.formapago === 'BANCO' && <Field label="Referencia" required><input value={f.referencia ?? ''} onChange={(e) => setF({ ...f, referencia: e.target.value })} style={inputStyle} /></Field>}
        <Field label="Contrato / FUEC"><input value={f.contrato ?? ''} onChange={(e) => setF({ ...f, contrato: e.target.value })} style={inputStyle} /></Field>
        <Field label="Factura electrónica n.º"><input value={f.numerofactura ?? ''} onChange={(e) => setF({ ...f, numerofactura: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      <Field label="Observación" style={{ marginTop: 12 }}><input value={f.observacion ?? ''} onChange={(e) => setF({ ...f, observacion: e.target.value })} style={inputStyle} /></Field>
      {f.bus && !f.bus.espropio && Number(f.valor) > 0 && (
        <p style={{ fontSize: 12.5, color: '#64748b' }}>En el extracto del socio: seguro {money(seguro)} · administración 10 % de {money(Number(f.valor) - seguro)} = {money((Number(f.valor) - seguro) * 0.1)} (más fondos según la configuración).</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="check" disabled={!f.bus || !cliente || !f.origen || !f.destino || !(Number(f.valor) > 0) || (f.formapago === 'BANCO' && (!f.idcuentabancaria || !f.referencia)) || guardar.isPending} onClick={() => guardar.mutate()}>Registrar expreso</Btn>
      </div>
    </Modal>
  );
}

// ── Traslados de recaudo ────────────────────────────────────────────────────
export function Traslados() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [form, setForm] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['cont', 'traslados', desde, hasta], queryFn: () => cont.get<any[]>('/transporte/traslados', { desde, hasta }) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const guardar = useMutation({
    mutationFn: () => cont.post('/transporte/traslados', {
      idvehiculoorigen: form.origen?.idvehiculo, idvehiculodestino: form.destino?.idvehiculo, fuente: form.fuente, fecha: form.fecha,
      valor: Number(form.valor), pasajeros: Number(form.pasajeros || 0), motivo: form.motivo,
    }),
    onSuccess: (r: any) => { m.ok(`Traslado registrado (${r.comprobante})`); setForm(null); inv(); }, onError: (e) => setErr(errTxt(e)),
  });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/transporte/traslados/${id}/anular`, { motivo }),
    onSuccess: () => { m.ok('Traslado anulado'); inv(); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="swap_horiz" title="Traslados de recaudo entre buses">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn icon="add" onClick={() => { setErr(null); setForm({ fuente: 'PASAJES', fecha: hoyCO(), origen: null, destino: null, valor: '', pasajeros: '', motivo: '' }); }}>Nuevo traslado</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Cuando un bus se vara y otro hace el viaje, el recaudo vendido pasa al bus que viajó. Registre el valor <b>bruto</b> y los pasajeros: en la liquidación de cada bus se descuentan el seguro y la administración.</p>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(x: any) => x.idtraslado} vacio="Sin traslados en el período" columnas={[
          { label: 'Fecha', render: (x: any) => String(x.fecha).slice(0, 10) },
          { label: 'De', render: (x: any) => <>{x.movilorigen} · {x.placaorigen}</> },
          { label: 'A', render: (x: any) => <>{x.movildestino} · {x.placadestino}</> },
          { label: 'Fuente', render: (x: any) => (x.fuente === 'PASAJES' ? 'Pasajes' : 'Expreso') },
          { label: 'Pasajeros', align: 'right', render: (x: any) => x.pasajeros },
          { label: 'Valor', align: 'right', render: (x: any) => <Valor v={x.valor} fuerte /> },
          { label: 'Motivo', render: (x: any) => x.motivo },
          { label: 'Estado', render: (x: any) => <Badge tone={x.estado === 'ACTIVO' ? 'blue' : 'gray'}>{x.estado}</Badge> },
          { label: '', render: (x: any) => x.estado === 'ACTIVO' && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const motivo = pedirMotivo('anular el traslado'); if (motivo) anular.mutate({ id: x.idtraslado, motivo }); }} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo="Nuevo traslado de recaudo" onClose={() => setForm(null)} ancho={760}>
          {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
          <Grid cols={2}>
            <Field label="Bus que vendió (se le descuenta)" required><BusPicker value={form.origen} onChange={(b) => setForm({ ...form, origen: b })} soloSocios={false} autoFocus /></Field>
            <Field label="Bus que hizo el viaje (se le abona)" required><BusPicker value={form.destino} onChange={(b) => setForm({ ...form, destino: b })} soloSocios={false} /></Field>
            <Field label="Fuente" required>
              <select value={form.fuente} onChange={(e) => setForm({ ...form, fuente: e.target.value })} style={inputStyle}><option value="PASAJES">Pasajes (VH01)</option><option value="EXPRESOS">Expreso (VH10)</option></select>
            </Field>
            <Field label="Fecha" required><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={inputStyle} /></Field>
            <Field label="Valor bruto" required><input type="number" min={0} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={inputStyle} /></Field>
            <Field label="Pasajeros" required><input type="number" min={0} value={form.pasajeros} onChange={(e) => setForm({ ...form, pasajeros: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <Field label="Motivo" required style={{ marginTop: 12 }}><input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Bus varado en…" style={inputStyle} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="check" disabled={!form.origen || !form.destino || !(Number(form.valor) > 0) || !form.motivo || guardar.isPending} onClick={() => guardar.mutate()}>Registrar traslado</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Producido por agencia ───────────────────────────────────────────────────
export function ProducidoAgencias() {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const q = useQuery({ queryKey: ['cont', 'producido-agencias', desde, hasta], queryFn: () => cont.get<any>('/transporte/producido-agencias', { desde, hasta }) });
  const filas: any[] = q.data?.agencias ?? [];
  const conceptos: any[] = q.data?.conceptos ?? [];
  const desc = (a: any, codigo: string) => a.descuentos.find((d: any) => d.codigo === codigo)?.valor ?? 0;
  const tot = (k: string) => filas.reduce((s, a) => s + Number(a[k]), 0);
  return (
    <Card>
      <CardHeader icon="storefront" title="Producido de pasajes por agencia (cuota de administración)">
        <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Btn variant="secondary" icon="download" onClick={() => exportarExcel(`producido-agencias-${desde}-${hasta}`, [{ nombre: 'Agencias', filas: filas.map((a) => ({
          Agencia: a.agencia, 'Pasajeros socios': a.pasajerossocios, 'Pasajes socios': a.valorsocios,
          ...Object.fromEntries(conceptos.map((k) => [k.nombre, desc(a, k.codigo)])), 'Pasajeros propios': a.pasajerospropios, 'Pasajes propios': a.valorpropios })) }])}>Excel</Btn>
      </CardHeader>
      <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Tiquetes vendidos en cada agencia en el período. Para los buses de socios se calcula el seguro y la cuota de administración que generan; los buses propios son ingreso directo.</p>
      <Tabla cargando={q.isLoading} filas={filas} clave={(a: any) => a.agencia} vacio="Sin ventas en el período" columnas={[
        { label: 'Agencia', render: (a: any) => <b>{a.agencia}</b> },
        { label: 'Pasajeros (socios)', align: 'right', render: (a: any) => a.pasajerossocios },
        { label: 'Pasajes (socios)', align: 'right', render: (a: any) => money(a.valorsocios) },
        ...conceptos.map((k) => ({ label: k.nombre, align: 'right' as const, render: (a: any) => money(desc(a, k.codigo)) })),
        { label: 'Pasajes (propios)', align: 'right', render: (a: any) => <>{money(a.valorpropios)}<div style={{ fontSize: 11, color: '#94a3b8' }}>{a.pasajerospropios} pas.</div></> },
      ]} />
      {!!filas.length && <div style={{ padding: '10px 20px', fontSize: 13 }}>Total socios: <b>{money(tot('valorsocios'))}</b> ({tot('pasajerossocios')} pasajeros) · descuentos {money(tot('totaldescuentos'))} · propios {money(tot('valorpropios'))}</div>}
    </Card>
  );
}

// ── Conceptos de cargo ──────────────────────────────────────────────────────
export function ConceptosCargo() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useConceptosCargo();
  const [form, setForm] = useState<any | null>(null);
  const guardar = useMutation({
    mutationFn: () => (form.idconcepto ? cont.put(`/transporte/conceptos-cargo/${form.idconcepto}`, form) : cont.post('/transporte/conceptos-cargo', form)),
    onSuccess: () => { m.ok('Concepto guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'transp'] }); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card style={{ marginTop: 16 }}>
        <CardHeader icon="list_alt" title="Conceptos de cargo al socio">
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', contrapartida: 'PROVEEDOR', idcuenta: null, orden: 10, activo: true })}>Nuevo concepto</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(c: any) => c.idconcepto} vacio="Sin conceptos (ejecute la migración del extracto)" columnas={[
          { label: 'Concepto', render: (c: any) => <><b>{c.nombre}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{c.codigo}</div></> },
          { label: 'Contrapartida', render: (c: any) => CONTRAPARTIDAS[c.contrapartida] },
          { label: 'Cuenta', render: (c: any) => (c.codigocuenta ? `${c.codigocuenta} ${c.nombrecuenta}` : c.contrapartida === 'PROVEEDOR' ? '23359505 (por pagar al proveedor)' : '—') },
          { label: 'Estado', render: (c: any) => <Badge tone={c.activo ? 'green' : 'gray'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge> },
          { label: '', render: (c: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...c })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idconcepto ? 'Editar concepto de cargo' : 'Nuevo concepto de cargo'} onClose={() => setForm(null)} ancho={620}>
          <Grid cols={2}>
            <Field label="Código" required><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Contrapartida" required>
              <select value={form.contrapartida} onChange={(e) => setForm({ ...form, contrapartida: e.target.value })} style={inputStyle}>
                {Object.entries(CONTRAPARTIDAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Orden"><input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          {form.contrapartida === 'CUENTA' && (
            <Field label="Cuenta contrapartida" required style={{ marginTop: 12 }}><CuentaSelect value={form.idcuenta} onChange={(c) => setForm({ ...form, idcuenta: c?.idcuenta ?? null })} /></Field>
          )}
          <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || (form.contrapartida === 'CUENTA' && !form.idcuenta) || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
