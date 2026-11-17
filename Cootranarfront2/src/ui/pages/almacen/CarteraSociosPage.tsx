import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { almacenApi } from '../../../infrastructure/services/almacenApi';
import {
  Alerta, Badge, BLUE, Btn, Card, CardHeader, Field, Grid, Modal, StatCard, Tabla,
  exportarExcel, fecha, inputStyle, money, useAlmacen, useMensaje,
} from './almacenUi';

export const CarteraSociosPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const { esAdmin } = useAlmacen();
  const [busqueda, setBusqueda] = useState('');
  const [conDeuda, setConDeuda] = useState(false);
  const [cuentaDe, setCuentaDe] = useState<number | null>(null);
  const [cupoDe, setCupoDe] = useState<{ idusuario: number; nombre: string; cupocredito?: string; activo?: boolean } | null>(null);
  const [nuevoCredito, setNuevoCredito] = useState(false);

  const q = useQuery({
    queryKey: ['almacen', 'cartera', busqueda, conDeuda],
    queryFn: () => almacenApi.cartera({ busqueda, conDeuda: conDeuda ? 'true' : undefined }),
  });
  const filas = q.data ?? [];
  const totalDeuda = filas.reduce((a, c) => a + Number(c.saldo), 0);
  const totalCupo = filas.reduce((a, c) => a + Number(c.cupocredito), 0);

  const exportar = () => exportarExcel(`cartera-socios-${new Date().toISOString().slice(0, 10)}`, [{
    nombre: 'Cartera',
    filas: filas.map((c) => ({
      Socio: `${c.nombre} ${c.apellido}`, Documento: c.documento, Teléfono: c.telefono ?? '', Placas: c.placas ?? '',
      Cupo: Number(c.cupocredito), Deuda: Number(c.saldo), Disponible: Number(c.cupocredito) - Number(c.saldo),
      'Último abono': c.ultimoabono ? fecha(c.ultimoabono, false) : '', Activo: c.activo ? 'Sí' : 'No',
    })),
  }]);

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon="account_balance_wallet" label="Cartera por cobrar" valor={money(totalDeuda)} tone="#b45309" />
        <StatCard icon="credit_card" label="Cupo total asignado" valor={money(totalCupo)} />
        <StatCard icon="group" label="Socios con crédito" valor={filas.length} detalle={`${filas.filter((c) => Number(c.saldo) > 0).length} con saldo pendiente`} />
      </div>
      <Card>
        <CardHeader icon="credit_score" title="Crédito de socios">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar socio" style={{ ...inputStyle, width: 200, padding: '7px 10px' }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            <input type="checkbox" checked={conDeuda} onChange={(e) => setConDeuda(e.target.checked)} /> Solo con deuda
          </label>
          <Btn variant="secondary" icon="download" onClick={exportar}>Excel</Btn>
          {esAdmin && <Btn icon="add_card" onClick={() => setNuevoCredito(true)}>Habilitar crédito</Btn>}
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={filas} clave={(c: any) => c.idusuario} onFila={(c: any) => setCuentaDe(c.idusuario)}
          vacio={esAdmin ? 'Ningún socio tiene crédito. Usa «Habilitar crédito».' : 'Ningún socio tiene crédito habilitado.'}
          columnas={[
            { label: 'Socio', render: (c: any) => <><b>{c.nombre} {c.apellido}</b><div style={{ fontSize: 11.5, color: '#64748b' }}>CC {c.documento}</div></> },
            { label: 'Vehículos', render: (c: any) => c.placas ?? '—' },
            { label: 'Cupo', align: 'right', render: (c: any) => money(c.cupocredito) },
            { label: 'Debe', align: 'right', render: (c: any) => <b style={{ color: Number(c.saldo) > 0 ? '#b45309' : '#15803d' }}>{money(c.saldo)}</b> },
            { label: 'Disponible', align: 'right', render: (c: any) => money(Number(c.cupocredito) - Number(c.saldo)) },
            { label: 'Último abono', render: (c: any) => (c.ultimoabono ? fecha(c.ultimoabono, false) : '—') },
            { label: 'Estado', render: (c: any) => <Badge tone={c.activo ? 'green' : 'red'}>{c.activo ? 'Activo' : 'Bloqueado'}</Badge> },
          ]}
        />
      </Card>

      {cuentaDe && (
        <EstadoCuenta idusuario={cuentaDe} esAdmin={esAdmin} onClose={() => setCuentaDe(null)}
          onCupo={(c) => setCupoDe(c)} onAbono={(t) => { m.ok(t); qc.invalidateQueries({ queryKey: ['almacen'] }); }} />
      )}
      {nuevoCredito && <BuscarSocio onClose={() => setNuevoCredito(false)} onElegir={(s) => { setNuevoCredito(false); setCupoDe(s); }} />}
      {cupoDe && (
        <CupoModal socio={cupoDe} onClose={() => setCupoDe(null)}
          onOk={() => { m.ok('Cupo de crédito actualizado'); setCupoDe(null); qc.invalidateQueries({ queryKey: ['almacen'] }); }} />
      )}
    </Layout>
  );
};

function EstadoCuenta({ idusuario, esAdmin, onClose, onCupo, onAbono }: {
  idusuario: number; esAdmin: boolean; onClose: () => void;
  onCupo: (s: { idusuario: number; nombre: string; cupocredito: string; activo: boolean }) => void; onAbono: (t: string) => void;
}) {
  const q = useQuery({ queryKey: ['almacen', 'cuenta', idusuario], queryFn: () => almacenApi.estadoCuenta(idusuario) });
  const metodos = useQuery({ queryKey: ['almacen', 'metodos'], queryFn: almacenApi.metodosPago, staleTime: 300_000 });
  const [valor, setValor] = useState('');
  const [idmetodopago, setIdmetodopago] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');
  const abonar = useMutation({
    mutationFn: () => almacenApi.abonar(idusuario, { valor: Number(valor), idmetodopago: Number(idmetodopago || metodos.data?.[0]?.idmetodopago), observacion }),
    onSuccess: (r: any) => { setValor(''); setObservacion(''); setError(''); q.refetch(); onAbono(`Abono registrado. Nuevo saldo: ${money(r.saldoresultante)}`); },
    onError: (e: any) => setError(e?.response?.data?.message || 'No se pudo registrar el abono'),
  });
  const c = q.data;
  return (
    <Modal titulo={c ? `Estado de cuenta · ${c.nombre} ${c.apellido}` : 'Estado de cuenta'} onClose={onClose} ancho={900}>
      {!c ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>DEBE</div><div style={{ fontSize: 24, fontWeight: 900, color: '#b45309' }}>{money(c.saldo)}</div></div>
            <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>CUPO</div><div style={{ fontSize: 18, fontWeight: 800 }}>{money(c.cupocredito)}</div></div>
            <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>DISPONIBLE</div><div style={{ fontSize: 18, fontWeight: 800, color: BLUE }}>{money(Number(c.cupocredito) - Number(c.saldo))}</div></div>
            {esAdmin && <Btn variant="secondary" icon="tune" onClick={() => onCupo({ idusuario, nombre: `${c.nombre} ${c.apellido}`, cupocredito: c.cupocredito, activo: c.activo })}>Cambiar cupo</Btn>}
          </div>

          {Number(c.saldo) > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Registrar abono</div>
              {error && <Alerta msg={{ tipo: 'err', texto: error }} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                <Field label="Valor" required style={{ flex: '1 1 140px' }}><input type="number" min={1} max={Number(c.saldo)} value={valor} onChange={(e) => setValor(e.target.value)} style={inputStyle} /></Field>
                <Field label="Método" required style={{ flex: '1 1 150px' }}>
                  <select value={idmetodopago} onChange={(e) => setIdmetodopago(e.target.value)} style={inputStyle}>
                    {(metodos.data ?? []).map((mp) => <option key={mp.idmetodopago} value={mp.idmetodopago}>{mp.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Observación" style={{ flex: '2 1 200px' }}><input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. descuento de planilla de noviembre" style={inputStyle} /></Field>
                <Btn variant="secondary" onClick={() => setValor(String(Number(c.saldo)))}>Saldo total</Btn>
                <Btn icon="payments" variant="success" disabled={!(Number(valor) > 0) || Number(valor) > Number(c.saldo) || abonar.isPending} onClick={() => abonar.mutate()}>Abonar</Btn>
              </div>
            </div>
          )}

          <Tabla filas={c.movimientos} clave={(mv: any) => mv.idmovimiento} vacio="Sin movimientos" columnas={[
            { label: 'Fecha', render: (mv: any) => fecha(mv.fecha) },
            { label: 'Tipo', render: (mv: any) => <Badge tone={mv.tipo === 'CARGO' ? 'amber' : mv.tipo === 'ABONO' ? 'green' : 'gray'}>{mv.tipo === 'CARGO' ? 'Compra a crédito' : mv.tipo === 'ABONO' ? 'Abono' : 'Reverso'}</Badge> },
            { label: 'Detalle', render: (mv: any) => <>{mv.observacion ?? mv.consecutivo ?? ''}{mv.metodopago && <div style={{ fontSize: 11.5, color: '#64748b' }}>{mv.metodopago}</div>}</> },
            { label: 'Valor', align: 'right', render: (mv: any) => <b style={{ color: mv.tipo === 'CARGO' ? '#b45309' : '#15803d' }}>{mv.tipo === 'CARGO' ? '+' : '−'}{money(mv.valor)}</b> },
            { label: 'Saldo', align: 'right', render: (mv: any) => money(mv.saldoresultante) },
            { label: 'Registró', render: (mv: any) => <span style={{ fontSize: 12 }}>{mv.registradopor}</span> },
          ]} />
        </>
      )}
    </Modal>
  );
}

function BuscarSocio({ onClose, onElegir }: { onClose: () => void; onElegir: (s: { idusuario: number; nombre: string; cupocredito?: string; activo?: boolean }) => void }) {
  const [texto, setTexto] = useState('');
  const q = useQuery({ queryKey: ['almacen', 'socios', texto], queryFn: () => almacenApi.socios(texto), enabled: texto.trim().length >= 2 });
  return (
    <Modal titulo="Habilitar crédito a un socio" onClose={onClose} ancho={560}>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus placeholder="Nombre, cédula o placa del socio" style={inputStyle} />
      <div style={{ display: 'grid', gap: 6, marginTop: 10, maxHeight: 360, overflowY: 'auto' }}>
        {(q.data ?? []).map((s: any) => (
          <button key={s.idusuario} type="button" onClick={() => onElegir({ idusuario: s.idusuario, nombre: `${s.nombre} ${s.apellido}`, cupocredito: s.cupocredito, activo: true })}
            style={{ textAlign: 'left', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <b style={{ fontSize: 13 }}>{s.nombre} {s.apellido}</b>
            <div style={{ fontSize: 12, color: '#64748b' }}>CC {s.documento} · {s.vehiculos.map((v: any) => v.placa).join(', ') || 'sin vehículos'}{s.creditoactivo ? ` · cupo ${money(s.cupocredito)}` : ''}</div>
          </button>
        ))}
        {q.data && !q.data.length && <span style={{ fontSize: 13, color: '#94a3b8' }}>Sin coincidencias</span>}
      </div>
    </Modal>
  );
}

function CupoModal({ socio, onClose, onOk }: { socio: { idusuario: number; nombre: string; cupocredito?: string; activo?: boolean }; onClose: () => void; onOk: () => void }) {
  const [cupo, setCupo] = useState(String(Number(socio.cupocredito ?? 0) || ''));
  const [activo, setActivo] = useState(socio.activo ?? true);
  const [error, setError] = useState('');
  const guardar = useMutation({
    mutationFn: () => almacenApi.configurarCupo(socio.idusuario, { cupocredito: Number(cupo), activo }),
    onSuccess: onOk,
    onError: (e: any) => setError(e?.response?.data?.message || 'No se pudo guardar'),
  });
  return (
    <Modal titulo={`Cupo de crédito · ${socio.nombre}`} onClose={onClose} ancho={480}>
      {error && <Alerta msg={{ tipo: 'err', texto: error }} />}
      <Grid cols={2}>
        <Field label="Cupo máximo" required><input type="number" min={0} value={cupo} onChange={(e) => setCupo(e.target.value)} style={inputStyle} /></Field>
        <Field label="Estado">
          <select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')} style={inputStyle}>
            <option value="1">Activo (puede comprar a crédito)</option><option value="0">Bloqueado</option>
          </select>
        </Field>
      </Grid>
      <p style={{ fontSize: 12, color: '#64748b' }}>El socio podrá comprar a crédito mientras su deuda no supere el cupo. Bloquear no borra la deuda.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn icon="save" disabled={cupo === '' || Number(cupo) < 0 || guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
      </div>
    </Modal>
  );
}
