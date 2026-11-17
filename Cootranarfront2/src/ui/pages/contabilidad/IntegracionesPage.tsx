import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { Alerta, Badge, Btn, Card, CardHeader, Kpi, Paginador, Tabla, fecha, inputStyle, money, useMensaje } from './contUi';

const tono: Record<string, 'green' | 'amber' | 'red' | 'gray'> = { PROCESADO: 'green', PENDIENTE: 'amber', ERROR: 'red', OMITIDO: 'gray' };

export const IntegracionesPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const [estado, setEstado] = useState('');
  const [origen, setOrigen] = useState('');
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['cont', 'eventos', estado, origen, page], queryFn: () => cont.get('/integraciones/eventos', { estado, origen, page, limit: 40 }), refetchInterval: 20_000 });
  const conc = useQuery({ queryKey: ['cont', 'conciliaciones'], queryFn: () => cont.get('/integraciones/conciliaciones') });
  const procesar = useMutation({
    mutationFn: (incluirErrores: boolean) => cont.post('/integraciones/procesar', { incluirErrores }),
    onSuccess: (r: any) => { m.ok(`Capturados ${r.capturados} · contabilizados ${r.procesados} · omitidos ${r.omitidos} · errores ${r.errores}`); qc.invalidateQueries({ queryKey: ['cont'] }); },
    onError: (e) => m.err(e),
  });
  const reintentar = useMutation({
    mutationFn: (id: number) => cont.post('/integraciones/procesar', { ids: [id] }),
    onSuccess: (r: any) => { if (r.errores) m.err(null, 'El evento volvió a fallar; revisa el mensaje'); else m.ok('Evento contabilizado'); qc.invalidateQueries({ queryKey: ['cont'] }); },
    onError: (e) => m.err(e),
  });
  const n = (s: string) => (conc.data?.eventos ?? []).find((e: any) => e.estado === s)?.n ?? 0;
  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Contabilizados" valor={n('PROCESADO')} tono="#15803d" />
        <Kpi label="Pendientes" valor={n('PENDIENTE')} tono="#b45309" />
        <Kpi label="Con error" valor={n('ERROR')} tono="#b91c1c" />
        <Kpi label="Omitidos (sin valor)" valor={n('OMITIDO')} />
      </div>
      <Card>
        <CardHeader icon="rule" title="Conciliación entre módulos y contabilidad" />
        <Tabla filas={conc.data?.conciliaciones ?? []} clave={(c: any) => c.nombre} columnas={[
          { label: 'Control', render: (c: any) => c.nombre },
          { label: 'Módulo', align: 'right', render: (c: any) => money(c.modulo) },
          { label: 'Contabilidad', align: 'right', render: (c: any) => money(c.contable) },
          { label: 'Diferencia', align: 'right', render: (c: any) => <Badge tone={c.diferencia === 0 ? 'green' : 'amber'}>{money(c.diferencia)}</Badge> },
        ]} />
        <p style={{ padding: '0 20px 12px', fontSize: 12, color: '#64748b' }}>Una diferencia suele indicar eventos pendientes o saldos anteriores a la puesta en marcha (registre saldos iniciales con un comprobante SI).</p>
      </Card>
      <Card>
        <CardHeader icon="sync" title="Eventos contables (documento origen → comprobante)">
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="">Todos</option>{Object.keys(tono).map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={origen} onChange={(e) => { setOrigen(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Origen">
            <option value="">Todos los orígenes</option>{['ALMACEN', 'TRANSPORTE', 'CAJA', 'CXP'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <Btn icon="play_arrow" disabled={procesar.isPending} onClick={() => procesar.mutate(false)}>Procesar ahora</Btn>
          <Btn variant="secondary" icon="replay" disabled={procesar.isPending} onClick={() => procesar.mutate(true)}>Reintentar errores</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(e: any) => e.idevento} columnas={[
          { label: '#', render: (e: any) => e.idevento },
          { label: 'Fecha', render: (e: any) => String(e.fecha).slice(0, 10) },
          { label: 'Origen', render: (e: any) => <><b>{e.origen}</b> · {e.tipoevento} #{e.idorigen}</> },
          { label: 'Estado', render: (e: any) => <Badge tone={tono[e.estado]}>{e.estado}</Badge> },
          { label: 'Comprobante', render: (e: any) => e.comprobante ?? '—' },
          { label: 'Detalle', render: (e: any) => <span style={{ fontSize: 12, color: e.estado === 'ERROR' ? '#b91c1c' : '#64748b' }}>{e.error ?? (e.fechaproceso ? `Procesado ${fecha(e.fechaproceso)}` : '')}</span> },
          { label: '', render: (e: any) => (e.estado === 'ERROR' || e.estado === 'PENDIENTE') && <Btn small variant="secondary" icon="replay" onClick={() => reintentar.mutate(e.idevento)}>Reintentar</Btn> },
        ]} />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>
    </Layout>
  );
};
