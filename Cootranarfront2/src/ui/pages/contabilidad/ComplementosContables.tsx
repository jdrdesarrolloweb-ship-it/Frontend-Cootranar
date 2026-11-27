import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cont, type Cuenta, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, Btn, Card, CardHeader, CentroSelect, CuentaSelect, Field, Grid, Kpi, MESES, Modal, Tabla, TerceroPicker, Valor,
  exportarExcel, hoyCO, inputStyle, money, pedirMotivo, useMensaje,
} from './contUi';

/**
 * Funciones de Milenio que faltaban:
 *  - Activos diferidos (gastos pagados por anticipado) con amortización mensual.
 *  - Impuesto de renta del régimen tributario especial (cooperativas).
 *  - Documentos automáticos (comprobantes que se repiten cada período).
 *  - Tipos de comprobante administrables.
 */

const errTxt = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Ocurrió un error';
const anioActual = Number(hoyCO().slice(0, 4));
const mesActual = Number(hoyCO().slice(5, 7));
const CATEGORIAS: Record<string, string> = { SEGURO: 'Póliza / seguro', ARRENDAMIENTO: 'Arrendamiento', LICENCIA: 'Licencia / software', MANTENIMIENTO: 'Mantenimiento', OTRO: 'Otro' };

function SelectorPeriodo({ per, setPer }: { per: { anio: number; mes: number }; setPer: (p: { anio: number; mes: number }) => void }) {
  return (
    <>
      <select value={per.mes} onChange={(e) => setPer({ ...per, mes: Number(e.target.value) })} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Mes">
        {MESES.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}
      </select>
      <input type="number" value={per.anio} onChange={(e) => setPer({ ...per, anio: Number(e.target.value) })} style={{ ...inputStyle, width: 90, padding: '7px 10px' }} aria-label="Año" />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ACTIVOS DIFERIDOS
// ════════════════════════════════════════════════════════════════════════════
export function DiferidosPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [per, setPer] = useState({ anio: anioActual, mes: mesActual });
  const [form, setForm] = useState<any | null>(null);
  const [plan, setPlan] = useState<number | null>(null);
  const q = useQuery({ queryKey: ['cont', 'diferidos', per], queryFn: () => cont.get<any[]>('/diferidos', per) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const amortizar = useMutation({
    mutationFn: () => cont.post('/diferidos/amortizar', per),
    onSuccess: (r: any) => { if (r.diferidos) m.ok(`Amortización ${MESES[per.mes - 1]} ${per.anio}: ${r.diferidos} diferido(s), ${money(r.total)} (${r.comprobante})`); else m.ok(r.mensaje); inv(); },
    onError: (e) => m.err(e),
  });
  const revertir = useMutation({
    mutationFn: (motivo: string) => cont.post('/diferidos/amortizar/revertir', { ...per, motivo }),
    onSuccess: () => { m.ok('Amortización del mes revertida'); inv(); }, onError: (e) => m.err(e),
  });
  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => cont.patch(`/diferidos/${id}/anular`, { motivo }),
    onSuccess: () => { m.ok('Diferido anulado'); inv(); }, onError: (e) => m.err(e),
  });
  const lista = q.data ?? [];
  const activos = lista.filter((d) => d.estado === 'ACTIVO');
  const tot = (k: string) => activos.reduce((s, d) => s + Number(d[k]), 0);
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '22px 0 14px' }}>
        <Kpi label="Diferidos vigentes" valor={money(tot('valor'))} /><Kpi label="Amortizado" valor={money(tot('amortizado'))} />
        <Kpi label="Saldo por amortizar" valor={money(tot('saldo'))} tono="#0D3B8E" />
        <Kpi label={`Cuota de ${MESES[per.mes - 1]}`} valor={money(tot('cuotames'))} tono="#b45309" />
      </div>
      <Card>
        <CardHeader icon="schedule" title="Activos diferidos (gastos pagados por anticipado)">
          <SelectorPeriodo per={per} setPer={setPer} />
          <Btn variant="secondary" icon="event_repeat" disabled={amortizar.isPending} onClick={() => amortizar.mutate()}>Amortizar mes</Btn>
          <Btn variant="ghost" icon="undo" title="Revertir la amortización del mes" onClick={() => { const mo = pedirMotivo(`revertir la amortización de ${MESES[per.mes - 1]} ${per.anio}`); if (mo) revertir.mutate(mo); }} />
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel('diferidos', [{ nombre: 'Diferidos', filas: lista.map((d) => ({
            Código: d.codigo, Nombre: d.nombre, Categoría: CATEGORIAS[d.categoria], Tercero: d.tercero ?? '', Documento: d.documento ?? '', Inicio: String(d.fechainicio).slice(0, 10),
            Meses: d.meses, Valor: Number(d.valor), Amortizado: d.amortizado, Saldo: d.saldo, 'Cuota del mes': d.cuotames, Cuenta: d.cuentadiferido, Gasto: d.cuentagasto, Estado: d.estado })) }])}>Excel</Btn>
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', categoria: 'SEGURO', fechainicio: hoyCO().slice(0, 8) + '01', valor: '', meses: 12, amortizadoinicial: 0, contabilizarCompra: true })}>Nuevo diferido</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Pólizas, arriendos y licencias pagados por adelantado se llevan a gasto mes a mes (línea recta). Si un mes no se amortizó, el siguiente lo recupera; repetir un mes no duplica.</p>
        <Tabla cargando={q.isLoading} filas={lista} clave={(d: any) => d.iddiferido} vacio="Sin diferidos registrados" columnas={[
          { label: 'Diferido', render: (d: any) => <><b>{d.codigo}</b> · {d.nombre}<div style={{ fontSize: 11.5, color: '#64748b' }}>{CATEGORIAS[d.categoria]}{d.tercero ? ` · ${d.tercero}` : ''}{d.documento ? ` · ${d.documento}` : ''}{d.placa ? ` · ${d.placa}` : ''}</div></> },
          { label: 'Período', render: (d: any) => <>{String(d.fechainicio).slice(0, 7)} → {String(d.fechafin).slice(0, 7)}<div style={{ fontSize: 11.5, color: '#64748b' }}>{d.meses} meses</div></> },
          { label: 'Valor', align: 'right', render: (d: any) => money(d.valor) },
          { label: 'Amortizado', align: 'right', render: (d: any) => money(d.amortizado) },
          { label: 'Saldo', align: 'right', render: (d: any) => <b>{money(d.saldo)}</b> },
          { label: 'Cuota del mes', align: 'right', render: (d: any) => (d.cuotames ? money(d.cuotames) : '—') },
          { label: 'Estado', render: (d: any) => <Badge tone={d.estado === 'ACTIVO' ? 'green' : d.estado === 'TERMINADO' ? 'blue' : 'gray'}>{d.estado}</Badge> },
          { label: '', render: (d: any) => (
            <div style={{ display: 'flex', gap: 2 }}>
              <Btn small variant="ghost" icon="table_view" title="Plan de amortización" onClick={() => setPlan(d.iddiferido)} />
              {d.estado !== 'ANULADO' && <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...d, fechainicio: String(d.fechainicio).slice(0, 10), valor: Number(d.valor), amortizadoinicial: Number(d.amortizadoinicial), editar: true })} />}
              {d.estado === 'ACTIVO' && !d.mesesregistrados && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const mo = pedirMotivo(`anular ${d.codigo}`); if (mo) anular.mutate({ id: d.iddiferido, motivo: mo }); }} />}
            </div>
          ) },
        ]} />
      </Card>
      {form && <DiferidoForm inicial={form} onClose={() => setForm(null)} onOk={(r) => { m.ok(`Diferido ${r.codigo} guardado${r.comprobantecompra ? ` (${r.comprobantecompra})` : ''}`); setForm(null); inv(); }} />}
      {plan && <PlanDiferido id={plan} onClose={() => setPlan(null)} />}
    </>
  );
}

function DiferidoForm({ inicial, onClose, onOk }: { inicial: any; onClose: () => void; onOk: (r: any) => void }) {
  const [f, setF] = useState<any>(inicial);
  const [tercero, setTercero] = useState<Tercero | null>(inicial.idtercero ? { idtercero: inicial.idtercero, documento: '', nombre: inicial.tercero ?? '' } as Tercero : null);
  const [terceroPago, setTerceroPago] = useState<Tercero | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sug = useQuery({ queryKey: ['cont', 'diferidos', 'sugeridas'], queryFn: () => cont.get<any>('/diferidos/cuentas-sugeridas'), staleTime: 300_000 });
  const cuentas = (cat: string) => sug.data?.[cat] ?? {};
  const idDif = f.idcuentadiferido ?? cuentas(f.categoria).idcuentadiferido ?? null;
  const idGas = f.idcuentagasto ?? cuentas(f.categoria).idcuentagasto ?? null;
  const bloqueado = f.editar && (f.mesesregistrados > 0 || f.idcomprobantecompra);
  const guardar = useMutation({
    mutationFn: () => {
      const body = {
        ...f, idtercero: tercero?.idtercero, valor: Number(f.valor), meses: Number(f.meses), amortizadoinicial: Number(f.amortizadoinicial || 0),
        idcuentadiferido: idDif, idcuentagasto: idGas,
        idcuentacontrapartida: !f.editar && f.contabilizarCompra ? f.idcuentacontrapartida : undefined, idtercerocontrapartida: terceroPago?.idtercero,
      };
      return f.editar ? cont.put(`/diferidos/${f.iddiferido}`, body) : cont.post('/diferidos', body);
    },
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  const cuota = Number(f.valor) > 0 && Number(f.meses) > 0 ? Number(f.valor) / Number(f.meses) : 0;
  return (
    <Modal titulo={f.editar ? `Editar diferido ${f.codigo}` : 'Nuevo activo diferido'} onClose={onClose} ancho={820}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      {bloqueado && <p style={{ fontSize: 12.5, color: '#b45309', marginTop: 0 }}>Ya tiene amortizaciones o compra contabilizada: solo se editan nombre, documento, centro y observación.</p>}
      <Grid cols={3}>
        <Field label="Código" required><input value={f.codigo} disabled={bloqueado} onChange={(e) => setF({ ...f, codigo: e.target.value })} style={inputStyle} /></Field>
        <Field label="Nombre" required><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Póliza RC contractual 2026" style={inputStyle} /></Field>
        <Field label="Categoría" required>
          <select value={f.categoria} disabled={bloqueado} onChange={(e) => setF({ ...f, categoria: e.target.value, idcuentadiferido: null, idcuentagasto: null })} style={inputStyle}>
            {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Aseguradora / proveedor"><TerceroPicker value={tercero} onChange={setTercero} /></Field>
        <Field label="N.º póliza / factura"><input value={f.documento ?? ''} onChange={(e) => setF({ ...f, documento: e.target.value })} style={inputStyle} /></Field>
        <Field label="Centro de costo"><CentroSelect value={f.idcentro ?? null} onChange={(id) => setF({ ...f, idcentro: id })} /></Field>
        <Field label="Primer mes que se amortiza" required><input type="date" value={f.fechainicio} disabled={bloqueado} onChange={(e) => setF({ ...f, fechainicio: e.target.value })} style={inputStyle} /></Field>
        <Field label="Valor total" required><input type="number" min={0} value={f.valor} disabled={bloqueado} onChange={(e) => setF({ ...f, valor: e.target.value })} style={inputStyle} /></Field>
        <Field label="Meses" required><input type="number" min={1} max={360} value={f.meses} disabled={bloqueado} onChange={(e) => setF({ ...f, meses: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      <Grid cols={2} style={{ marginTop: 12 }}>
        <Field label="Cuenta del diferido (1705)" required>
          {bloqueado ? <div style={{ ...inputStyle, padding: '8px 10px' }}>{f.cuentadiferido} {f.nombrecuentadiferido}</div>
            : <CuentaSelect value={idDif} filtro={(c: Cuenta) => c.codigo.startsWith('17') || c.codigo.startsWith('19')} onChange={(c) => setF({ ...f, idcuentadiferido: c?.idcuenta ?? null })} />}
        </Field>
        <Field label="Cuenta de gasto (51/52/7)" required>
          {bloqueado ? <div style={{ ...inputStyle, padding: '8px 10px' }}>{f.cuentagasto} {f.nombrecuentagasto}</div>
            : <CuentaSelect value={idGas} filtro={(c: Cuenta) => /^[57]/.test(c.codigo)} onChange={(c) => setF({ ...f, idcuentagasto: c?.idcuenta ?? null })} />}
        </Field>
        {!bloqueado && <Field label="Ya amortizado antes (traído de Milenio)"><input type="number" min={0} value={f.amortizadoinicial} onChange={(e) => setF({ ...f, amortizadoinicial: e.target.value })} style={inputStyle} /></Field>}
      </Grid>
      {!f.editar && (
        <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <label style={{ display: 'flex', gap: 6, fontSize: 13 }}><input type="checkbox" checked={f.contabilizarCompra} onChange={(e) => setF({ ...f, contabilizarCompra: e.target.checked })} /> Contabilizar la compra ahora (Db diferido · Cr banco o cuenta por pagar)</label>
          {f.contabilizarCompra && (
            <Grid cols={2} style={{ marginTop: 8 }}>
              <Field label="Se pagó / se debe en" required><CuentaSelect value={f.idcuentacontrapartida ?? null} filtro={(c: Cuenta) => /^(11|22|23)/.test(c.codigo)} onChange={(c) => setF({ ...f, idcuentacontrapartida: c?.idcuenta ?? null })} /></Field>
              <Field label="Tercero de la contrapartida"><TerceroPicker value={terceroPago} onChange={setTerceroPago} placeholder="Si es distinto del proveedor" /></Field>
            </Grid>
          )}
          {!f.contabilizarCompra && <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0' }}>Use esta opción si la compra ya está registrada en la cuenta del diferido.</p>}
        </div>
      )}
      <Field label="Observación" style={{ marginTop: 12 }}><input value={f.observacion ?? ''} onChange={(e) => setF({ ...f, observacion: e.target.value })} style={inputStyle} /></Field>
      {cuota > 0 && <p style={{ fontSize: 12.5, color: '#64748b' }}>Cuota mensual aproximada: <b>{money(cuota)}</b></p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="save" disabled={!f.codigo || !f.nombre || !(Number(f.valor) > 0) || !(Number(f.meses) > 0) || !idDif || !idGas || (!f.editar && f.contabilizarCompra && !f.idcuentacontrapartida) || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
      </div>
    </Modal>
  );
}

function PlanDiferido({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery({ queryKey: ['cont', 'diferido', id], queryFn: () => cont.get<any>(`/diferidos/${id}`) });
  const d = q.data;
  return (
    <Modal titulo={d ? `Plan de amortización · ${d.codigo} ${d.nombre}` : 'Plan de amortización'} onClose={onClose} ancho={760}>
      {d && <p style={{ fontSize: 13, marginTop: 0 }}>Valor {money(d.valor)} · {d.meses} meses · amortizado {money(d.amortizado)}{Number(d.amortizadoinicial) ? ` (incluye ${money(d.amortizadoinicial)} anterior al sistema)` : ''} · saldo <b>{money(d.saldo)}</b></p>}
      <Tabla cargando={q.isLoading} filas={d?.plan ?? []} clave={(p: any) => `${p.anio}-${p.mes}`} columnas={[
        { label: 'Mes', render: (p: any) => `${MESES[p.mes - 1]} ${p.anio}` },
        { label: 'Cuota', align: 'right', render: (p: any) => money(p.cuota) },
        { label: 'Acumulado', align: 'right', render: (p: any) => money(p.acumulado) },
        { label: 'Registrado', align: 'right', render: (p: any) => (p.registrado !== null ? <>{money(p.registrado)} <span style={{ fontSize: 11, color: '#64748b' }}>{p.comprobante}</span></> : '—') },
      ]} />
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. IMPUESTO DE RENTA (RÉGIMEN TRIBUTARIO ESPECIAL)
// ════════════════════════════════════════════════════════════════════════════
export function RentaPanel() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [f, setF] = useState<any>({ anio: anioActual - 1, fecha: hoyCO(), ajustes: [], retenciones: '', tomarEducacion: '' });
  const cuerpo = () => ({
    fecha: f.fecha, retenciones: f.retenciones === '' ? undefined : Number(f.retenciones), tomarEducacion: f.tomarEducacion === '' ? undefined : Number(f.tomarEducacion),
    ajustes: f.ajustes.filter((x: any) => x.nombre && Number(x.valor)).map((x: any) => ({ nombre: x.nombre, valor: Number(x.valor) })),
  });
  const prev = useQuery({
    queryKey: ['cont', 'renta', 'prev', f.anio, JSON.stringify(cuerpo())],
    queryFn: () => cont.post(`/tributario/renta/${f.anio}/previsualizar`, cuerpo()), retry: false, enabled: f.anio > 2000,
  });
  const hist = useQuery({ queryKey: ['cont', 'renta', 'hist'], queryFn: () => cont.get<any[]>('/tributario/renta') });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const registrar = useMutation({ mutationFn: () => cont.post(`/tributario/renta/${f.anio}`, cuerpo()), onSuccess: (r: any) => { m.ok(`Impuesto de renta ${f.anio} registrado (${r.comprobante})`); inv(); }, onError: (e) => m.err(e) });
  const anular = useMutation({ mutationFn: ({ anio, motivo }: { anio: number; motivo: string }) => cont.patch(`/tributario/renta/${anio}/anular`, { motivo }), onSuccess: () => { m.ok('Registro anulado (comprobante reversado)'); inv(); }, onError: (e) => m.err(e) });
  const p: any = prev.data;
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="account_balance" title="Impuesto de renta · régimen tributario especial (cooperativa)">
          <input type="number" value={f.anio} onChange={(e) => setF({ ...f, anio: Number(e.target.value) })} style={{ ...inputStyle, width: 90, padding: '7px 10px' }} aria-label="Año gravable" />
        </CardHeader>
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Art. 19-4 del E.T.: la cooperativa tributa el {p?.tarifa ?? 20} % sobre su excedente fiscal, tomado de los fondos de educación y solidaridad. Si los fondos no alcanzan, la diferencia se registra como gasto (5405). El valor se redondea al múltiplo de mil.</p>
          <Grid cols={3}>
            <Field label="Fecha del registro" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
            <Field label="Retenciones y anticipos a favor"><input type="number" min={0} value={f.retenciones} onChange={(e) => setF({ ...f, retenciones: e.target.value })} style={inputStyle} /></Field>
            <Field label="Tomar del fondo de educación (opcional)"><input type="number" min={0} value={f.tomarEducacion} onChange={(e) => setF({ ...f, tomarEducacion: e.target.value })} placeholder="Proporcional a los saldos" style={inputStyle} /></Field>
          </Grid>
          <h4 style={{ margin: '14px 0 6px', fontSize: 13 }}>Ajustes fiscales (+ gastos no deducibles, − ingresos no gravados)</h4>
          {f.ajustes.map((x: any, i: number) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 8, marginBottom: 6 }}>
              <input value={x.nombre} placeholder="Concepto" onChange={(e) => setF({ ...f, ajustes: f.ajustes.map((y: any, k: number) => (k === i ? { ...y, nombre: e.target.value } : y)) })} style={inputStyle} />
              <input type="number" value={x.valor} placeholder="Valor (+/−)" onChange={(e) => setF({ ...f, ajustes: f.ajustes.map((y: any, k: number) => (k === i ? { ...y, valor: e.target.value } : y)) })} style={inputStyle} />
              <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setF({ ...f, ajustes: f.ajustes.filter((_: any, k: number) => k !== i) })} />
            </div>
          ))}
          <Btn small variant="secondary" icon="add" onClick={() => setF({ ...f, ajustes: [...f.ajustes, { nombre: '', valor: '' }] })}>Agregar ajuste</Btn>

          {prev.error && <div style={{ marginTop: 12 }}><Alerta msg={{ tipo: 'err', texto: errTxt(prev.error) }} /></div>}
          {p && (
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 8 }}>
              {p.fuente === 'PROVISIONAL' && <p style={{ fontSize: 12.5, color: '#b45309', marginTop: 0 }}>El ejercicio {p.anio} aún no está cerrado: el excedente es provisional y no se puede registrar.</p>}
              <Tabla filas={[
                { k: 'Excedente contable', v: p.excedente }, { k: 'Ajustes fiscales', v: p.ajuste }, { k: 'Base gravable', v: p.base, b: true },
                { k: `Impuesto (${p.tarifa} %)`, v: p.impuesto, b: true },
                { k: `Del fondo de educación (saldo ${money(p.fondoEducacion)})`, v: p.educacion }, { k: `Del fondo de solidaridad (saldo ${money(p.fondoSolidaridad)})`, v: p.solidaridad },
                { k: 'Como gasto (fondos insuficientes)', v: p.gasto }, { k: 'Retenciones y anticipos', v: -p.retenciones }, { k: 'Saldo a pagar', v: p.saldoPagar, b: true },
              ]} clave={(x: any) => x.k} columnas={[
                { label: 'Concepto', render: (x: any) => (x.b ? <b>{x.k}</b> : x.k) },
                { label: 'Valor', align: 'right', render: (x: any) => <Valor v={x.v} fuerte={x.b} /> },
              ]} />
              {p.gasto > 0 && <p style={{ fontSize: 12, color: '#b45309' }}>Los fondos de educación y solidaridad no alcanzan: {money(p.gasto)} se registrarán como gasto. ¿Ya se aplicó el excedente en la asamblea?</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                {p.registrada
                  ? <Badge tone="green">Registrado · {p.registrada.comprobante}</Badge>
                  : <Btn icon="check" disabled={p.fuente !== 'CIERRE' || !(p.impuesto > 0) || registrar.isPending} onClick={() => registrar.mutate()}>Registrar impuesto {p.anio}</Btn>}
              </div>
            </div>
          )}
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <CardHeader icon="history" title="Impuesto de renta registrado por año" />
        <Tabla cargando={hist.isLoading} filas={hist.data ?? []} clave={(r: any) => r.idrenta} vacio="Sin registros" columnas={[
          { label: 'Año', render: (r: any) => <b>{r.anio}</b> },
          { label: 'Base', align: 'right', render: (r: any) => money(r.base) },
          { label: 'Impuesto', align: 'right', render: (r: any) => <b>{money(r.impuesto)}</b> },
          { label: 'Fondos', align: 'right', render: (r: any) => money(Number(r.fondoeducacion) + Number(r.fondosolidaridad)) },
          { label: 'Gasto', align: 'right', render: (r: any) => money(r.gasto) },
          { label: 'Comprobante', render: (r: any) => r.comprobante },
          { label: 'Estado', render: (r: any) => <Badge tone={r.estado === 'REGISTRADO' ? 'green' : 'gray'}>{r.estado}</Badge> },
          { label: '', render: (r: any) => r.estado === 'REGISTRADO' && <Btn small variant="ghost" icon="block" title="Anular" onClick={() => { const mo = pedirMotivo(`anular el impuesto de renta ${r.anio}`); if (mo) anular.mutate({ anio: r.anio, motivo: mo }); }} /> },
        ]} />
      </Card>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. DOCUMENTOS AUTOMÁTICOS
// ════════════════════════════════════════════════════════════════════════════
const PERIODICIDADES: Record<string, string> = { MENSUAL: 'Mensual', BIMESTRAL: 'Bimestral', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };
type LineaP = { cuenta: Cuenta | null; tercero: Tercero | null; idcentro: number | null; debito: string; credito: string; detalle: string };
const lineaP = (): LineaP => ({ cuenta: null, tercero: null, idcentro: null, debito: '', credito: '', detalle: '' });

export function DocumentosAutomaticos({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const [per, setPer] = useState({ anio: anioActual, mes: mesActual });
  const [form, setForm] = useState<any | null>(null);
  const [res, setRes] = useState<any | null>(null);
  const ps = useQuery({ queryKey: ['cont', 'automaticos'], queryFn: () => cont.get<any[]>('/automaticos') });
  const pend = useQuery({ queryKey: ['cont', 'automaticos', 'pend', per], queryFn: () => cont.get<any[]>('/automaticos/pendientes', per) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const generar = useMutation({ mutationFn: () => cont.post('/automaticos/generar', per), onSuccess: (r: any) => { setRes(r); inv(); }, onError: (e) => m.err(e) });
  const porGenerar = (pend.data ?? []).filter((p) => !p.generado);
  return (
    <Modal titulo="Documentos automáticos" onClose={onClose} ancho={1040}>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Plantillas de comprobantes que se repiten (arriendos, honorarios, servicios, amortizaciones manuales). Cada período se generan una sola vez; en borrador si el valor cambia cada mes, o contabilizados directamente.</p>
      <Card>
        <CardHeader icon="event_repeat" title="Generar del período">
          <SelectorPeriodo per={per} setPer={(x) => { setPer(x); setRes(null); }} />
          <Btn icon="play_arrow" disabled={!porGenerar.length || generar.isPending} onClick={() => generar.mutate()}>Generar {porGenerar.length} documento(s)</Btn>
        </CardHeader>
        <Tabla cargando={pend.isLoading} filas={pend.data ?? []} clave={(p: any) => p.idplantilla} vacio="Ninguna plantilla toca en este período" columnas={[
          { label: 'Plantilla', render: (p: any) => <b>{p.nombre}</b> },
          { label: 'Fecha', render: (p: any) => p.fecha },
          { label: 'Tipo', render: (p: any) => p.tipo },
          { label: 'Valor', align: 'right', render: (p: any) => money(p.total) },
          { label: 'Queda', render: (p: any) => (p.contabilizar ? 'Contabilizado' : 'Borrador') },
          { label: 'Estado', render: (p: any) => (p.generado ? <Badge tone="green">{p.generado.comprobante}</Badge> : <Badge tone="amber">Pendiente</Badge>) },
        ]} />
        {res && (
          <div style={{ padding: '10px 20px', fontSize: 13 }}>
            {res.generados.map((g: any) => <div key={g.idplantilla}>✔ {g.nombre}: {g.comprobante} ({g.estado.toLowerCase()})</div>)}
            {res.errores.map((g: any) => <div key={g.idplantilla} style={{ color: '#b91c1c' }}>✖ {g.nombre}: {g.error}</div>)}
          </div>
        )}
      </Card>
      <Card style={{ marginTop: 14 }}>
        <CardHeader icon="list_alt" title="Plantillas">
          <Btn icon="add" onClick={() => setForm({ nombre: '', tipo: 'CD', descripcion: '', periodicidad: 'MENSUAL', dia: 31, fechainicio: hoyCO().slice(0, 8) + '01', fechafin: '', contabilizar: false, activo: true, lineas: [lineaP(), lineaP()] })}>Nueva plantilla</Btn>
        </CardHeader>
        <Tabla cargando={ps.isLoading} filas={ps.data ?? []} clave={(p: any) => p.idplantilla} vacio="Sin plantillas" columnas={[
          { label: 'Plantilla', render: (p: any) => <><b>{p.nombre}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{p.descripcion}</div></> },
          { label: 'Cada', render: (p: any) => `${PERIODICIDADES[p.periodicidad]} · día ${p.dia}` },
          { label: 'Tipo', render: (p: any) => p.tipo },
          { label: 'Valor', align: 'right', render: (p: any) => money(p.total) },
          { label: 'Último', render: (p: any) => (p.ultimoperiodo ? `${String(p.ultimoperiodo).slice(4)}/${String(p.ultimoperiodo).slice(0, 4)}` : '—') },
          { label: 'Estado', render: (p: any) => <Badge tone={p.activo ? 'green' : 'gray'}>{p.activo ? 'Activa' : 'Inactiva'}</Badge> },
          { label: '', render: (p: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({
            ...p, fechainicio: String(p.fechainicio).slice(0, 10), fechafin: p.fechafin ? String(p.fechafin).slice(0, 10) : '',
            lineas: p.lineas.map((l: any) => ({
              cuenta: { idcuenta: l.idcuenta, codigo: l.codigo, nombre: l.cuenta, exigetercero: l.exigetercero, exigecentro: l.exigecentro } as Cuenta,
              tercero: l.idtercero ? { idtercero: l.idtercero, documento: l.documento, nombre: l.tercero } as Tercero : null, idcentro: l.idcentro,
              debito: Number(l.debito) ? String(Number(l.debito)) : '', credito: Number(l.credito) ? String(Number(l.credito)) : '', detalle: l.detalle ?? '',
            })),
          })} /> },
        ]} />
      </Card>
      {form && <PlantillaForm inicial={form} onClose={() => setForm(null)} onOk={() => { m.ok('Plantilla guardada'); setForm(null); inv(); }} />}
    </Modal>
  );
}

function PlantillaForm({ inicial, onClose, onOk }: { inicial: any; onClose: () => void; onOk: () => void }) {
  const [f, setF] = useState<any>(inicial);
  const [err, setErr] = useState<string | null>(null);
  const tipos = useQuery({ queryKey: ['cont', 'tipos'], queryFn: () => cont.get<any[]>('/tipos-comprobante'), staleTime: 300_000 });
  const linea = (i: number, c: Partial<LineaP>) => setF({ ...f, lineas: f.lineas.map((l: LineaP, k: number) => (k === i ? { ...l, ...c } : l)) });
  const td = f.lineas.reduce((a: number, l: LineaP) => a + Number(l.debito || 0), 0);
  const tc = f.lineas.reduce((a: number, l: LineaP) => a + Number(l.credito || 0), 0);
  const cuadra = Math.round(td * 100) === Math.round(tc * 100) && td > 0;
  const guardar = useMutation({
    mutationFn: () => {
      const body = {
        nombre: f.nombre, tipo: f.tipo, descripcion: f.descripcion, periodicidad: f.periodicidad, dia: Number(f.dia), fechainicio: f.fechainicio, fechafin: f.fechafin || null,
        contabilizar: f.contabilizar, activo: f.activo,
        lineas: f.lineas.filter((l: LineaP) => l.cuenta && (Number(l.debito) || Number(l.credito))).map((l: LineaP) => ({
          idcuenta: l.cuenta!.idcuenta, idtercero: l.tercero?.idtercero, idcentro: l.idcentro, debito: Number(l.debito || 0), credito: Number(l.credito || 0), detalle: l.detalle,
        })),
      };
      return f.idplantilla ? cont.put(`/automaticos/${f.idplantilla}`, body) : cont.post('/automaticos', body);
    },
    onSuccess: onOk, onError: (e) => setErr(errTxt(e)),
  });
  return (
    <Modal titulo={f.idplantilla ? `Editar plantilla ${f.nombre}` : 'Nueva plantilla'} onClose={onClose} ancho={1100}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      <Grid cols={4}>
        <Field label="Nombre" required><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} style={inputStyle} /></Field>
        <Field label="Tipo" required>
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} style={inputStyle}>
            {(tipos.data ?? []).filter((t) => t.manual && t.activo !== false).map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}
          </select>
        </Field>
        <Field label="Periodicidad" required>
          <select value={f.periodicidad} onChange={(e) => setF({ ...f, periodicidad: e.target.value })} style={inputStyle}>
            {Object.entries(PERIODICIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Día del mes (31 = último)" required><input type="number" min={1} max={31} value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} style={inputStyle} /></Field>
        <Field label="Desde" required><input type="date" value={f.fechainicio} onChange={(e) => setF({ ...f, fechainicio: e.target.value })} style={inputStyle} /></Field>
        <Field label="Hasta (opcional)"><input type="date" value={f.fechafin} onChange={(e) => setF({ ...f, fechafin: e.target.value })} style={inputStyle} /></Field>
        <Field label="Al generar">
          <select value={f.contabilizar ? '1' : '0'} onChange={(e) => setF({ ...f, contabilizar: e.target.value === '1' })} style={inputStyle}>
            <option value="0">Queda en borrador (revisar valores)</option><option value="1">Se contabiliza directo</option>
          </select>
        </Field>
        <Field label="Estado">
          <select value={f.activo ? '1' : '0'} onChange={(e) => setF({ ...f, activo: e.target.value === '1' })} style={inputStyle}><option value="1">Activa</option><option value="0">Inactiva</option></select>
        </Field>
      </Grid>
      <Field label="Descripción del comprobante" required style={{ marginTop: 12 }}><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Causación arriendo bodega Pasto" style={inputStyle} /></Field>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 12.5 }}>
        <thead><tr style={{ color: '#64748b', textAlign: 'left' }}><th>Cuenta</th><th>Tercero</th><th>Centro</th><th>Detalle</th><th>Débito</th><th>Crédito</th><th /></tr></thead>
        <tbody>
          {f.lineas.map((l: LineaP, i: number) => (
            <tr key={i}>
              <td style={{ padding: 4, width: 250 }}><CuentaSelect value={l.cuenta?.idcuenta ?? null} onChange={(c) => linea(i, { cuenta: c })} /></td>
              <td style={{ padding: 4, width: 210 }}><TerceroPicker value={l.tercero} onChange={(t) => linea(i, { tercero: t })} placeholder={l.cuenta?.exigetercero ? 'Tercero (obligatorio)' : 'Tercero'} /></td>
              <td style={{ padding: 4, width: 160 }}><CentroSelect value={l.idcentro} onChange={(id) => linea(i, { idcentro: id })} /></td>
              <td style={{ padding: 4 }}><input value={l.detalle} onChange={(e) => linea(i, { detalle: e.target.value })} style={inputStyle} /></td>
              <td style={{ padding: 4, width: 110 }}><input type="number" min={0} value={l.debito} onChange={(e) => linea(i, { debito: e.target.value, credito: e.target.value ? '' : l.credito })} style={{ ...inputStyle, textAlign: 'right' }} aria-label="Débito" /></td>
              <td style={{ padding: 4, width: 110 }}><input type="number" min={0} value={l.credito} onChange={(e) => linea(i, { credito: e.target.value, debito: e.target.value ? '' : l.debito })} style={{ ...inputStyle, textAlign: 'right' }} aria-label="Crédito" /></td>
              <td><Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setF({ ...f, lineas: f.lineas.length > 2 ? f.lineas.filter((_: LineaP, k: number) => k !== i) : f.lineas })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Btn small variant="secondary" icon="add" onClick={() => setF({ ...f, lineas: [...f.lineas, lineaP()] })}>Agregar línea</Btn>
        <span style={{ fontSize: 13 }}>Débitos <b>{money(td)}</b> · Créditos <b>{money(tc)}</b> {cuadra ? <Badge tone="green">Cuadra</Badge> : <Badge tone="red">No cuadra</Badge>}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="save" disabled={!f.nombre || !f.descripcion || !cuadra || guardar.isPending} onClick={() => guardar.mutate()}>Guardar plantilla</Btn>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. TIPOS DE COMPROBANTE
// ════════════════════════════════════════════════════════════════════════════
export function TiposComprobante() {
  const qc = useQueryClient();
  const m = useMensaje();
  const [form, setForm] = useState<any | null>(null);
  const q = useQuery({ queryKey: ['cont', 'tipos', 'admin'], queryFn: () => cont.get<any[]>('/tipos-comprobante/administrar') });
  const guardar = useMutation({
    mutationFn: () => (form.idtipo ? cont.put(`/tipos-comprobante/${form.idtipo}`, form) : cont.post('/tipos-comprobante', form)),
    onSuccess: () => { m.ok('Tipo de comprobante guardado'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'tipos'] }); }, onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="article" title="Tipos (clases) de comprobante">
          <Btn icon="add" onClick={() => setForm({ codigo: '', nombre: '', siguiente: 1 })}>Nuevo tipo</Btn>
        </CardHeader>
        <p style={{ padding: '0 20px', fontSize: 12.5, color: '#64748b' }}>Los tipos <b>manuales</b> se usan en comprobantes manuales y documentos automáticos. Los tipos del sistema (automáticos o usados por los procesos) solo permiten cambiar el nombre y el consecutivo.</p>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(t: any) => t.idtipo} columnas={[
          { label: 'Código', render: (t: any) => <b>{t.codigo}</b> },
          { label: 'Nombre', render: (t: any) => t.nombre },
          { label: 'Uso', render: (t: any) => <>{t.manual ? <Badge tone="blue">Manual</Badge> : <Badge tone="gray">Automático</Badge>} {t.sistema && <span style={{ fontSize: 11, color: '#94a3b8' }}>sistema</span>}</> },
          { label: 'Comprobantes', align: 'right', render: (t: any) => t.comprobantes },
          { label: 'Último n.º', align: 'right', render: (t: any) => t.ultimonumero ?? '—' },
          { label: 'Siguiente', align: 'right', render: (t: any) => t.siguiente },
          { label: 'Estado', render: (t: any) => <Badge tone={t.activo !== false ? 'green' : 'gray'}>{t.activo !== false ? 'Activo' : 'Inactivo'}</Badge> },
          { label: '', render: (t: any) => <Btn small variant="ghost" icon="edit" title="Editar" onClick={() => setForm({ ...t, activo: t.activo !== false })} /> },
        ]} />
      </Card>
      {form && (
        <Modal titulo={form.idtipo ? `Editar tipo ${form.codigo}` : 'Nuevo tipo de comprobante'} onClose={() => setForm(null)} ancho={560}>
          <Grid cols={2}>
            <Field label="Código (1 a 5)" required><input value={form.codigo} disabled={!!form.idtipo} maxLength={5} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} style={inputStyle} /></Field>
            <Field label="Nombre" required><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Siguiente número"><input type="number" min={1} value={form.siguiente} onChange={(e) => setForm({ ...form, siguiente: e.target.value })} style={inputStyle} /></Field>
            {form.idtipo && !form.sistema && (
              <Field label="Estado">
                <select value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })} style={inputStyle}><option value="1">Activo</option><option value="0">Inactivo</option></select>
              </Field>
            )}
          </Grid>
          {form.idtipo && form.ultimonumero && <p style={{ fontSize: 12, color: '#64748b' }}>El siguiente número debe ser mayor que el último usado ({form.ultimonumero}).</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!form.codigo || !form.nombre || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
