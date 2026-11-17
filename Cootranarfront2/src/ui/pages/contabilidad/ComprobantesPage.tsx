import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/layout/Layout';
import { cont, type Cuenta, type Tercero } from '../../../infrastructure/services/contabilidadApi';
import {
  Alerta, Badge, BLUE, Btn, Card, CardHeader, CentroSelect, CuentaSelect, Field, FiltroFechas, Grid, Modal, Paginador, Tabla,
  TerceroPicker, Valor, escHtml, hoyCO, imprimirDocumento, inicioMes, inputStyle, money, pedirMotivo, tablaHtml, useMensaje,
} from './contUi';

const tonoEstado: Record<string, 'green' | 'amber' | 'red' | 'gray'> = { CONTABILIZADO: 'green', BORRADOR: 'amber', ANULADO: 'red', REVERSADO: 'gray' };

interface Linea { cuenta: Cuenta | null; tercero: Tercero | null; idcentro: number | null; debito: string; credito: string; detalle: string }
const lineaVacia = (): Linea => ({ cuenta: null, tercero: null, idcentro: null, debito: '', credito: '', detalle: '' });

export const ComprobantesPage = () => {
  const qc = useQueryClient();
  const m = useMensaje();
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoyCO());
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [ver, setVer] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ id?: number; tipo: string; fecha: string; descripcion: string; lineas: Linea[] } | null>(null);

  const tipos = useQuery({ queryKey: ['cont', 'tipos'], queryFn: () => cont.get<any[]>('/tipos-comprobante'), staleTime: 300_000 });
  const filtros = { desde, hasta, tipo, estado, busqueda, page, limit: 30 };
  const q = useQuery({ queryKey: ['cont', 'comprobantes', filtros], queryFn: () => cont.get('/comprobantes', filtros) });
  const det = useQuery({ queryKey: ['cont', 'comprobante', ver], queryFn: () => cont.get(`/comprobantes/${ver}`), enabled: !!ver });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['cont'] });

  const accion = useMutation({
    mutationFn: ({ id, que, motivo }: { id: number; que: 'contabilizar' | 'anular' | 'reversar'; motivo?: string }) =>
      que === 'reversar' ? cont.post(`/comprobantes/${id}/reversar`, { motivo }) : cont.patch(`/comprobantes/${id}/${que}`, { motivo }),
    onSuccess: (_r, v) => { m.ok({ contabilizar: 'Comprobante contabilizado', anular: 'Borrador anulado', reversar: 'Comprobante reversado con su espejo' }[v.que]); invalidar(); det.refetch(); },
    onError: (e) => m.err(e),
  });

  const totD = editor ? editor.lineas.reduce((a, l) => a + Number(l.debito || 0), 0) : 0;
  const totC = editor ? editor.lineas.reduce((a, l) => a + Number(l.credito || 0), 0) : 0;
  const cuadra = Math.round(totD * 100) === Math.round(totC * 100) && totD > 0;
  const faltantes = editor ? editor.lineas.filter((l) => (Number(l.debito) || Number(l.credito)) && (!l.cuenta || (l.cuenta.exigetercero && !l.tercero) || (l.cuenta.exigecentro && !l.idcentro))) : [];

  const guardar = useMutation({
    mutationFn: (contabilizar: boolean) => {
      const body = {
        tipo: editor!.tipo, fecha: editor!.fecha, descripcion: editor!.descripcion, contabilizar,
        lineas: editor!.lineas.filter((l) => l.cuenta && (Number(l.debito) || Number(l.credito))).map((l) => ({
          idcuenta: l.cuenta!.idcuenta, idtercero: l.tercero?.idtercero, idcentro: l.idcentro, debito: Number(l.debito || 0), credito: Number(l.credito || 0), detalle: l.detalle,
        })),
      };
      return editor!.id ? cont.put(`/comprobantes/${editor!.id}`, body) : cont.post('/comprobantes', body);
    },
    onSuccess: (_r, contabilizar) => { m.ok(contabilizar ? 'Comprobante contabilizado' : 'Borrador guardado'); setEditor(null); invalidar(); },
    onError: (e) => m.err(e),
  });

  const cambiarLinea = (i: number, cambios: Partial<Linea>) => setEditor((e) => (e ? { ...e, lineas: e.lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)) } : e));

  const editarBorrador = (c: any) => setEditor({
    id: c.idcomprobante, tipo: c.tipo, fecha: String(c.fecha).slice(0, 10), descripcion: c.descripcion,
    lineas: c.movimientos.map((x: any) => ({
      cuenta: { idcuenta: x.idcuenta, codigo: x.codigo, nombre: x.cuenta } as Cuenta, tercero: x.idtercero ? { idtercero: x.idtercero, documento: x.documento, nombre: x.tercero } as Tercero : null,
      idcentro: x.idcentro, debito: Number(x.debito) ? String(Number(x.debito)) : '', credito: Number(x.credito) ? String(Number(x.credito)) : '', detalle: x.detalle ?? '',
    })),
  });

  const imprimir = (c: any) => imprimirDocumento(`${c.tipo}-${c.numero}`, `
    <h1>${escHtml(c.nombretipo)} ${escHtml(c.tipo)}-${c.numero}</h1>
    <div class="muted">Fecha ${escHtml(String(c.fecha).slice(0, 10))} · Estado ${escHtml(c.estado)} · Elaboró ${escHtml(c.creadopornombre ?? 'Sistema')}</div>
    <p>${escHtml(c.descripcion)}</p>
    ${tablaHtml([{ t: 'Cuenta' }, { t: 'Tercero' }, { t: 'Centro' }, { t: 'Detalle' }, { t: 'Débito', r: true }, { t: 'Crédito', r: true }],
      c.movimientos.map((x: any) => [`${x.codigo} ${x.cuenta}`, x.tercero ? `${x.documento} ${x.tercero}` : '', x.centro ?? '', x.detalle ?? '', money(x.debito), money(x.credito)]),
      ['', '', '', 'Totales', money(c.totaldebito), money(c.totalcredito)])}
    <p class="muted" style="margin-top:40px">Elaboró: __________________ &nbsp; Revisó: __________________ &nbsp; Aprobó: __________________</p>`);

  return (
    <Layout>
      <Alerta msg={m.msg} onClose={m.cerrar} />
      <Card>
        <CardHeader icon="receipt_long" title="Comprobantes contables">
          <FiltroFechas desde={desde} hasta={hasta} onDesde={(v) => { setDesde(v); setPage(1); }} onHasta={(v) => { setHasta(v); setPage(1); }} />
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {(tipos.data ?? []).map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}
          </select>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '7px 10px' }} aria-label="Estado">
            <option value="">Todos los estados</option>{Object.keys(tonoEstado).map((s) => <option key={s}>{s}</option>)}
          </select>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar descripción" style={{ ...inputStyle, width: 180, padding: '7px 10px' }} />
          <Btn icon="add" onClick={() => setEditor({ tipo: 'CD', fecha: hoyCO(), descripcion: '', lineas: [lineaVacia(), lineaVacia()] })}>Nuevo comprobante</Btn>
        </CardHeader>
        <Tabla cargando={q.isLoading} filas={q.data?.items ?? []} clave={(c: any) => c.idcomprobante} onFila={(c: any) => setVer(c.idcomprobante)} columnas={[
          { label: 'Comprobante', render: (c: any) => <b>{c.tipo}-{c.numero}</b> },
          { label: 'Fecha', render: (c: any) => String(c.fecha).slice(0, 10) },
          { label: 'Descripción', render: (c: any) => <span style={{ fontSize: 12.5 }}>{c.descripcion}</span> },
          { label: 'Origen', render: (c: any) => <span style={{ fontSize: 11.5, color: '#64748b' }}>{c.origen ?? 'Manual'}</span> },
          { label: 'Total', align: 'right', render: (c: any) => <Valor v={c.totaldebito} /> },
          { label: 'Estado', render: (c: any) => <Badge tone={tonoEstado[c.estado]}>{c.estado}</Badge> },
        ]} />
        {q.data && <Paginador pagina={page} totalPaginas={q.data.paginacion.totalPaginas} total={q.data.paginacion.total} onCambio={setPage} />}
      </Card>

      {ver && (
        <Modal titulo={det.data ? `${det.data.nombretipo} ${det.data.tipo}-${det.data.numero}` : 'Comprobante'} onClose={() => setVer(null)} ancho={1000}>
          {!det.data ? <p style={{ color: '#94a3b8' }}>Cargando…</p> : (
            <>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
                {String(det.data.fecha).slice(0, 10)} · <Badge tone={tonoEstado[det.data.estado]}>{det.data.estado}</Badge> · {det.data.descripcion}
                {det.data.evento && <div>Documento origen: <b>{det.data.evento.origen} · {det.data.evento.tipoevento} #{det.data.evento.idorigen}</b></div>}
                {det.data.tiporeversado && <div>Reversa el comprobante <b>{det.data.tiporeversado}-{det.data.numeroreversado}</b></div>}
                {det.data.reverso && <div>Reversado por el comprobante <b>RV-{det.data.reverso.numero}</b>{det.data.motivo ? ` · ${det.data.motivo}` : ''}</div>}
              </div>
              <Tabla filas={det.data.movimientos} clave={(x: any) => x.idmovimiento} columnas={[
                { label: 'Cuenta', render: (x: any) => <><b>{x.codigo}</b> {x.cuenta}</> },
                { label: 'Tercero', render: (x: any) => (x.tercero ? <span style={{ fontSize: 12 }}>{x.documento} · {x.tercero}</span> : '—') },
                { label: 'Centro', render: (x: any) => x.centro ?? '—' },
                { label: 'Detalle', render: (x: any) => <span style={{ fontSize: 12 }}>{x.detalle ?? ''}</span> },
                { label: 'Débito', align: 'right', render: (x: any) => (Number(x.debito) ? money(x.debito) : '') },
                { label: 'Crédito', align: 'right', render: (x: any) => (Number(x.credito) ? money(x.credito) : '') },
              ]} />
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 13 }}>Débitos <b>{money(det.data.totaldebito)}</b> · Créditos <b>{money(det.data.totalcredito)}</b></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="secondary" icon="print" onClick={() => imprimir(det.data)}>Imprimir</Btn>
                  {det.data.estado === 'BORRADOR' && <>
                    <Btn variant="secondary" icon="edit" onClick={() => { editarBorrador(det.data); setVer(null); }}>Editar</Btn>
                    <Btn variant="danger" icon="block" onClick={() => { const mo = pedirMotivo('anular el borrador'); if (mo) accion.mutate({ id: det.data.idcomprobante, que: 'anular', motivo: mo }); }}>Anular</Btn>
                    <Btn variant="success" icon="task_alt" onClick={() => accion.mutate({ id: det.data.idcomprobante, que: 'contabilizar' })}>Contabilizar</Btn>
                  </>}
                  {det.data.estado === 'CONTABILIZADO' && (
                    <Btn variant="danger" icon="undo" onClick={() => { const mo = pedirMotivo('reversar el comprobante'); if (mo) accion.mutate({ id: det.data.idcomprobante, que: 'reversar', motivo: mo }); }}>Reversar</Btn>
                  )}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      {editor && (
        <Modal titulo={editor.id ? 'Editar borrador' : 'Nuevo comprobante'} onClose={() => setEditor(null)} ancho={1150}>
          <Grid cols={3}>
            <Field label="Tipo" required>
              <select value={editor.tipo} onChange={(e) => setEditor({ ...editor, tipo: e.target.value })} style={inputStyle} disabled={!!editor.id}>
                {(tipos.data ?? []).filter((t) => t.manual).map((t) => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}
              </select>
            </Field>
            <Field label="Fecha" required><input type="date" value={editor.fecha} onChange={(e) => setEditor({ ...editor, fecha: e.target.value })} style={inputStyle} /></Field>
            <Field label="Descripción" required><input value={editor.descripcion} onChange={(e) => setEditor({ ...editor, descripcion: e.target.value })} style={inputStyle} /></Field>
          </Grid>
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr style={{ background: '#f8fafc', fontSize: 10.5, color: '#64748b', textTransform: 'uppercase' }}>
                {['Cuenta', 'Tercero', 'Centro', 'Detalle', 'Débito', 'Crédito', ''].map((h) => <th key={h} style={{ padding: 8, textAlign: 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {editor.lineas.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: 4, width: 260 }}><CuentaSelect value={l.cuenta?.idcuenta ?? null} onChange={(c) => cambiarLinea(i, { cuenta: c })} /></td>
                    <td style={{ padding: 4, width: 220 }}><TerceroPicker value={l.tercero} onChange={(t) => cambiarLinea(i, { tercero: t })} placeholder={l.cuenta?.exigetercero ? 'Tercero (obligatorio)' : 'Tercero'} /></td>
                    <td style={{ padding: 4, width: 170 }}><CentroSelect value={l.idcentro} onChange={(id) => cambiarLinea(i, { idcentro: id })} /></td>
                    <td style={{ padding: 4 }}><input value={l.detalle} onChange={(e) => cambiarLinea(i, { detalle: e.target.value })} style={inputStyle} /></td>
                    <td style={{ padding: 4, width: 120 }}><input type="number" min={0} value={l.debito} onChange={(e) => cambiarLinea(i, { debito: e.target.value, credito: e.target.value ? '' : l.credito })} style={{ ...inputStyle, textAlign: 'right' }} aria-label="Débito" /></td>
                    <td style={{ padding: 4, width: 120 }}><input type="number" min={0} value={l.credito} onChange={(e) => cambiarLinea(i, { credito: e.target.value, debito: e.target.value ? '' : l.debito })} style={{ ...inputStyle, textAlign: 'right' }} aria-label="Crédito" /></td>
                    <td style={{ padding: 4 }}><Btn small variant="ghost" icon="delete" title="Quitar" onClick={() => setEditor({ ...editor, lineas: editor.lineas.filter((_, j) => j !== i) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Btn variant="secondary" icon="add" onClick={() => setEditor({ ...editor, lineas: [...editor.lineas, lineaVacia()] })}>Línea</Btn>
            <span style={{ fontSize: 13 }}>
              Débitos <b>{money(totD)}</b> · Créditos <b>{money(totC)}</b> ·{' '}
              <b style={{ color: cuadra ? '#15803d' : '#b91c1c' }}>{cuadra ? 'Cuadrado' : `Diferencia ${money(totD - totC)}`}</b>
            </span>
          </div>
          {faltantes.length > 0 && <p style={{ fontSize: 12.5, color: '#b91c1c' }}>Hay líneas sin cuenta o con tercero/centro obligatorio pendiente.</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => setEditor(null)}>Cancelar</Btn>
            <Btn variant="secondary" icon="save" disabled={!editor.descripcion.trim() || guardar.isPending} onClick={() => guardar.mutate(false)}>Guardar borrador</Btn>
            <Btn variant="success" icon="task_alt" disabled={!cuadra || faltantes.length > 0 || !editor.descripcion.trim() || guardar.isPending} onClick={() => guardar.mutate(true)}>Contabilizar</Btn>
          </div>
          <p style={{ fontSize: 11.5, color: BLUE, marginBottom: 0 }}>Un comprobante contabilizado no se edita ni se borra: se corrige con un reverso.</p>
        </Modal>
      )}
    </Layout>
  );
};
