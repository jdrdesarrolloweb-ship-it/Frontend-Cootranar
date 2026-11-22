import { useCallback, useEffect, useState } from 'react';
import adminBaseDatosApi, { type BackupBD, type RespaldoBD } from '../../../infrastructure/services/adminBaseDatosApi';
import { C, FONT, TH, TD, inputStyle, botonPrimario, botonSecundario } from '../../components/millas/estilosMillas';
import { Aviso, Modal } from './componentesBaseDatos';
import { mensajeError } from './mensajeError';

const fecha = (f: string | null) => (f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const tamano = (b: number | null) => (b === null ? '—' : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);

const ESTADOS_BACKUP: Record<BackupBD['estado'], { texto: string; color: string }> = {
  COMPLETADO: { texto: 'Disponible', color: C.success },
  EN_PROCESO: { texto: 'En curso…', color: C.secondary },
  FALLIDO: { texto: 'Falló', color: C.error },
  EXPIRADO: { texto: 'Expirado', color: C.outline },
};

const ACCIONES: Record<string, string> = {
  ELIMINAR_FILAS: 'Eliminación de filas',
  VACIAR_TABLA: 'Vaciado de tabla',
  LIMPIAR_BASE_DATOS: 'Limpieza de base de datos',
};

const tarjeta = { background: '#fff', border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: 16, fontFamily: FONT, marginBottom: 16 } as const;
const titulo = { margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: C.primary, display: 'flex', alignItems: 'center', gap: 8 } as const;

/**
 * Pestaña "Backups": copias completas (crear / descargar) y operaciones del módulo que se
 * pueden deshacer. `onCambio` avisa a la página para recargar tablas tras un deshacer.
 */
export const BackupsPanel = ({ onCambio, recargarSenal }: { onCambio: () => void; recargarSenal: number }) => {
  const [backups, setBackups] = useState<BackupBD[]>([]);
  const [respaldos, setRespaldos] = useState<RespaldoBD[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'warning'; texto: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [creando, setCreando] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);
  const [confirmarDeshacer, setConfirmarDeshacer] = useState<RespaldoBD | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [b, r] = await Promise.all([adminBaseDatosApi.backups(), adminBaseDatosApi.respaldos()]);
      setBackups(b);
      setRespaldos(r);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar los backups.') });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar, recargarSenal]);

  const crear = async () => {
    setCreando(true);
    setMensaje(null);
    try {
      const b = await adminBaseDatosApi.crearBackup(motivo.trim());
      setMotivo('');
      setMensaje({ tipo: 'ok', texto: `Backup #${b.idbackup} creado (${tamano(b.tamano)}). Ya lo puedes descargar.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeError(err, 'No se pudo crear el backup.') });
    } finally {
      setCreando(false);
      cargar();
    }
  };

  const descargar = async (b: BackupBD) => {
    setDescargando(b.idbackup);
    try {
      const { url, nombre } = await adminBaseDatosApi.urlDescargaBackup(b.idbackup);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeError(err, 'No se pudo descargar el backup.') });
    } finally {
      setDescargando(null);
    }
  };

  const deshacer = async () => {
    if (!confirmarDeshacer) return;
    setDeshaciendo(true);
    setErrorModal(null);
    try {
      const r = await adminBaseDatosApi.deshacer(confirmarDeshacer.idrespaldo);
      setConfirmarDeshacer(null);
      setMensaje({
        tipo: r.avisos.length ? 'warning' : 'ok',
        texto: `Operación deshecha: ${r.totalFilas.toLocaleString('es-CO')} fila(s) restauradas.${r.avisos.length ? ` ${r.avisos.join(' ')}` : ''}`,
      });
      cargar();
      onCambio();
    } catch (err) {
      setErrorModal(mensajeError(err, 'No se pudo deshacer la operación.'));
    } finally {
      setDeshaciendo(false);
    }
  };

  const enCurso = backups.some(b => b.estado === 'EN_PROCESO');

  return (
    <div style={{ fontFamily: FONT }}>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {/* ── Backups completos ── */}
      <div style={tarjeta}>
        <h3 style={titulo}><span className="material-symbols-outlined">backup</span>Backups completos</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: C.onSurfaceVariant }}>
          Copia completa de la base de datos (esquemas <code>public</code> y <code>contabilidad</code>), guardada en un almacenamiento privado.
          Se crea una automáticamente antes de vaciar o limpiar tablas. Además, cada día a las 3:00 a. m. se guarda una copia
          cifrada fuera de Supabase (GitHub). Se conservan 30 días.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input placeholder="Motivo (opcional), p. ej. antes de migrar datos" value={motivo} maxLength={300}
            onChange={e => setMotivo(e.target.value)} style={{ ...inputStyle, maxWidth: 420 }} disabled={creando} />
          <button style={botonPrimario(creando || enCurso)} disabled={creando || enCurso} onClick={crear}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{creando ? 'hourglass_top' : 'add_circle'}</span>
            {creando ? 'Creando backup… (puede tardar ~1 min)' : 'Crear backup ahora'}
          </button>
          <button style={botonSecundario} onClick={cargar} disabled={cargando} aria-label="Actualizar">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          </button>
        </div>
        <div style={{ overflow: 'auto', border: `1px solid ${C.outlineVariant}`, borderRadius: 9, maxHeight: 360 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>#</th><th style={TH}>Fecha</th><th style={TH}>Tipo</th><th style={TH}>Motivo</th><th style={TH}>Tamaño</th><th style={TH}>Estado</th><th style={TH}></th></tr></thead>
            <tbody>
              {!cargando && backups.length === 0 && <tr><td style={{ ...TD, color: C.outline }} colSpan={7}>Aún no hay backups. Crea el primero.</td></tr>}
              {backups.map(b => {
                const est = ESTADOS_BACKUP[b.estado];
                return (
                  <tr key={b.idbackup}>
                    <td style={TD}>{b.idbackup}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fecha(b.fecha)}</td>
                    <td style={{ ...TD, fontSize: 12 }}>{b.tipo === 'MANUAL' ? 'Manual' : 'Antes de una limpieza'}</td>
                    <td style={{ ...TD, fontSize: 12, maxWidth: 320 }}>
                      {b.motivo || '—'}{b.usuario && <span style={{ color: C.outline }}> · {b.usuario}</span>}
                      {b.error && <div style={{ color: C.error }}>{b.error}</div>}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{tamano(b.tamano)}</td>
                    <td style={{ ...TD, fontWeight: 700, color: est.color, whiteSpace: 'nowrap' }}>{est.texto}</td>
                    <td style={TD}>
                      {b.estado === 'COMPLETADO' && (
                        <button style={botonSecundario} disabled={descargando === b.idbackup} onClick={() => descargar(b)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                          {descargando === b.idbackup ? '…' : 'Descargar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: C.outline }}>
          Para restaurar un backup completo usa <code>node scripts/backup/restaurar.mjs</code> (ver <code>scripts/backup/README.md</code>).
          Por seguridad no se puede restaurar toda la base desde el panel.
        </p>
      </div>

      {/* ── Deshacer ── */}
      <div style={tarjeta}>
        <h3 style={titulo}><span className="material-symbols-outlined">undo</span>Deshacer borrados</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: C.onSurfaceVariant }}>
          Cada eliminación o vaciado hecho desde este módulo guarda las filas afectadas durante 30 días. Deshacer las vuelve a
          insertar con sus mismos identificadores y restablece las referencias que habían quedado vacías.
        </p>
        <div style={{ overflow: 'auto', border: `1px solid ${C.outlineVariant}`, borderRadius: 9, maxHeight: 420 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Fecha</th><th style={TH}>Operación</th><th style={TH}>Tablas</th><th style={TH}>Filas</th><th style={TH}>Estado</th><th style={TH}></th></tr></thead>
            <tbody>
              {!cargando && respaldos.length === 0 && <tr><td style={{ ...TD, color: C.outline }} colSpan={6}>No hay operaciones para deshacer en los últimos 30 días.</td></tr>}
              {respaldos.map(r => (
                <tr key={r.idrespaldo}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fecha(r.fecha)}</td>
                  <td style={{ ...TD, fontSize: 12 }}>
                    <strong>{ACCIONES[r.accion] ?? r.accion}</strong>
                    <div style={{ color: C.onSurfaceVariant }}>{r.descripcion}{r.usuario && ` · ${r.usuario}`}</div>
                  </td>
                  <td style={{ ...TD, fontSize: 11.5, maxWidth: 340 }}>
                    {r.tablas.map(t => (
                      <span key={`${t.tabla}-${t.tipo}`} style={{
                        display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 7px', borderRadius: 999,
                        background: t.tipo === 'FILAS' ? C.surfaceContainerLow : C.warningBg, color: C.onSurface,
                      }} title={t.tipo === 'FILAS' ? 'Filas eliminadas' : 'Referencias que quedaron vacías'}>
                        {t.tabla.replace(/^public\./, '')} · {t.filas}{t.tipo === 'REFERENCIAS' ? ' ref.' : ''}
                      </span>
                    ))}
                  </td>
                  <td style={TD}>{r.totalfilas.toLocaleString('es-CO')}</td>
                  <td style={{ ...TD, fontSize: 12, color: r.estado === 'RESTAURADO' ? C.success : C.onSurface, fontWeight: 700 }}>
                    {r.estado === 'RESTAURADO' ? `Deshecha ${fecha(r.fecharestauracion)}` : 'Se puede deshacer'}
                  </td>
                  <td style={TD}>
                    {r.estado === 'DISPONIBLE' && (
                      <button style={botonSecundario} onClick={() => { setErrorModal(null); setConfirmarDeshacer(r); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>undo</span>Deshacer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmarDeshacer && (
        <Modal titulo="Deshacer operación" icono="undo" onCerrar={() => !deshaciendo && setConfirmarDeshacer(null)}>
          {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
          <p style={{ fontSize: 13.5, margin: '0 0 10px' }}>
            Se volverán a insertar <strong>{confirmarDeshacer.totalfilas.toLocaleString('es-CO')}</strong> fila(s)
            de la operación "{confirmarDeshacer.descripcion}" del {fecha(confirmarDeshacer.fecha)}.
          </p>
          <Aviso tipo="info">
            Si después se crearon registros con los mismos identificadores, no se cambia nada y se te indicará qué backup completo usar.
          </Aviso>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button style={botonSecundario} disabled={deshaciendo} onClick={() => setConfirmarDeshacer(null)}>Cancelar</button>
            <button style={botonPrimario(deshaciendo)} disabled={deshaciendo} onClick={deshacer}>
              {deshaciendo ? 'Restaurando…' : 'Deshacer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BackupsPanel;
