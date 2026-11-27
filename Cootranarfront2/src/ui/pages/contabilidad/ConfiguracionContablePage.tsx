import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { Alerta, Badge, Btn, Card, CardHeader, CuentaSelect, Field, Grid, MESES, Modal, Paginador, Tabla, Tabs, Valor, fecha, hoyCO, inputStyle, money, useMensaje } from './contUi';
import { TiposComprobante } from './ComplementosContables';
import { ResolucionesPanel, UnificarPanel } from './HerramientasContables';

type Tab = 'periodos' | 'empresa' | 'parametros' | 'tipos' | 'resoluciones' | 'unificar' | 'usuarios' | 'auditoria';

export const ConfiguracionContablePage = () => {
  const { user } = useAuth();
  const admin = user?.nombrerol === 'ADMINISTRADOR';
  const [tab, setTab] = useState<Tab>('periodos');
  return (
    <Layout>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'periodos', label: 'Períodos y cierre', icon: 'event_available' }, { id: 'empresa', label: 'Empresa', icon: 'business' },
        { id: 'parametros', label: 'Parámetros', icon: 'tune' }, { id: 'tipos', label: 'Tipos de comprobante', icon: 'article' }, { id: 'resoluciones', label: 'Resoluciones DIAN', icon: 'verified' },
        { id: 'unificar', label: 'Unificar entidades', icon: 'merge' }, ...(admin ? [{ id: 'usuarios' as const, label: 'Contadores', icon: 'manage_accounts' }] : []),
        { id: 'auditoria', label: 'Auditoría', icon: 'policy' },
      ]} />
      {tab === 'periodos' && <Periodos admin={admin} />}
      {tab === 'empresa' && <Empresa admin={admin} />}
      {tab === 'parametros' && <Parametros />}
      {tab === 'tipos' && <TiposComprobante />}
      {tab === 'resoluciones' && <ResolucionesPanel />}
      {tab === 'unificar' && <UnificarPanel />}
      {tab === 'usuarios' && admin && <Usuarios />}
      {tab === 'auditoria' && <Auditoria />}
    </Layout>
  );
};

function Periodos({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const [anio, setAnio] = useState(Number(hoyCO().slice(0, 4)));
  const q = useQuery({ queryKey: ['cont', 'periodos', anio], queryFn: () => cont.get<any[]>('/periodos', { anio }) });
  const inv = () => qc.invalidateQueries({ queryKey: ['cont'] });
  const accion = useMutation({
    mutationFn: ({ id, que }: { id: number; que: 'cerrar' | 'reabrir' }) => cont.patch(`/periodos/${id}/${que}`),
    onSuccess: (_r, v) => { m.ok(v.que === 'cerrar' ? 'Período cerrado: ya no admite registros' : 'Período reabierto'); inv(); }, onError: (e) => m.err(e),
  });
  const crear = useMutation({ mutationFn: () => cont.post('/periodos/anio', { anio }), onSuccess: () => { m.ok('Períodos del año creados'); inv(); }, onError: (e) => m.err(e) });
  const cierre = useMutation({
    mutationFn: () => cont.post('/cierre-ejercicio', { anio }),
    onSuccess: (r: any) => { m.ok(`Cierre ${anio}: ${r.utilidad >= 0 ? 'excedente' : 'pérdida'} de ${money(Math.abs(r.utilidad))} (CI-${r.numero}). Ahora registre la aplicación aprobada por la asamblea.`); inv(); }, onError: (e) => m.err(e),
  });
  const [distribuir, setDistribuir] = useState(false);
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="event_available" title="Períodos contables">
          <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ ...inputStyle, width: 100, padding: '7px 10px' }} aria-label="Año" />
          {!q.data?.length && <Btn icon="add" onClick={() => crear.mutate()}>Crear períodos del año</Btn>}
          {admin && <Btn variant="danger" icon="lock_clock" disabled={cierre.isPending} onClick={() => { if (window.confirm(`¿Generar el cierre del ejercicio ${anio} (31 de diciembre)? Traslada los costos de operación (clase 7) al costo del servicio y cancela ingresos, costos y gastos contra el excedente o la pérdida.`)) cierre.mutate(); }}>Cierre del ejercicio</Btn>}
          <Btn variant="secondary" icon="diversity_3" onClick={() => setDistribuir(true)}>Aplicación del excedente</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(p: any) => p.idperiodo} vacio="No existen períodos para este año" columnas={[
          { label: 'Período', render: (p: any) => <b>{MESES[p.mes - 1]} {p.anio}</b> },
          { label: 'Estado', render: (p: any) => <Badge tone={p.estado === 'ABIERTO' ? 'green' : 'gray'}>{p.estado}</Badge> },
          { label: 'Pendientes', render: (p: any) => (p.eventospendientes || p.borradores ? <Badge tone="amber">{p.eventospendientes} eventos · {p.borradores} borradores</Badge> : '—') },
          { label: 'Cierre', render: (p: any) => (p.fechacierre ? `${fecha(p.fechacierre)} · ${p.cerradopornombre ?? ''}` : '—') },
          { label: '', render: (p: any) => p.estado === 'ABIERTO'
            ? <Btn small variant="secondary" icon="lock" onClick={() => { if (window.confirm(`¿Cerrar ${MESES[p.mes - 1]} ${p.anio}? No se podrán registrar más comprobantes con esa fecha.`)) accion.mutate({ id: p.idperiodo, que: 'cerrar' }); }}>Cerrar</Btn>
            : admin && <Btn small variant="ghost" icon="lock_open" onClick={() => accion.mutate({ id: p.idperiodo, que: 'reabrir' })}>Reabrir</Btn> },
        ]} />
      </Card>
      {distribuir && <DistribucionExcedentes anio={anio} admin={admin} onClose={() => setDistribuir(false)} onOk={(r) => { m.ok(`Aplicación registrada (${r.comprobante})`); setDistribuir(false); inv(); }} />}
    </>
  );
}

/**
 * Aplicación del excedente de la cooperativa (Ley 79 de 1988): compensación de pérdidas
 * anteriores (art. 55), reserva de protección de aportes 20 %, fondo de educación 20 % y fondo
 * de solidaridad 10 % (art. 54); el remanente según el acta de asamblea.
 */
function DistribucionExcedentes({ anio, admin, onClose, onOk }: { anio: number; admin: boolean; onClose: () => void; onOk: (r: any) => void }) {
  const [f, setF] = useState<any>({ fecha: `${anio + 1}-03-31`, acta: '', porcReserva: 20, porcEducacion: 20, porcSolidaridad: 10, remanente: [], compensarConReserva: false });
  const [err, setErr] = useState<string | null>(null);
  const cuerpo = () => ({
    ...f, anio, porcReserva: Number(f.porcReserva), porcEducacion: Number(f.porcEducacion), porcSolidaridad: Number(f.porcSolidaridad),
    remanente: f.remanente.filter((x: any) => x.nombre && Number(x.porcentaje) > 0 && x.idcuenta).map((x: any) => ({ ...x, porcentaje: Number(x.porcentaje) })),
  });
  const prev = useQuery({ queryKey: ['cont', 'dist-prev', anio, JSON.stringify(cuerpo())], queryFn: () => cont.post('/cierre-ejercicio/distribucion/previsualizar', cuerpo()), retry: false });
  const guardar = useMutation({ mutationFn: () => cont.post('/cierre-ejercicio/distribucion', cuerpo()), onSuccess: onOk, onError: (e: any) => setErr(e?.response?.data?.message ?? e.message) });
  const p: any = prev.data;
  const filas = !p ? [] : p.tipo === 'PERDIDA'
    ? [{ c: `Pérdida del ejercicio ${anio}`, v: p.perdida }, { c: 'Se traslada a pérdidas acumuladas', v: p.perdida }, ...(p.compensarConReserva ? [{ c: 'Compensada con la reserva de protección de aportes', v: p.compensarConReserva }] : [])]
    : [
      { c: `Excedente del ejercicio ${anio}`, v: p.excedente },
      ...(p.compensacion ? [{ c: '(−) Compensación de pérdidas anteriores (art. 55)', v: p.compensacion }] : []),
      { c: `Reserva protección de aportes ${f.porcReserva} %`, v: p.reserva },
      { c: `Fondo de educación ${f.porcEducacion} %`, v: p.educacion },
      { c: `Fondo de solidaridad ${f.porcSolidaridad} %`, v: p.solidaridad },
      ...p.destinos.map((d: any) => ({ c: `${d.nombre} (${d.porcentaje} % del remanente)`, v: d.valor })),
      ...(p.sinDestino ? [{ c: 'Remanente sin destino (excedentes por distribuir)', v: p.sinDestino }] : []),
    ];
  return (
    <Modal titulo={`Aplicación del resultado del ejercicio ${anio}`} onClose={onClose} ancho={820}>
      {err && <Alerta msg={{ tipo: 'err', texto: err }} onClose={() => setErr(null)} />}
      {prev.error && <Alerta msg={{ tipo: 'err', texto: (prev.error as any)?.response?.data?.message ?? 'No se pudo calcular' }} />}
      {p?.yaDistribuido && <Alerta msg={{ tipo: 'ok', texto: `Ya registrado: ${p.yaDistribuido.comprobante} del ${String(p.yaDistribuido.fecha).slice(0, 10)}` }} />}
      <Grid cols={2}>
        <Field label="Fecha del acta de asamblea" required><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} style={inputStyle} /></Field>
        <Field label="Acta (número y fecha)" required><input value={f.acta} placeholder="Acta N.º 45 de asamblea ordinaria" onChange={(e) => setF({ ...f, acta: e.target.value })} style={inputStyle} /></Field>
      </Grid>
      {p?.tipo !== 'PERDIDA' ? (
        <>
          <Grid cols={3} style={{ marginTop: 12 }}>
            <Field label="Reserva protección aportes % (mín. 20)"><input type="number" min={20} value={f.porcReserva} onChange={(e) => setF({ ...f, porcReserva: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fondo de educación % (mín. 20)"><input type="number" min={20} value={f.porcEducacion} onChange={(e) => setF({ ...f, porcEducacion: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fondo de solidaridad % (mín. 10)"><input type="number" min={10} value={f.porcSolidaridad} onChange={(e) => setF({ ...f, porcSolidaridad: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <h4 style={{ margin: '16px 0 6px', fontSize: 13 }}>Destino del remanente aprobado por la asamblea (% sobre el remanente)</h4>
          {f.remanente.map((x: any, i: number) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, marginBottom: 6 }}>
              <input placeholder="Revalorización de aportes, retorno a asociados, fondo…" value={x.nombre} onChange={(e) => { const r = [...f.remanente]; r[i] = { ...x, nombre: e.target.value }; setF({ ...f, remanente: r }); }} style={inputStyle} />
              <input type="number" placeholder="%" value={x.porcentaje} onChange={(e) => { const r = [...f.remanente]; r[i] = { ...x, porcentaje: e.target.value }; setF({ ...f, remanente: r }); }} style={inputStyle} />
              <CuentaSelect value={x.idcuenta ?? null} onChange={(c) => { const r = [...f.remanente]; r[i] = { ...x, idcuenta: c?.idcuenta ?? null }; setF({ ...f, remanente: r }); }} placeholder="Cuenta…" />
              <Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setF({ ...f, remanente: f.remanente.filter((_: any, k: number) => k !== i) })} />
            </div>
          ))}
          <Btn small variant="secondary" icon="add" onClick={() => setF({ ...f, remanente: [...f.remanente, { nombre: '', porcentaje: '', idcuenta: null }] })}>Agregar destino</Btn>
        </>
      ) : (
        <label style={{ display: 'flex', gap: 6, marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" checked={f.compensarConReserva} onChange={(e) => setF({ ...f, compensarConReserva: e.target.checked })} />
          Compensar la pérdida con la reserva de protección de aportes (disponible {money(p?.reservaDisponible)})
        </label>
      )}
      <div style={{ marginTop: 16 }}>
        {prev.isLoading ? <span style={{ color: '#94a3b8' }}>Calculando…</span> : (
          <Tabla filas={filas} clave={(x: any) => x.c} vacio="—" columnas={[
            { label: 'Concepto', render: (x: any) => x.c },
            { label: 'Valor', align: 'right', render: (x: any) => <Valor v={x.v} /> },
          ]} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        {admin && <Btn icon="check" disabled={!p || p.yaDistribuido || !f.acta.trim() || guardar.isPending} onClick={() => guardar.mutate()}>Registrar aplicación</Btn>}
      </div>
    </Modal>
  );
}

function Empresa({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'empresa'], queryFn: () => cont.get('/empresa') });
  const [form, setForm] = useState<any | null>(null);
  const f = form ?? q.data;
  const guardar = useMutation({ mutationFn: () => cont.put('/empresa', form), onSuccess: () => { m.ok('Datos de la empresa guardados'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'empresa'] }); }, onError: (e) => m.err(e) });
  if (!f) return null;
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...f, [k]: e.target.value });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="business" title="Empresa (aparece en estados financieros y certificados)" />
        <div style={{ padding: 20 }}>
          <Grid cols={3}>
            <Field label="NIT (sin DV)" required><input value={f.nit} disabled={!admin} onChange={set('nit')} style={inputStyle} /></Field>
            <Field label="DV"><input value={f.dv ?? ''} disabled style={inputStyle} /></Field>
            <Field label="Razón social" required><input value={f.razonsocial} disabled={!admin} onChange={set('razonsocial')} style={inputStyle} /></Field>
            <Field label="Nombre comercial"><input value={f.nombrecomercial ?? ''} disabled={!admin} onChange={set('nombrecomercial')} style={inputStyle} /></Field>
            <Field label="Dirección"><input value={f.direccion ?? ''} disabled={!admin} onChange={set('direccion')} style={inputStyle} /></Field>
            <Field label="Teléfono"><input value={f.telefono ?? ''} disabled={!admin} onChange={set('telefono')} style={inputStyle} /></Field>
            <Field label="Correo"><input value={f.correo ?? ''} disabled={!admin} onChange={set('correo')} style={inputStyle} /></Field>
            <Field label="Marco normativo">
              <select value={f.marconormativo} disabled={!admin} onChange={set('marconormativo')} style={inputStyle}>
                <option value="NIIF_PLENAS_GRUPO_1">NIIF plenas (Grupo 1)</option><option value="NIIF_PYMES_GRUPO_2">NIIF para pymes (Grupo 2)</option><option value="MICROEMPRESAS_GRUPO_3">Microempresas (Grupo 3)</option>
              </select>
            </Field>
            <Field label="Responsabilidades (códigos DIAN)"><input value={(f.responsabilidades ?? []).join(', ')} disabled={!admin} onChange={(e) => setForm({ ...f, responsabilidades: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} style={inputStyle} /></Field>
          </Grid>
          {admin && form && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><Btn icon="save" disabled={guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn></div>}
        </div>
      </Card>
    </>
  );
}

function Parametros() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'parametros'], queryFn: () => cont.get('/parametros') });
  const guardar = useMutation({ mutationFn: ({ clave, valor }: { clave: string; valor: string }) => cont.put(`/parametros/${clave}`, { valor }), onSuccess: () => { m.ok('Parámetro guardado'); qc.invalidateQueries({ queryKey: ['cont', 'parametros'] }); }, onError: (e) => m.err(e) });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="tune" title="Parámetros (nómina y generales)" />
        <Tabla cargando={q.isLoading} filas={q.data?.parametros ?? []} clave={(p: any) => p.clave} columnas={[
          { label: 'Parámetro', render: (p: any) => <><b>{p.clave}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>{p.descripcion}</div></> },
          { label: 'Valor', render: (p: any) => <b>{p.valor}</b> },
          { label: '', render: (p: any) => <Btn small variant="ghost" icon="edit" onClick={() => { const v = window.prompt(`Nuevo valor para ${p.clave}:`, p.valor); if (v !== null && v.trim()) guardar.mutate({ clave: p.clave, valor: v.trim() }); }} /> },
        ]} />
      </Card>
    </>
  );
}

function Usuarios() {
  const qc = useQueryClient();
  const m = useMensaje();
  const q = useQuery({ queryKey: ['cont', 'usuarios'], queryFn: () => cont.get<any[]>('/usuarios') });
  const [form, setForm] = useState<any | null>(null);
  const crear = useMutation({ mutationFn: () => cont.post('/usuarios', form), onSuccess: () => { m.ok('Contador creado. Ya puede ingresar al panel.'); setForm(null); qc.invalidateQueries({ queryKey: ['cont', 'usuarios'] }); }, onError: (e) => m.err(e) });
  return (
    <>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="manage_accounts" title="Usuarios con rol CONTADOR">
          <Btn icon="person_add" onClick={() => setForm({ nombre: '', apellido: '', correo: '', documento: '', telefono: '', password: '' })}>Nuevo contador</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data ?? []} clave={(u: any) => u.idusuario} vacio="Sin contadores" columnas={[
          { label: 'Nombre', render: (u: any) => `${u.nombre} ${u.apellido}` }, { label: 'Correo', render: (u: any) => u.correo },
          { label: 'Documento', render: (u: any) => u.documento }, { label: 'Estado', render: (u: any) => <Badge tone={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge> },
        ]} />
      </Card>
      {form && (
        <Modal titulo="Nuevo contador" onClose={() => setForm(null)} ancho={640}>
          <Grid cols={2}>
            {(['nombre', 'apellido', 'correo', 'documento', 'telefono', 'password'] as const).map((k) => (
              <Field key={k} label={{ nombre: 'Nombre', apellido: 'Apellido', correo: 'Correo', documento: 'Documento', telefono: 'Teléfono', password: 'Contraseña (6-12 letras y números)' }[k]} required>
                <input type={k === 'password' ? 'password' : 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={inputStyle} />
              </Field>
            ))}
          </Grid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn icon="save" disabled={Object.values(form).some((v) => !v) || crear.isPending} onClick={() => crear.mutate()}>Crear</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Auditoria() {
  const [tabla, setTabla] = useState('');
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['cont', 'auditoria', tabla, page], queryFn: () => cont.get('/auditoria', { tabla, page, limit: 40 }) });
  const [ver, setVer] = useState<any | null>(null);
  return (
    <Card>
      <CardHeader icon="policy" title="Auditoría de cambios">
        <select value={tabla} onChange={(e) => { setTabla(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Tabla">
          <option value="">Todas las tablas</option>
          {['comprobante', 'cuenta', 'periodo', 'parametrocuenta', 'impuesto', 'tercero', 'turnocaja', 'arqueo', 'caja', 'parametro', 'activofijo', 'pagoproveedor', 'nomina', 'empresa'].map((t) => <option key={t}>{t}</option>)}
        </select>
      </CardHeader>
      <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(a: any) => a.idauditoria} onFila={setVer} columnas={[
        { label: 'Fecha', render: (a: any) => fecha(a.fecha) },
        { label: 'Usuario', render: (a: any) => a.usuario ?? 'Sistema' },
        { label: 'Tabla', render: (a: any) => a.tabla },
        { label: 'Registro', render: (a: any) => a.idregistro },
        { label: 'Acción', render: (a: any) => <Badge tone={a.accion === 'INSERT' ? 'green' : a.accion === 'DELETE' ? 'red' : 'blue'}>{a.accion}</Badge> },
      ]} />
      {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      {ver && (
        <Modal titulo={`${ver.tabla} #${ver.idregistro} · ${ver.accion}`} onClose={() => setVer(null)} ancho={900}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <pre style={{ fontSize: 11, background: '#f8fafc', padding: 10, borderRadius: 8, overflow: 'auto' }}>{ver.antes ? JSON.stringify(ver.antes, null, 2) : '—'}</pre>
            <pre style={{ fontSize: 11, background: '#f8fafc', padding: 10, borderRadius: 8, overflow: 'auto' }}>{ver.despues ? JSON.stringify(ver.despues, null, 2) : '—'}</pre>
          </div>
        </Modal>
      )}
    </Card>
  );
}
