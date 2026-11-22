import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import adminBaseDatosApi, {
  type TablaBD, type PaginaFilas, type FilaBD, type ClaveFila,
  type ImpactoEliminar, type ImpactoVaciar, type RegistroAuditoriaBD,
} from '../../../infrastructure/services/adminBaseDatosApi';
import {
  C, FONT, TH, TD, inputStyle, labelStyle,
  botonPrimario, botonSecundario, botonPeligro, botonIcono,
} from '../../components/millas/estilosMillas';
import { Aviso, Modal } from './componentesBaseDatos';
import { mensajeError } from './mensajeError';
import { BackupsPanel } from './BackupsPanel';

type Pestania = 'tablas' | 'limpiar' | 'backups' | 'auditoria';

const PESTANIAS: Array<{ id: Pestania; label: string; icono: string }> = [
  { id: 'tablas', label: 'Tablas', icono: 'table_view' },
  { id: 'limpiar', label: 'Limpiar base de datos', icono: 'cleaning_services' },
  { id: 'backups', label: 'Backups y deshacer', icono: 'backup' },
  { id: 'auditoria', label: 'Auditoría', icono: 'history' },
];

const LIMITE = 25;
const nombreCompleto = (t: { schema: string; tabla: string }) => `${t.schema}.${t.tabla}`;

const mostrarValor = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const claveDeFila = (fila: FilaBD, pk: string[]): ClaveFila =>
  pk.length ? Object.fromEntries(pk.map(c => [c, fila[c]])) : { __ctid: fila.__ctid };

const idFila = (fila: FilaBD, pk: string[]) => JSON.stringify(claveDeFila(fila, pk));

/** Pide escribir un texto exacto antes de habilitar una acción destructiva. */
const ConfirmarEscribiendo = ({ texto, valor, onChange }: { texto: string; valor: string; onChange: (v: string) => void }) => (
  <div style={{ marginTop: '12px' }}>
    <label style={labelStyle}>Para confirmar escribe: <code style={{ color: C.error, textTransform: 'none' }}>{texto}</code></label>
    <input value={valor} onChange={e => onChange(e.target.value)} style={inputStyle} autoComplete="off" spellCheck={false} />
  </div>
);

const TablaImpactoVaciar = ({ impacto }: { impacto: ImpactoVaciar }) => (
  <div style={{ maxHeight: 260, overflow: 'auto', border: `1px solid ${C.outlineVariant}`, borderRadius: 9 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={TH}>Tabla</th><th style={TH}>Filas</th><th style={TH}>Motivo</th></tr></thead>
      <tbody>
        {impacto.tablas.map(t => (
          <tr key={nombreCompleto(t)}>
            <td style={{ ...TD, color: t.protegida ? C.error : C.onSurface, fontWeight: t.motivo === 'seleccionada' ? 800 : 500 }}>
              {nombreCompleto(t)}{t.protegida ? ' (protegida)' : ''}
            </td>
            <td style={TD}>{t.filas.toLocaleString('es-CO')}</td>
            <td style={{ ...TD, fontSize: 12, color: C.onSurfaceVariant }}>{t.motivo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Página ───────────────────────────────────────────────────────────────────
export const BaseDatosPage = () => {
  const [pestania, setPestania] = useState<Pestania>('tablas');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'warning'; texto: string; idrespaldo?: number | null } | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [senalBackups, setSenalBackups] = useState(0);
  const [tablas, setTablas] = useState<TablaBD[]>([]);
  const [cargandoTablas, setCargandoTablas] = useState(false);
  const [filtroTablas, setFiltroTablas] = useState('');

  const [seleccion, setSeleccion] = useState<TablaBD | null>(null);
  const [datos, setDatos] = useState<PaginaFilas | null>(null);
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState('');
  const [buscarAplicado, setBuscarAplicado] = useState('');
  const [cargandoFilas, setCargandoFilas] = useState(false);
  const [marcadas, setMarcadas] = useState<Record<string, ClaveFila>>({});

  const [modalEliminar, setModalEliminar] = useState<{ claves: ClaveFila[]; impacto: ImpactoEliminar | null } | null>(null);
  const [cascada, setCascada] = useState(false);
  const [modalVaciar, setModalVaciar] = useState<{ tablas: string[]; impacto: ImpactoVaciar | null } | null>(null);
  const [modalEditar, setModalEditar] = useState<FilaBD | null>(null);
  const [confirmacion, setConfirmacion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const temporizador = useRef<number | undefined>(undefined);
  const notificar = (tipo: 'ok' | 'error' | 'warning', texto: string, idrespaldo?: number | null) => {
    setMensaje({ tipo, texto, idrespaldo });
    window.clearTimeout(temporizador.current);
    // Con opción de deshacer el aviso queda más tiempo a la vista
    temporizador.current = window.setTimeout(() => setMensaje(null), idrespaldo ? 30000 : 6000);
  };

  const deshacerUltima = async (idrespaldo: number) => {
    setDeshaciendo(true);
    try {
      const r = await adminBaseDatosApi.deshacer(idrespaldo);
      notificar(r.avisos.length ? 'warning' : 'ok', `Operación deshecha: ${r.totalFilas.toLocaleString('es-CO')} fila(s) restauradas.${r.avisos.length ? ` ${r.avisos.join(' ')}` : ''}`);
      cargarTablas();
      cargarFilas();
      setSenalBackups(n => n + 1);
    } catch (err) {
      notificar('error', mensajeError(err, 'No se pudo deshacer la operación.'));
    } finally {
      setDeshaciendo(false);
    }
  };

  const cargarTablas = useCallback(async () => {
    setCargandoTablas(true);
    try {
      setTablas(await adminBaseDatosApi.listarTablas());
    } catch (err) {
      notificar('error', mensajeError(err, 'No se pudieron cargar las tablas.'));
    } finally {
      setCargandoTablas(false);
    }
  }, []);

  const cargarFilas = useCallback(async () => {
    if (!seleccion) return;
    setCargandoFilas(true);
    try {
      setDatos(await adminBaseDatosApi.obtenerFilas(seleccion.schema, seleccion.tabla, { pagina, limite: LIMITE, buscar: buscarAplicado || undefined }));
    } catch (err) {
      setDatos(null);
      notificar('error', mensajeError(err, 'No se pudieron cargar las filas.'));
    } finally {
      setCargandoFilas(false);
    }
  }, [seleccion, pagina, buscarAplicado]);

  useEffect(() => { cargarTablas(); }, [cargarTablas]);
  useEffect(() => { cargarFilas(); }, [cargarFilas]);

  const elegirTabla = (t: TablaBD) => {
    setSeleccion(t);
    setPagina(1);
    setBuscar('');
    setBuscarAplicado('');
    setMarcadas({});
  };

  const tablasFiltradas = useMemo(() => {
    const f = filtroTablas.trim().toLowerCase();
    return tablas.filter(t => !f || nombreCompleto(t).toLowerCase().includes(f));
  }, [tablas, filtroTablas]);

  const cerrarModales = () => {
    setModalEliminar(null);
    setModalVaciar(null);
    setModalEditar(null);
    setConfirmacion('');
    setErrorModal(null);
    setProcesando(false);
  };

  // ── Eliminar filas ──
  const abrirEliminar = async (claves: ClaveFila[]) => {
    if (!seleccion || !claves.length) return;
    setModalEliminar({ claves, impacto: null });
    setErrorModal(null);
    try {
      const impacto = await adminBaseDatosApi.impactoEliminar(seleccion.schema, seleccion.tabla, claves);
      setModalEliminar({ claves, impacto });
      setCascada(impacto.dependencias.some(d => d.accion === 'ELIMINAR'));
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo calcular el impacto.'));
    }
  };

  const ejecutarEliminar = async () => {
    if (!seleccion || !modalEliminar) return;
    setProcesando(true);
    setErrorModal(null);
    try {
      const r = await adminBaseDatosApi.eliminarFilas(seleccion.schema, seleccion.tabla, modalEliminar.claves, cascada);
      const total = Object.values(r.eliminadas).reduce((a, n) => a + n, 0);
      cerrarModales();
      setMarcadas({});
      notificar('ok', `Se eliminaron ${total.toLocaleString('es-CO')} filas (${Object.entries(r.eliminadas).map(([t, n]) => `${t}: ${n}`).join(', ')}).${r.idbackup ? ` Antes se creó el backup completo #${r.idbackup}.` : ''}`, r.idrespaldo);
      cargarFilas();
      cargarTablas();
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo eliminar.'));
      setProcesando(false);
    }
  };

  // ── Vaciar tablas ──
  const abrirVaciar = async (lista: string[]) => {
    if (!lista.length) return;
    setModalVaciar({ tablas: lista, impacto: null });
    setErrorModal(null);
    try {
      setModalVaciar({ tablas: lista, impacto: await adminBaseDatosApi.impactoVaciar(lista) });
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo calcular el impacto.'));
    }
  };

  const textoConfirmacionVaciar = modalVaciar?.tablas.length === 1 ? modalVaciar.tablas[0] : 'LIMPIAR BASE DE DATOS';

  const ejecutarVaciar = async () => {
    if (!modalVaciar) return;
    setProcesando(true);
    setErrorModal(null);
    try {
      const r = await adminBaseDatosApi.vaciar(modalVaciar.tablas, confirmacion);
      cerrarModales();
      setMarcadosLimpieza({});
      notificar(r.aviso ? 'warning' : 'ok', `Se vaciaron ${r.tablasVaciadas} tablas (${r.filasEliminadas.toLocaleString('es-CO')} filas).${r.idbackup ? ` Backup previo: #${r.idbackup}.` : ''}${r.aviso ? ` ${r.aviso}` : ''}`, r.idrespaldo);
      cargarTablas();
      cargarFilas();
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo vaciar.'));
      setProcesando(false);
    }
  };

  // ── Editar fila ──
  const [edicion, setEdicion] = useState<Record<string, { valor: string; nulo: boolean }>>({});
  const abrirEditar = (fila: FilaBD) => {
    if (!datos) return;
    setEdicion(Object.fromEntries(datos.columnas.map(c => [c.nombre, { valor: mostrarValor(fila[c.nombre]), nulo: fila[c.nombre] === null }])));
    setModalEditar(fila);
    setErrorModal(null);
  };

  const guardarEdicion = async () => {
    if (!seleccion || !datos || !modalEditar) return;
    const cambios: Record<string, unknown> = {};
    for (const c of datos.columnas) {
      if (c.pk) continue;
      const e = edicion[c.nombre];
      const original = modalEditar[c.nombre];
      const nuevo = e.nulo ? null : e.valor;
      if (nuevo === null ? original !== null : mostrarValor(original) !== nuevo) cambios[c.nombre] = nuevo;
    }
    if (!Object.keys(cambios).length) { cerrarModales(); return; }
    setProcesando(true);
    setErrorModal(null);
    try {
      await adminBaseDatosApi.actualizarFila(seleccion.schema, seleccion.tabla, claveDeFila(modalEditar, datos.pk), cambios);
      cerrarModales();
      notificar('ok', 'Fila actualizada.');
      cargarFilas();
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo guardar.'));
      setProcesando(false);
    }
  };

  // ── Limpieza masiva ──
  const [marcadosLimpieza, setMarcadosLimpieza] = useState<Record<string, boolean>>({});
  const [filtroLimpieza, setFiltroLimpieza] = useState('');
  const tablasLimpieza = useMemo(() => {
    const f = filtroLimpieza.trim().toLowerCase();
    return tablas.filter(t => !t.protegida && (!f || nombreCompleto(t).toLowerCase().includes(f)));
  }, [tablas, filtroLimpieza]);
  const seleccionLimpieza = Object.entries(marcadosLimpieza).filter(([, v]) => v).map(([k]) => k);

  // ── Auditoría ──
  const [auditoria, setAuditoria] = useState<RegistroAuditoriaBD[]>([]);
  useEffect(() => {
    if (pestania !== 'auditoria') return;
    adminBaseDatosApi.auditoria(200).then(setAuditoria).catch(err => notificar('error', mensajeError(err, 'No se pudo cargar la auditoría.')));
  }, [pestania]);

  const totalPaginas = datos ? Math.max(Math.ceil(datos.total / LIMITE), 1) : 1;
  const filasMarcadas = Object.values(marcadas);

  return (
    <Layout>
      <div style={{ marginBottom: '16px', fontFamily: FONT }}>
        <p style={{ fontSize: '13.5px', color: C.onSurfaceVariant, margin: 0, fontWeight: 500 }}>
          Consulta, edita y elimina registros de cualquier tabla. Antes de borrar se muestra qué otros registros
          dependen de los elegidos; con "en cascada" se eliminan también. Todo queda en la auditoría.
        </p>
      </div>

      <Aviso tipo="warning">
        Los cambios hechos aquí no pasan por las reglas de negocio de cada módulo. Cada borrado se puede deshacer durante
        30 días (pestaña "Backups y deshacer") y antes de vaciar o limpiar se crea un backup completo.
        Las tablas de usuarios y roles están protegidas para que no pierdas el acceso.
      </Aviso>

      {mensaje && (
        <Aviso tipo={mensaje.tipo}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{mensaje.texto}</span>
            {mensaje.idrespaldo && (
              <button style={botonSecundario} disabled={deshaciendo} onClick={() => deshacerUltima(mensaje.idrespaldo as number)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>undo</span>{deshaciendo ? 'Deshaciendo…' : 'Deshacer'}
              </button>
            )}
          </div>
        </Aviso>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {PESTANIAS.map(p => {
          const activa = p.id === pestania;
          return (
            <button key={p.id} onClick={() => setPestania(p.id)} aria-pressed={activa} style={{
              ...botonSecundario,
              background: activa ? C.primary : '#fff', color: activa ? '#fff' : C.primary,
              borderColor: activa ? C.primary : C.outlineVariant,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{p.icono}</span>{p.label}
            </button>
          );
        })}
      </div>

      {/* ═══ TABLAS ═══ */}
      {pestania === 'tablas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '16px', alignItems: 'start', fontFamily: FONT }}>
          <div style={{ background: '#fff', border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: 12, position: 'sticky', top: 12 }}>
            <input placeholder="Buscar tabla..." value={filtroTablas} onChange={e => setFiltroTablas(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ maxHeight: '65vh', overflow: 'auto' }}>
              {cargandoTablas && <p style={{ fontSize: 13, color: C.outline }}>Cargando...</p>}
              {tablasFiltradas.map(t => {
                const activa = seleccion && nombreCompleto(seleccion) === nombreCompleto(t);
                return (
                  <button key={nombreCompleto(t)} onClick={() => elegirTabla(t)} style={{
                    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: activa ? C.secondaryFixed : 'transparent', cursor: 'pointer', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: activa ? 800 : 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.schema !== 'public' && <span style={{ color: C.outline }}>{t.schema}.</span>}{t.tabla}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.outline, flexShrink: 0 }}>
                      {t.protegida && <span className="material-symbols-outlined" style={{ fontSize: 14 }} title="Protegida">lock</span>}
                      ~{t.filasAprox.toLocaleString('es-CO')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: 16, minWidth: 0 }}>
            {!seleccion ? (
              <p style={{ color: C.outline, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>Elige una tabla para ver su contenido.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.primary }}>
                      {nombreCompleto(seleccion)} {seleccion.protegida && <span style={{ fontSize: 12, color: C.warning }}>(protegida)</span>}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: C.onSurfaceVariant }}>
                      {datos ? `${datos.total.toLocaleString('es-CO')} filas` : '...'} · referenciada por {seleccion.referenciadaPor} relación(es)
                      {datos && !datos.pk.length && ' · sin llave primaria'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={botonPeligro} disabled={!filasMarcadas.length} onClick={() => abrirEliminar(filasMarcadas)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>Eliminar seleccionadas ({filasMarcadas.length})
                    </button>
                    {!seleccion.protegida && (
                      <button style={botonPeligro} onClick={() => abrirVaciar([nombreCompleto(seleccion)])}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_sweep</span>Vaciar tabla
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={e => { e.preventDefault(); setPagina(1); setBuscarAplicado(buscar); }} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input placeholder="Buscar en cualquier columna..." value={buscar} onChange={e => setBuscar(e.target.value)} style={inputStyle} />
                  <button type="submit" style={botonSecundario}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span></button>
                </form>

                <div style={{ overflow: 'auto', border: `1px solid ${C.outlineVariant}`, borderRadius: 9, maxHeight: '60vh' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ ...TH, width: 36 }}>
                          <input type="checkbox" aria-label="Seleccionar página"
                            checked={!!datos?.filas.length && datos.filas.every(f => marcadas[idFila(f, datos.pk)])}
                            onChange={e => {
                              if (!datos) return;
                              const nuevas = { ...marcadas };
                              for (const f of datos.filas) {
                                const id = idFila(f, datos.pk);
                                if (e.target.checked) nuevas[id] = claveDeFila(f, datos.pk); else delete nuevas[id];
                              }
                              setMarcadas(nuevas);
                            }} />
                        </th>
                        <th style={{ ...TH, width: 80 }}>Acciones</th>
                        {datos?.columnas.map(c => (
                          <th key={c.nombre} style={TH} title={`${c.tipo}${c.nulo ? '' : ' · obligatorio'}`}>
                            {c.pk && <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle' }}>key</span>} {c.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cargandoFilas && <tr><td style={TD} colSpan={99}>Cargando...</td></tr>}
                      {!cargandoFilas && datos?.filas.length === 0 && <tr><td style={{ ...TD, color: C.outline }} colSpan={99}>Sin registros.</td></tr>}
                      {!cargandoFilas && datos?.filas.map(f => {
                        const id = idFila(f, datos.pk);
                        return (
                          <tr key={id} style={{ background: marcadas[id] ? C.surfaceContainerLow : undefined }}>
                            <td style={TD}>
                              <input type="checkbox" checked={!!marcadas[id]} aria-label="Seleccionar fila" onChange={e => {
                                const nuevas = { ...marcadas };
                                if (e.target.checked) nuevas[id] = claveDeFila(f, datos.pk); else delete nuevas[id];
                                setMarcadas(nuevas);
                              }} />
                            </td>
                            <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                              <button style={botonIcono} title="Editar" aria-label="Editar fila" onClick={() => abrirEditar(f)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>{' '}
                              <button style={botonPeligro} title="Eliminar" aria-label="Eliminar fila" onClick={() => abrirEliminar([claveDeFila(f, datos.pk)])}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                              </button>
                            </td>
                            {datos.columnas.map(c => {
                              const v = f[c.nombre];
                              const texto = mostrarValor(v);
                              return (
                                <td key={c.nombre} style={{ ...TD, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={texto}>
                                  {v === null || v === undefined ? <span style={{ color: C.outline, fontStyle: 'italic' }}>NULL</span> : texto}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: C.onSurfaceVariant }}>
                  <span>Página {pagina} de {totalPaginas}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={botonSecundario} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
                    <button style={botonSecundario} disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ LIMPIAR ═══ */}
      {pestania === 'limpiar' && (
        <div style={{ background: '#fff', border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: 16, fontFamily: FONT }}>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: C.onSurfaceVariant }}>
            Elige las tablas a vaciar. Al calcular el impacto verás también las tablas que dependen de ellas,
            que se vaciarán automáticamente. Usuarios, roles y la auditoría nunca se vacían.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input placeholder="Filtrar tablas..." value={filtroLimpieza} onChange={e => setFiltroLimpieza(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }} />
            <button style={botonSecundario} onClick={() => setMarcadosLimpieza(m => ({ ...m, ...Object.fromEntries(tablasLimpieza.map(t => [nombreCompleto(t), true])) }))}>Marcar visibles</button>
            <button style={botonSecundario} onClick={() => setMarcadosLimpieza({})}>Desmarcar todo</button>
            <button style={botonPrimario(!seleccionLimpieza.length)} disabled={!seleccionLimpieza.length} onClick={() => abrirVaciar(seleccionLimpieza)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cleaning_services</span>
              Calcular impacto y limpiar ({seleccionLimpieza.length})
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 6, maxHeight: '55vh', overflow: 'auto' }}>
            {tablasLimpieza.map(t => {
              const k = nombreCompleto(t);
              return (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${marcadosLimpieza[k] ? C.secondary : C.outlineVariant}`, background: marcadosLimpieza[k] ? C.surfaceContainerLow : '#fff', fontSize: 13,
                }}>
                  <input type="checkbox" checked={!!marcadosLimpieza[k]} onChange={e => setMarcadosLimpieza(m => ({ ...m, [k]: e.target.checked }))} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span>
                  <span style={{ fontSize: 11, color: C.outline }}>~{t.filasAprox.toLocaleString('es-CO')}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ BACKUPS ═══ */}
      {pestania === 'backups' && <BackupsPanel recargarSenal={senalBackups} onCambio={() => { cargarTablas(); cargarFilas(); }} />}

      {/* ═══ AUDITORÍA ═══ */}
      {pestania === 'auditoria' && (
        <div style={{ background: '#fff', border: `1px solid ${C.outlineVariant}`, borderRadius: 12, overflow: 'auto', fontFamily: FONT }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Fecha</th><th style={TH}>Usuario</th><th style={TH}>Acción</th><th style={TH}>Tabla</th><th style={TH}>Detalle</th></tr></thead>
            <tbody>
              {auditoria.length === 0 && <tr><td style={{ ...TD, color: C.outline }} colSpan={5}>Sin operaciones registradas.</td></tr>}
              {auditoria.map(a => (
                <tr key={a.idauditoria}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{new Date(a.fecha).toLocaleString('es-CO')}</td>
                  <td style={TD}>{a.usuario ?? '—'}</td>
                  <td style={{ ...TD, fontWeight: 700 }}>{a.accion.replace(/_/g, ' ')}</td>
                  <td style={TD}>{a.tabla ? `${a.esquema}.${a.tabla}` : '—'}</td>
                  <td style={{ ...TD, fontSize: 12 }}>
                    <details>
                      <summary style={{ cursor: 'pointer', color: C.secondary }}>Ver</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', maxWidth: 520, maxHeight: 240, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(a.detalle, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ MODAL ELIMINAR ═══ */}
      {modalEliminar && seleccion && (
        <Modal titulo={`Eliminar de ${nombreCompleto(seleccion)}`} icono="delete_forever" peligro onCerrar={cerrarModales}>
          {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
          {!modalEliminar.impacto && !errorModal && <p style={{ fontSize: 13 }}>Calculando qué registros dependen de la selección...</p>}
          {modalEliminar.impacto && (() => {
            const imp = modalEliminar.impacto;
            const aEliminar = imp.dependencias.filter(d => d.accion === 'ELIMINAR');
            const aNulos = imp.dependencias.filter(d => d.accion === 'VACIAR_REFERENCIA');
            return (
              <>
                <p style={{ fontSize: 13.5, margin: '0 0 10px' }}>
                  Vas a eliminar <strong>{imp.seleccionadas}</strong> fila(s) de <strong>{nombreCompleto(seleccion)}</strong>.
                </p>
                {imp.dependencias.length > 0 ? (
                  <>
                    <p style={{ fontSize: 13, margin: '0 0 6px', color: C.onSurfaceVariant }}>Registros relacionados:</p>
                    <div style={{ maxHeight: 220, overflow: 'auto', border: `1px solid ${C.outlineVariant}`, borderRadius: 9, marginBottom: 10 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr><th style={TH}>Relación</th><th style={TH}>Filas</th><th style={TH}>Qué pasa</th></tr></thead>
                        <tbody>
                          {imp.dependencias.map((d, i) => (
                            <tr key={i}>
                              <td style={{ ...TD, fontSize: 12, color: d.protegida ? C.error : C.onSurface }}>{d.ruta}</td>
                              <td style={TD}>{d.filas.toLocaleString('es-CO')}</td>
                              <td style={{ ...TD, fontSize: 12 }}>
                                {d.accion === 'ELIMINAR' ? (cascada ? 'Se elimina' : 'Impide borrar') : `Queda sin referencia (${d.columnas.join(', ')} = NULL)`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {aEliminar.length > 0 && (
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                        <input type="checkbox" checked={cascada} onChange={e => setCascada(e.target.checked)} disabled={imp.bloqueadaPorProtegidas} />
                        Eliminar en cascada ({aEliminar.reduce((a, d) => a + d.filas, 0).toLocaleString('es-CO')} registros relacionados)
                      </label>
                    )}
                    {imp.bloqueadaPorProtegidas && <Aviso tipo="error">La cascada alcanza una tabla protegida. Elimina esas referencias primero.</Aviso>}
                    {aEliminar.length > 0 && !cascada && <Aviso tipo="warning">Sin cascada la eliminación fallará porque hay registros que dependen de estas filas.</Aviso>}
                    {aNulos.length > 0 && <p style={{ fontSize: 12, color: C.onSurfaceVariant }}>Las relaciones marcadas "sin referencia" se conservan, solo pierden el enlace.</p>}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: C.success }}>Ningún otro registro depende de esta selección.</p>
                )}
                <ConfirmarEscribiendo texto="ELIMINAR" valor={confirmacion} onChange={setConfirmacion} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button style={botonSecundario} onClick={cerrarModales}>Cancelar</button>
                  <button
                    style={{ ...botonPrimario(procesando || confirmacion !== 'ELIMINAR' || (imp.bloqueadaPorProtegidas && cascada)), background: C.error }}
                    disabled={procesando || confirmacion !== 'ELIMINAR' || (imp.bloqueadaPorProtegidas && cascada)}
                    onClick={ejecutarEliminar}>
                    {procesando ? 'Eliminando...' : `Eliminar ${cascada ? imp.totalAEliminar : imp.seleccionadas} fila(s)`}
                  </button>
                </div>
              </>
            );
          })()}
        </Modal>
      )}

      {/* ═══ MODAL VACIAR / LIMPIAR ═══ */}
      {modalVaciar && (
        <Modal titulo={modalVaciar.tablas.length === 1 ? `Vaciar ${modalVaciar.tablas[0]}` : 'Limpiar base de datos'} icono="delete_sweep" peligro onCerrar={cerrarModales} ancho={720}>
          {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
          {!modalVaciar.impacto && !errorModal && <p style={{ fontSize: 13 }}>Calculando tablas afectadas...</p>}
          {modalVaciar.impacto && (
            <>
              <p style={{ fontSize: 13.5, margin: '0 0 10px' }}>
                Se vaciarán <strong>{modalVaciar.impacto.tablas.length}</strong> tabla(s) con <strong>{modalVaciar.impacto.totalFilas.toLocaleString('es-CO')}</strong> filas en total.
                Los contadores de id vuelven a empezar.
              </p>
              <Aviso tipo="info">
                Antes de vaciar se crea un backup completo de la base de datos (puede tardar alrededor de un minuto)
                {modalVaciar.impacto.totalFilas <= 20000 ? ' y la operación se podrá deshacer.' : '. Son demasiadas filas para deshacer desde el panel: solo quedará el backup completo.'}
              </Aviso>
              <TablaImpactoVaciar impacto={modalVaciar.impacto} />
              {modalVaciar.impacto.bloqueadaPorProtegidas && <div style={{ marginTop: 10 }}><Aviso tipo="error">La operación alcanzaría una tabla protegida y no se puede ejecutar.</Aviso></div>}
              <ConfirmarEscribiendo texto={textoConfirmacionVaciar} valor={confirmacion} onChange={setConfirmacion} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button style={botonSecundario} onClick={cerrarModales}>Cancelar</button>
                <button
                  style={{ ...botonPrimario(procesando || confirmacion !== textoConfirmacionVaciar || modalVaciar.impacto.bloqueadaPorProtegidas), background: C.error }}
                  disabled={procesando || confirmacion !== textoConfirmacionVaciar || modalVaciar.impacto.bloqueadaPorProtegidas}
                  onClick={ejecutarVaciar}>
                  {procesando ? 'Creando backup y vaciando…' : 'Vaciar'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {modalEditar && datos && seleccion && (
        <Modal titulo={`Editar fila de ${nombreCompleto(seleccion)}`} icono="edit" onCerrar={cerrarModales} ancho={680}>
          {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {datos.columnas.map(c => {
              const e = edicion[c.nombre] ?? { valor: '', nulo: false };
              const largo = e.valor.length > 60 || ['json', 'jsonb', 'text'].includes(c.udt);
              return (
                <div key={c.nombre}>
                  <label style={labelStyle}>
                    {c.nombre} <span style={{ textTransform: 'none', fontWeight: 500, color: C.outline }}>({c.udt})</span>
                  </label>
                  {largo ? (
                    <textarea rows={3} disabled={c.pk || e.nulo} value={e.nulo ? '' : e.valor}
                      onChange={ev => setEdicion(s => ({ ...s, [c.nombre]: { ...e, valor: ev.target.value } }))}
                      style={{ ...inputStyle, resize: 'vertical', opacity: c.pk ? 0.6 : 1 }} />
                  ) : (
                    <input disabled={c.pk || e.nulo} value={e.nulo ? '' : e.valor}
                      onChange={ev => setEdicion(s => ({ ...s, [c.nombre]: { ...e, valor: ev.target.value } }))}
                      style={{ ...inputStyle, opacity: c.pk ? 0.6 : 1 }} />
                  )}
                  {c.nulo && !c.pk && (
                    <label style={{ fontSize: 11.5, color: C.onSurfaceVariant, display: 'flex', gap: 5, alignItems: 'center', marginTop: 3 }}>
                      <input type="checkbox" checked={e.nulo} onChange={ev => setEdicion(s => ({ ...s, [c.nombre]: { ...e, nulo: ev.target.checked } }))} /> NULL
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button style={botonSecundario} onClick={cerrarModales}>Cancelar</button>
            <button style={botonPrimario(procesando)} disabled={procesando} onClick={guardarEdicion}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default BaseDatosPage;
