import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { Badge, Btn, Field, Grid, Modal, Tabla, inputStyle } from './contUi';

/**
 * Nómina electrónica DIAN (Factus): estado por empleado, transmisión, reintentos,
 * descarga de la representación gráfica y datos laborales que exige la DIAN.
 */

type Catalogo = Record<string, string>;
interface Catalogos { tipoDocumento: Catalogo; tipoTrabajador: Catalogo; subtipoTrabajador: Catalogo; tipoContrato: Catalogo; medioPago: Catalogo; tipoCuenta: Catalogo }

const TONO: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray'> = {
  VALIDADA: 'green', RECHAZADA: 'red', ERROR: 'red', PENDIENTE: 'blue', ANULADA: 'gray', ELIMINADA: 'gray',
};
const MEDIOS_CON_CUENTA = ['42', '47', '98'];

const descargarBase64 = (base64: string, nombre: string, tipo: string) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const Opciones = ({ catalogo }: { catalogo: Catalogo }) => (
  <>{Object.entries(catalogo).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</>
);

// ── Datos laborales del empleado ─────────────────────────────────────────────
export function DatosEmpleadoModal({ idtercero, onClose, onGuardado }: { idtercero: number; onClose: () => void; onGuardado: (msg: string) => void }) {
  const q = useQuery({ queryKey: ['cont', 'nomina-empleado', idtercero], queryFn: () => cont.get(`/nominas/empleados/${idtercero}`) });
  const municipios = useQuery({ queryKey: ['cont', 'nomina-municipios'], queryFn: () => cont.get<any[]>('/nominas/electronica/municipios'), staleTime: 3600_000 });
  const [f, setF] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (q.data && !f) {
      const d = q.data;
      setF({
        ...d,
        fechaingreso: d.fechaingreso?.slice(0, 10) ?? '', fecharetiro: d.fecharetiro?.slice(0, 10) ?? '',
        salariobase: d.salariobase ?? '', municipiocodigo: d.municipiocodigo ?? '', direccion: d.direccion ?? '',
      });
    }
  }, [q.data, f]);
  const guardar = useMutation({
    mutationFn: () => cont.put(`/nominas/empleados/${idtercero}`, { ...f, salariobase: f.salariobase === '' ? null : Number(f.salariobase), fecharetiro: f.fecharetiro || null }),
    onSuccess: (r: any) => onGuardado(r.faltantes?.length ? `Datos guardados. Aún falta: ${r.faltantes.join(', ')}` : 'Datos laborales guardados'),
    onError: (e: any) => setError(e?.response?.data?.message || 'No se pudieron guardar los datos'),
  });
  const cat: Catalogos | undefined = q.data?.catalogos;
  const set = (c: Record<string, unknown>) => setF((x: any) => ({ ...x, ...c }));
  const conCuenta = f && MEDIOS_CON_CUENTA.includes(String(f.mediopago));

  return (
    <Modal titulo={`Datos para nómina electrónica · ${q.data?.nombre ?? ''}`} onClose={onClose} ancho={860}>
      {!f || !cat ? <p style={{ fontSize: 13 }}>Cargando…</p> : (
        <>
          {error && <p role="alert" style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</p>}
          {!q.data.tienedatos && <p style={{ background: '#dbeafe', color: '#1d4ed8', padding: '8px 12px', borderRadius: 8, fontSize: 12.5 }}>Se sugirieron los nombres a partir del nombre del tercero; revísalos antes de guardar.</p>}
          <h4 style={{ margin: '4px 0 10px', fontSize: 13, color: '#0D3B8E' }}>Identificación</h4>
          <Grid cols={4}>
            <Field label="Tipo de documento" required><select value={f.tipodocumentodian} onChange={(e) => set({ tipodocumentodian: e.target.value })} style={inputStyle}><Opciones catalogo={cat.tipoDocumento} /></select></Field>
            <Field label="Número"><input value={f.documento} disabled style={{ ...inputStyle, opacity: 0.7 }} /></Field>
            <Field label="Primer nombre" required><input value={f.primernombre ?? ''} onChange={(e) => set({ primernombre: e.target.value })} style={inputStyle} /></Field>
            <Field label="Otros nombres"><input value={f.otrosnombres ?? ''} onChange={(e) => set({ otrosnombres: e.target.value })} style={inputStyle} /></Field>
            <Field label="Primer apellido" required><input value={f.primerapellido ?? ''} onChange={(e) => set({ primerapellido: e.target.value })} style={inputStyle} /></Field>
            <Field label="Segundo apellido"><input value={f.segundoapellido ?? ''} onChange={(e) => set({ segundoapellido: e.target.value })} style={inputStyle} /></Field>
            <Field label="Dirección" required><input value={f.direccion} onChange={(e) => set({ direccion: e.target.value })} style={inputStyle} /></Field>
            <Field label="Municipio (código DANE)" required>
              <input list="municipios-dane" value={f.municipiocodigo} onChange={(e) => set({ municipiocodigo: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="52001" style={inputStyle} />
              <datalist id="municipios-dane">{(municipios.data ?? []).map((m: any) => <option key={m.codigo} value={m.codigo}>{m.nombre} ({m.departamento})</option>)}</datalist>
            </Field>
          </Grid>
          <h4 style={{ margin: '16px 0 10px', fontSize: 13, color: '#0D3B8E' }}>Vinculación laboral</h4>
          <Grid cols={4}>
            <Field label="Tipo de trabajador" required><select value={f.tipotrabajador} onChange={(e) => set({ tipotrabajador: e.target.value })} style={inputStyle}><Opciones catalogo={cat.tipoTrabajador} /></select></Field>
            <Field label="Subtipo" required><select value={f.subtipotrabajador} onChange={(e) => set({ subtipotrabajador: e.target.value })} style={inputStyle}><Opciones catalogo={cat.subtipoTrabajador} /></select></Field>
            <Field label="Tipo de contrato" required><select value={f.tipocontrato} onChange={(e) => set({ tipocontrato: e.target.value })} style={inputStyle}><Opciones catalogo={cat.tipoContrato} /></select></Field>
            <Field label="Código de empleado"><input value={f.codigoempleado ?? ''} onChange={(e) => set({ codigoempleado: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha de ingreso" required><input type="date" value={f.fechaingreso} onChange={(e) => set({ fechaingreso: e.target.value })} style={inputStyle} /></Field>
            <Field label="Fecha de retiro"><input type="date" value={f.fecharetiro} onChange={(e) => set({ fecharetiro: e.target.value })} style={inputStyle} /></Field>
            <Field label="Salario base mensual"><input type="number" min={0} value={f.salariobase} onChange={(e) => set({ salariobase: e.target.value })} placeholder="Igual al de la nómina" style={{ ...inputStyle, textAlign: 'right' }} /></Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end', fontSize: 13 }}>
              <label><input type="checkbox" checked={!!f.salariointegral} onChange={(e) => set({ salariointegral: e.target.checked })} /> Salario integral</label>
              <label title="Actividades de alto riesgo (Decreto 2090 de 2003)"><input type="checkbox" checked={!!f.altoriesgo} onChange={(e) => set({ altoriesgo: e.target.checked })} /> Alto riesgo pensión</label>
            </div>
          </Grid>
          <h4 style={{ margin: '16px 0 10px', fontSize: 13, color: '#0D3B8E' }}>Pago</h4>
          <Grid cols={4}>
            <Field label="Medio de pago" required><select value={f.mediopago} onChange={(e) => set({ mediopago: e.target.value })} style={inputStyle}><Opciones catalogo={cat.medioPago} /></select></Field>
            {conCuenta && <>
              <Field label="Banco" required><input value={f.banco ?? ''} onChange={(e) => set({ banco: e.target.value })} style={inputStyle} /></Field>
              <Field label="Tipo de cuenta" required><select value={f.tipocuenta ?? ''} onChange={(e) => set({ tipocuenta: e.target.value })} style={inputStyle}><option value="">—</option><Opciones catalogo={cat.tipoCuenta} /></select></Field>
              <Field label="Número de cuenta" required><input value={f.numerocuenta ?? ''} onChange={(e) => set({ numerocuenta: e.target.value })} style={inputStyle} /></Field>
            </>}
          </Grid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            <Btn icon="save" disabled={guardar.isPending} onClick={() => { setError(null); guardar.mutate(); }}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Panel de la nómina ───────────────────────────────────────────────────────
export function NominaElectronicaPanel({ idnomina, estadoNomina, ok, err }: {
  idnomina: number; estadoNomina: string; ok: (m: string) => void; err: (e: unknown, d?: string) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['cont', 'nomina-electronica', idnomina], queryFn: () => cont.get(`/nominas/${idnomina}/electronica`) });
  const [editar, setEditar] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);
  const recargar = () => qc.invalidateQueries({ queryKey: ['cont', 'nomina-electronica', idnomina] });

  const transmitir = useMutation({
    mutationFn: (idtercero?: number) => cont.post(`/nominas/${idnomina}/electronica/transmitir`, idtercero ? { idtercero } : {}),
    onSuccess: (r: any) => {
      const s = r.resumen;
      const partes = [
        s.validadas && `${s.validadas} validada(s) por la DIAN`, s.yaValidadas && `${s.yaValidadas} ya estaban validadas`,
        s.rechazadas && `${s.rechazadas} rechazada(s)`, s.errores && `${s.errores} con error`, s.incompletas && `${s.incompletas} sin datos completos`,
      ].filter(Boolean);
      if (r.errorGeneral) err(new Error(r.errorGeneral), r.errorGeneral);
      else if (s.rechazadas || s.errores || s.incompletas) err(new Error(partes.join(' · ')), partes.join(' · '));
      else ok(partes.join(' · ') || 'Sin cambios');
      recargar();
    },
    onError: (e) => err(e, 'No se pudo transmitir'),
  });

  const descargar = async (iddoc: number, formato: 'pdf' | 'xml') => {
    setDescargando(iddoc);
    try {
      const a: any = await cont.get(`/nominas/electronica/documentos/${iddoc}/archivo`, { formato });
      descargarBase64(a.base64, a.nombre, a.tipo);
    } catch (e) {
      err(e, 'No se pudo descargar');
    } finally {
      setDescargando(null);
    }
  };

  const d = q.data;
  const r = d?.resumen;
  const causada = estadoNomina === 'CAUSADA';

  return (
    <div style={{ marginTop: 18, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, color: '#0D3B8E', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span>Nómina electrónica DIAN
          </h3>
          {r && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            {r.validadas}/{r.empleados} validadas{r.rechazadas ? ` · ${r.rechazadas} rechazadas` : ''}{r.errores ? ` · ${r.errores} con error` : ''}
            {r.anuladas ? ` · ${r.anuladas} anuladas` : ''}{r.incompletos ? ` · ${r.incompletos} sin datos completos` : ''}
          </p>}
        </div>
        {causada && r && r.pendientes > 0 && (
          <Btn icon="send" disabled={transmitir.isPending || r.incompletos === r.empleados} onClick={() => transmitir.mutate(undefined)}>
            {transmitir.isPending ? 'Transmitiendo…' : `Transmitir a la DIAN (${r.pendientes})`}
          </Btn>
        )}
      </div>
      {!causada && estadoNomina === 'BORRADOR' && (
        <p style={{ fontSize: 12.5, color: '#475569', margin: '0 0 10px' }}>
          Se transmite después de causar la nómina. Completa ya los datos laborales de cada empleado para que el envío no se detenga.
        </p>
      )}
      <Tabla cargando={q.isLoading} filas={d?.empleados ?? []} clave={(e: any) => e.idtercero} vacio="Sin empleados" columnas={[
        { label: 'Empleado', render: (e: any) => <span>{e.documento} · {e.nombre}</span> },
        {
          label: 'Datos DIAN', render: (e: any) => e.faltantes.length
            ? <span title={e.faltantes.join(', ')}><Badge tone="amber">Faltan {e.faltantes.length}</Badge></span>
            : <Badge tone="green">Completos</Badge>,
        },
        {
          label: 'Estado', render: (e: any) => {
            const doc = e.documento_electronico;
            if (!doc) return <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin transmitir</span>;
            return (
              <button type="button" onClick={() => setDetalle(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Ver detalle">
                <Badge tone={TONO[doc.estado] ?? 'gray'}>{doc.estado}</Badge>
              </button>
            );
          },
        },
        { label: 'Número', render: (e: any) => e.documento_electronico?.numero ?? '—' },
        {
          label: '', render: (e: any) => {
            const doc = e.documento_electronico;
            const reintentar = causada && (!doc || ['RECHAZADA', 'ERROR', 'PENDIENTE'].includes(doc.estado));
            return (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {estadoNomina !== 'ANULADA' && <Btn small variant="secondary" icon="badge" onClick={() => setEditar(e.idtercero)}>Datos</Btn>}
                {reintentar && doc && <Btn small variant="secondary" icon="refresh" disabled={transmitir.isPending || e.faltantes.length > 0} onClick={() => transmitir.mutate(e.idtercero)}>Reenviar</Btn>}
                {doc?.numero && ['VALIDADA', 'ANULADA'].includes(doc.estado) && (
                  <Btn small variant="ghost" icon="picture_as_pdf" disabled={descargando === doc.iddocumento} onClick={() => descargar(doc.iddocumento, 'pdf')} title="Descargar PDF" />
                )}
              </div>
            );
          },
        },
      ]} />

      {editar && <DatosEmpleadoModal idtercero={editar} onClose={() => setEditar(null)} onGuardado={(m) => { setEditar(null); ok(m); recargar(); }} />}

      {detalle && (
        <Modal titulo={`Nómina electrónica · ${detalle.nombre}`} onClose={() => setDetalle(null)} ancho={760}>
          {detalle.historial.map((h: any) => (
            <div key={h.iddocumento} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{h.tipo === 'NOMINA' ? 'Nómina individual' : 'Nota de ajuste (eliminación)'} {h.numero ?? ''}</strong>
                <Badge tone={TONO[h.estado] ?? 'gray'}>{h.estado}</Badge>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                Referencia {h.referencia} · {new Date(h.fechacreacion).toLocaleString('es-CO')}{h.mensaje ? ` · ${h.mensaje}` : ''}
              </div>
              {h.cune && <div style={{ fontSize: 11.5, marginTop: 6, wordBreak: 'break-all' }}><b>CUNE:</b> {h.cune}</div>}
              {h.qr && <a href={h.qr} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Consultar en la DIAN</a>}
              {h.errores && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#b91c1c', fontSize: 12 }}>
                  {(Array.isArray(h.errores) ? h.errores : Object.entries(h.errores).map(([k, v]) => `${k}: ${v}`)).map((x: string, i: number) => <li key={i}>{String(x)}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
