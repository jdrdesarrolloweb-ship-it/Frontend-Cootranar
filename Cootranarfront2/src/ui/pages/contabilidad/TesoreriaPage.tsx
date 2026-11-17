import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, FiltroFechas, Grid, Kpi, Modal, Tabla, Tabs, Valor, exportarExcel,
  hoyCO, inicioMes, inputStyle, money, useMensaje,
} from './contUi';

type Tab = 'bancos' | 'conciliacion' | 'cxp' | 'cxc';

export const TesoreriaPage = () => {
  const [tab, setTab] = useState<Tab>('bancos');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'bancos', label: 'Bancos y transferencias', icon: 'account_balance' },
        { id: 'conciliacion', label: 'Conciliación bancaria', icon: 'fact_check' },
        { id: 'cxp', label: 'Cuentas por pagar', icon: 'request_quote' },
        { id: 'cxc', label: 'Cartera por edades', icon: 'credit_score' },
      ]} />
      {tab === 'bancos' && <Bancos />}
      {tab === 'conciliacion' && <Conciliacion />}
      {tab === 'cxp' && <CuentasPorPagar />}
      {tab === 'cxc' && <Cartera />}
    </Layout>
  );
};

function useBancos() { return useQuery({ queryKey: ['cont', 'bancos'], queryFn: () => cont.get<any[]>('/bancos') }); }

function Bancos() {
  const qc = useQueryClient();
  const m = useMensaje();
  const bancos = useBancos();
  const [nuevo, setNuevo] = useState<any | null>(null);
  const [tr, setTr] = useState<any | null>(null);
  const crear = useMutation({
    mutationFn: () => cont.post('/bancos', nuevo),
    onSuccess: () => { m.ok('Cuenta bancaria creada con su auxiliar contable'); setNuevo(null); qc.invalidateQueries({ queryKey: ['cont'] }); },
    onError: (e) => m.err(e),
  });
  const transferir = useMutation({
    mutationFn: () => cont.post('/bancos/transferencias', { ...tr, valor: Number(tr.valor) }),
    onSuccess: (r: any) => { m.ok(`Transferencia registrada (${r.tipo}-${r.numero})`); setTr(null); qc.invalidateQueries({ queryKey: ['cont'] }); },
    onError: (e) => m.err(e),
  });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="account_balance" title="Cuentas bancarias">
          <Btn variant="secondary" icon="swap_horiz" onClick={() => setTr({ idcuentaorigen: null, idcuentadestino: null, valor: '', fecha: hoyCO(), descripcion: '' })}>Transferencia</Btn>
          <Btn icon="add" onClick={() => setNuevo({ banco: '', numero: '', tipo: 'AHORROS' })}>Nueva cuenta</Btn>
        </CardHeader>
        <Tabla cargando={bancos.isLoading} filas={bancos.data ?? []} clave={(b: any) => b.idcuentabancaria} vacio="Registra las cuentas bancarias de la empresa." columnas={[
          { label: 'Banco', render: (b: any) => <><b>{b.banco}</b> · {b.tipo.toLowerCase()} {b.numero}</> },
          { label: 'Cuenta contable', render: (b: any) => `${b.codigo} ${b.nombrecuenta}` },
          { label: 'Saldo en libros', align: 'right', render: (b: any) => <Valor v={b.saldolibros} fuerte /> },
          { label: 'Partidas del extracto sin conciliar', align: 'right', render: (b: any) => (b.pendientesextracto ? <Badge tone="amber">{b.pendientesextracto}</Badge> : '0') },
        ]} />
      </Card>
      {nuevo && (
        <Modal titulo="Nueva cuenta bancaria" onClose={() => setNuevo(null)} ancho={520}>
          <Grid cols={2}>
            <Field label="Banco" required><input value={nuevo.banco} onChange={(e) => setNuevo({ ...nuevo, banco: e.target.value })} style={inputStyle} /></Field>
            <Field label="Número" required><input value={nuevo.numero} onChange={(e) => setNuevo({ ...nuevo, numero: e.target.value })} style={inputStyle} /></Field>
            <Field label="Tipo"><select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })} style={inputStyle}><option value="AHORROS">Ahorros (1120)</option><option value="CORRIENTE">Corriente (1110)</option></select></Field>
          </Grid>
          <p style={{ fontSize: 12, color: '#64748b' }}>Se crea automáticamente su cuenta auxiliar contable.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setNuevo(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={!nuevo.banco || !nuevo.numero || crear.isPending} onClick={() => crear.mutate()}>Crear</Btn>
          </div>
        </Modal>
      )}
      {tr && (
        <Modal titulo="Transferencia entre cuentas" onClose={() => setTr(null)} ancho={560}>
          <Field label="Desde (cuenta del disponible)" required><CuentaSelect value={tr.idcuentaorigen} filtro={(c) => c.codigo.startsWith('11')} onChange={(c) => setTr({ ...tr, idcuentaorigen: c?.idcuenta ?? null })} /></Field>
          <Field label="Hacia" required style={{ marginTop: 10 }}><CuentaSelect value={tr.idcuentadestino} filtro={(c) => c.codigo.startsWith('11')} onChange={(c) => setTr({ ...tr, idcuentadestino: c?.idcuenta ?? null })} /></Field>
          <Grid cols={2} style={{ marginTop: 10 }}>
            <Field label="Valor" required><input type="number" min={1} value={tr.valor} onChange={(e) => setTr({ ...tr, valor: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha" required>
              <DatePicker value={tr.fecha} onChange={(val) => setTr({ ...tr, fecha: val })} inputClassName="h-[36px] text-xs rounded-lg" />
            </Field>
          </Grid>
          <Field label="Descripción" style={{ marginTop: 10 }}><input value={tr.descripcion} onChange={(e) => setTr({ ...tr, descripcion: e.target.value })} placeholder="Consignación de efectivo de caja" style={inputStyle} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setTr(null)}>Cancelar</Btn>
            <Btn icon="swap_horiz" disabled={!tr.idcuentaorigen || !tr.idcuentadestino || !(Number(tr.valor) > 0) || transferir.isPending} onClick={() => transferir.mutate()}>Registrar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Conciliacion() {
  const qc = useQueryClient();
  const m = useMensaje();
  const bancos = useBancos();
  const [id, setId] = useState<number | null>(null);
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [extracto, setExtracto] = useState<string | null>(null);
  const [contra, setContra] = useState<{ idlinea: number; idcuenta: number | null } | null>(null);
  const [selLinea, setSelLinea] = useState<number | null>(null);
  const idb = id ?? bancos.data?.[0]?.idcuentabancaria ?? null;
  const q = useQuery({ queryKey: ['cont', 'conciliacion', idb, desde, hasta], queryFn: () => cont.get(`/bancos/${idb}/conciliacion`, { desde, hasta }), enabled: !!idb });
  const refrescar = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const importar = useMutation({
    mutationFn: () => cont.post(`/bancos/${idb}/extractos`, { contenido: extracto }),
    onSuccess: (r: any) => { m.ok(`${r.insertadas} línea(s) importadas${r.errores.length ? ` · ${r.errores.length} con error` : ''}`); setExtracto(null); refrescar(); },
    onError: (e) => m.err(e),
  });
  const auto = useMutation({ mutationFn: () => cont.post(`/bancos/${idb}/conciliacion/auto`, { desde, hasta }), onSuccess: (r: any) => { m.ok(`${r.pares} partida(s) conciliadas automáticamente`); refrescar(); }, onError: (e) => m.err(e) });
  const manual = useMutation({ mutationFn: ({ idlinea, idmovimiento }: { idlinea: number; idmovimiento: number | null }) => cont.patch(`/extractos/${idlinea}/conciliar`, { idmovimiento }), onSuccess: () => { setSelLinea(null); refrescar(); }, onError: (e) => m.err(e) });
  const contabilizar = useMutation({ mutationFn: () => cont.post(`/extractos/${contra!.idlinea}/contabilizar`, { idcuentacontra: contra!.idcuenta }), onSuccess: () => { m.ok('Partida contabilizada y conciliada'); setContra(null); refrescar(); }, onError: (e) => m.err(e) });
  const d = q.data;
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="fact_check" title="Conciliación bancaria">
          <select value={idb ?? ''} onChange={(e) => setId(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Cuenta">
            {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
          </select>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <Btn variant="secondary" icon="upload" disabled={!idb} onClick={() => setExtracto('')}>Importar extracto</Btn>
          <Btn icon="auto_fix_high" disabled={!idb || auto.isPending} onClick={() => auto.mutate()}>Conciliar automático</Btn>
        </CardHeader>
        {!idb ? <p style={{ padding: 20, color: '#94a3b8' }}>Primero registra una cuenta bancaria.</p> : d && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
              <Kpi label="Saldo en libros" valor={money(d.saldoLibros)} /><Kpi label="Saldo extracto" valor={money(d.saldoExtracto)} />
              <Kpi label="Diferencia" valor={money(d.saldoLibros - d.saldoExtracto)} tono={d.saldoLibros === d.saldoExtracto ? '#15803d' : '#b91c1c'} />
              <Kpi label="Pendientes extracto / libros" valor={`${d.pendientesExtracto} / ${d.pendientesLibros}`} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>Extracto del banco</b>
                <Tabla filas={d.extracto} clave={(e: any) => e.idlinea} vacio="Importa el extracto del período" columnas={[
                  { label: 'Fecha', render: (e: any) => String(e.fecha).slice(0, 10) },
                  { label: 'Descripción', render: (e: any) => <span style={{ fontSize: 12 }}>{e.descripcion}</span> },
                  { label: 'Valor', align: 'right', render: (e: any) => <Valor v={e.valor} /> },
                  { label: '', render: (e: any) => e.idmovimiento
                    ? <Btn small variant="ghost" icon="link_off" title="Desconciliar" onClick={() => manual.mutate({ idlinea: e.idlinea, idmovimiento: null })} />
                    : <div style={{ display: 'flex', gap: 2 }}>
                        <Btn small variant={selLinea === e.idlinea ? 'primary' : 'secondary'} icon="link" title="Seleccionar para emparejar" onClick={() => setSelLinea(selLinea === e.idlinea ? null : e.idlinea)} />
                        <Btn small variant="ghost" icon="post_add" title="Contabilizar (gasto/ingreso bancario)" onClick={() => setContra({ idlinea: e.idlinea, idcuenta: null })} />
                      </div> },
                ]} />
              </div>
              <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>Libros {selLinea ? '· elige el movimiento a emparejar' : ''}</b>
                <Tabla filas={d.libros} clave={(l: any) => l.idmovimiento} vacio="Sin movimientos" columnas={[
                  { label: 'Fecha', render: (l: any) => String(l.fecha).slice(0, 10) },
                  { label: 'Comprobante', render: (l: any) => <span style={{ fontSize: 12 }}>{l.comprobante} · {l.descripcion}</span> },
                  { label: 'Valor', align: 'right', render: (l: any) => <Valor v={l.valor} /> },
                  { label: '', render: (l: any) => l.idlinea ? <Badge tone="green">Conciliado</Badge>
                    : selLinea ? <Btn small icon="link" onClick={() => manual.mutate({ idlinea: selLinea, idmovimiento: l.idmovimiento })}>Emparejar</Btn> : <Badge tone="amber">Pendiente</Badge> },
                ]} />
              </div>
            </div>
          </div>
        )}
      </Card>
      {extracto !== null && (
        <Modal titulo="Importar extracto" onClose={() => setExtracto(null)} ancho={640}>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 0 }}>Pega el extracto (CSV o columnas separadas por ; o tab): <b>fecha;descripción;valor;referencia</b>. Valor positivo = consignación, negativo = cargo. Fechas AAAA-MM-DD o DD/MM/AAAA.</p>
          <textarea value={extracto} onChange={(e) => setExtracto(e.target.value)} rows={10} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder={'2026-11-02;Comisión manejo;-15000;\n2026-11-03;Consignación;500000;REF123'} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setExtracto(null)}>Cancelar</Btn>
            <Btn icon="upload" disabled={!extracto.trim() || importar.isPending} onClick={() => importar.mutate()}>Importar</Btn>
          </div>
        </Modal>
      )}
      {contra && (
        <Modal titulo="Contabilizar partida del extracto" onClose={() => setContra(null)} ancho={520}>
          <Field label="Cuenta contrapartida (p. ej. 530505 gastos bancarios)" required><CuentaSelect value={contra.idcuenta} onChange={(c) => setContra({ ...contra, idcuenta: c?.idcuenta ?? null })} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setContra(null)}>Cancelar</Btn>
            <Btn icon="post_add" disabled={!contra.idcuenta || contabilizar.isPending} onClick={() => contabilizar.mutate()}>Contabilizar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function CuentasPorPagar() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'cxp'], queryFn: () => cont.get('/cxp') });
  const pagos = useQuery({ queryKey: ['cont', 'cxp-pagos'], queryFn: () => cont.get<any[]>('/cxp/pagos') });
  const bancos = useBancos();
  const [pago, setPago] = useState<any | null>(null);
  const pagar = useMutation({
    mutationFn: () => cont.post('/cxp/pagos', { ...pago, valor: Number(pago.valor) }),
    onSuccess: () => { m.ok('Pago registrado'); setPago(null); qc.invalidateQueries({ queryKey: ['cont'] }); },
    onError: (e) => m.err(e),
  });
  const anular = useMutation({ mutationFn: (id: number) => cont.patch(`/cxp/pagos/${id}/anular`), onSuccess: () => { m.ok('Pago anulado y reversado'); qc.invalidateQueries({ queryKey: ['cont'] }); }, onError: (e) => m.err(e) });
  const t = q.data?.tramos;
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      {t && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Kpi label="Total por pagar" valor={money(q.data.total)} /><Kpi label="Corriente" valor={money(t.corriente)} tono="#15803d" />
          <Kpi label="1-30 días" valor={money(t.d1_30)} tono="#b45309" /><Kpi label="31-60" valor={money(t.d31_60)} tono="#b45309" />
          <Kpi label="61-90" valor={money(t.d61_90)} tono="#b91c1c" /><Kpi label="Más de 90" valor={money(t.mas90)} tono="#b91c1c" />
        </div>
      )}
      <Card>
        <CardHeader icon="request_quote" title="Facturas de proveedores pendientes">
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel('cuentas-por-pagar', [{ nombre: 'CxP', filas: (q.data?.facturas ?? []).map((f: any) => ({ Proveedor: f.razonsocial, NIT: f.nit, Factura: f.numerofactura ?? f.idcompra, Vence: String(f.fechavencimiento).slice(0, 10), 'Días vencida': Number(f.diasvencida), Saldo: Number(f.saldo) })) }])}>Excel</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.facturas ?? []} clave={(f: any) => f.idcompra} vacio="No hay obligaciones pendientes" columnas={[
          { label: 'Proveedor', render: (f: any) => <><b>{f.razonsocial}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>NIT {f.nit}</div></> },
          { label: 'Factura', render: (f: any) => f.numerofactura ?? `Compra ${f.idcompra}` },
          { label: 'Vence', render: (f: any) => <>{String(f.fechavencimiento).slice(0, 10)} {Number(f.diasvencida) > 0 && <Badge tone="red">{f.diasvencida} días</Badge>}</> },
          { label: 'Retenciones', align: 'right', render: (f: any) => money(Number(f.retefuente) + Number(f.reteiva) + Number(f.reteica)) },
          { label: 'Saldo', align: 'right', render: (f: any) => <b>{money(f.saldo)}</b> },
          { label: '', render: (f: any) => <Btn small icon="payments" onClick={() => setPago({ idcompra: f.idcompra, proveedor: f.razonsocial, saldo: Number(f.saldo), valor: String(Number(f.saldo)), medio: 'BANCO', idcuentabancaria: bancos.data?.[0]?.idcuentabancaria ?? null, fecha: hoyCO(), referencia: '' })}>Pagar</Btn> },
        ]} />
      </Card>
      <Card>
        <CardHeader icon="history" title="Pagos realizados" />
        <Tabla cargando={pagos.isLoading} filas={pagos.data ?? []} clave={(p: any) => p.idpago} vacio="Sin pagos" columnas={[
          { label: 'Fecha', render: (p: any) => String(p.fecha).slice(0, 10) },
          { label: 'Proveedor', render: (p: any) => p.razonsocial },
          { label: 'Factura', render: (p: any) => p.numerofactura ?? p.idcompra },
          { label: 'Medio', render: (p: any) => (p.medio === 'BANCO' ? `${p.banco} ${p.cuentanumero}` : 'Caja') },
          { label: 'Valor', align: 'right', render: (p: any) => <b>{money(p.valor)}</b> },
          { label: 'Estado', render: (p: any) => <Badge tone={p.estado === 'ACTIVO' ? 'green' : 'red'}>{p.estado}</Badge> },
          { label: '', render: (p: any) => p.estado === 'ACTIVO' && p.medio === 'BANCO' && <Btn small variant="ghost" icon="undo" title="Anular" onClick={() => { if (window.confirm('¿Anular este pago? Se reversará su registro contable.')) anular.mutate(p.idpago); }} /> },
        ]} />
      </Card>
      {pago && (
        <Modal titulo={`Pago a ${pago.proveedor}`} onClose={() => setPago(null)} ancho={560}>
          <p style={{ fontSize: 13, marginTop: 0 }}>Saldo pendiente: <b>{money(pago.saldo)}</b></p>
          <Grid cols={2}>
            <Field label="Valor" required><input type="number" min={1} max={pago.saldo} value={pago.valor} onChange={(e) => setPago({ ...pago, valor: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha" required>
              <DatePicker value={pago.fecha} onChange={(val) => setPago({ ...pago, fecha: val })} inputClassName="h-[36px] text-xs rounded-lg" />
            </Field>
            <Field label="Medio" required><select value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value })} style={inputStyle}><option value="BANCO">Banco</option><option value="CAJA">Caja (mi turno abierto)</option></select></Field>
            {pago.medio === 'BANCO' && <Field label="Cuenta" required><select value={pago.idcuentabancaria ?? ''} onChange={(e) => setPago({ ...pago, idcuentabancaria: Number(e.target.value) })} style={inputStyle}>
              {(bancos.data ?? []).map((b) => <option key={b.idcuentabancaria} value={b.idcuentabancaria}>{b.banco} {b.numero}</option>)}
            </select></Field>}
            <Field label="Referencia"><input value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setPago(null)}>Cancelar</Btn>
            <Btn icon="payments" disabled={!(Number(pago.valor) > 0) || Number(pago.valor) > pago.saldo || (pago.medio === 'BANCO' && !pago.idcuentabancaria) || pagar.isPending} onClick={() => pagar.mutate()}>Registrar pago</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Cartera() {
  const q = useQuery({ queryKey: ['cont', 'cxc'], queryFn: () => cont.get('/cxc/edades') });
  const t = q.data?.totales;
  return (
    <>
      {t && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Kpi label="Cartera total" valor={money(t.saldo)} /><Kpi label="Corriente" valor={money(t.corriente)} tono="#15803d" />
          <Kpi label="1-30 días" valor={money(t.d1_30)} tono="#b45309" /><Kpi label="31-60" valor={money(t.d31_60)} tono="#b45309" />
          <Kpi label="61-90" valor={money(t.d61_90)} tono="#b91c1c" /><Kpi label="Más de 90" valor={money(t.mas90)} tono="#b91c1c" />
        </div>
      )}
      <Card>
        <CardHeader icon="credit_score" title={`Cartera de socios por edades · corte ${q.data?.corte ?? ''}`}>
          <Btn variant="secondary" icon="download" onClick={() => exportarExcel('cartera-edades', [{ nombre: 'Cartera', filas: (q.data?.filas ?? []).map((f: any) => ({ Socio: f.nombre, Documento: f.documento, Saldo: Number(f.saldo), Corriente: f.corriente, '1-30': f.d1_30, '31-60': f.d31_60, '61-90': f.d61_90, '>90': f.mas90 })) }])}>Excel</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.filas ?? []} clave={(f: any) => f.idusuario} vacio="Sin cartera pendiente" columnas={[
          { label: 'Socio', render: (f: any) => <><b>{f.nombre}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{f.documento}</div></> },
          { label: 'Saldo', align: 'right', render: (f: any) => <b>{money(f.saldo)}</b> },
          { label: 'Corriente', align: 'right', render: (f: any) => money(f.corriente) },
          { label: '1-30', align: 'right', render: (f: any) => money(f.d1_30) },
          { label: '31-60', align: 'right', render: (f: any) => money(f.d31_60) },
          { label: '61-90', align: 'right', render: (f: any) => money(f.d61_90) },
          { label: '>90', align: 'right', render: (f: any) => money(f.mas90) },
        ]} />
      </Card>
    </>
  );
}
