import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cont } from '../../../infrastructure/services/contabilidadApi';
import { ROUTES } from '../../../shared/constants';
import { BLUE, Btn, Card, inputStyle, money } from './almacenUi';
import { errorTexto, horaBogota, type EstadoCajaPos, type ResumenTurno } from './useTurnoCajaPos';

/**
 * Apertura y cierre diario de caja para el POS. Usa los turnos de Contabilidad › Caja:
 * sin turno abierto hoy no se puede vender; el cierre (arqueo + reporte Z) se hace en Caja.
 */

/** Chip del encabezado del POS: caja y turno activos, con acceso al cierre. */
export function TurnoCajaChip({ resumen }: { resumen: ResumenTurno }) {
  const navigate = useNavigate();
  const t = resumen.turno;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: '11px', color: '#bfdbfe', lineHeight: 1.35 }}>
        <div style={{ color: '#ffffff', fontWeight: 800 }}>{t.caja} · Turno #{t.idturno}</div>
        <div>Abierto {horaBogota(t.fechaapertura)} · {resumen.numeroVentas} venta(s) · {money(resumen.totalVentas)}</div>
      </div>
      <button
        type="button"
        onClick={() => navigate(ROUTES.CAJA)}
        title="Arqueo y cierre del turno (reporte Z)"
        style={{
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.35)', color: '#ffffff',
          padding: '5px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
        Cerrar caja
      </button>
    </div>
  );
}

/** Pantalla que reemplaza al POS mientras no haya un turno de caja abierto hoy. */
export function AperturaCajaPos({ estado, resumen, error }: { estado: EstadoCajaPos; resumen: ResumenTurno | null; error: unknown }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ idcaja: '', fondoinicial: '', observacion: '' });
  const [errorAbrir, setErrorAbrir] = useState<string | null>(null);

  const cajas = useQuery({
    queryKey: ['cont', 'caja', 'mis-cajas'],
    queryFn: () => cont.get<{ idcaja: number; nombre: string; sede?: string; ocupada: boolean }[]>('/caja/mis-cajas'),
    enabled: estado === 'sin-turno',
  });

  const abrir = useMutation({
    mutationFn: () => cont.post('/caja/turnos', {
      idcaja: Number(form.idcaja),
      fondoinicial: Number(form.fondoinicial || 0),
      observacion: form.observacion || undefined,
    }),
    onSuccess: () => { setErrorAbrir(null); qc.invalidateQueries({ queryKey: ['cont', 'caja'] }); },
    onError: (e) => setErrorAbrir(errorTexto(e, 'No se pudo abrir la caja')),
  });

  const contenedor = (icono: string, titulo: string, cuerpo: ReactNode) => (
    <Card style={{ maxWidth: 520, margin: '40px auto', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: BLUE }}>{icono}</span>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{titulo}</div>
      </div>
      {cuerpo}
    </Card>
  );

  if (estado === 'cargando') {
    return <Card style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Verificando caja…</Card>;
  }

  if (estado === 'error') {
    return contenedor('error', 'No se pudo verificar la caja', (
      <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>
        {errorTexto(error, 'Error consultando el turno de caja')}. Para vender en el POS necesita acceso a Caja.
      </p>
    ));
  }

  if (estado === 'vencido' && resumen) {
    const t = resumen.turno;
    return contenedor('lock_clock', 'Hay un turno de un día anterior', (
      <>
        <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.55, marginTop: 0 }}>
          El turno <b>#{t.idturno}</b> de <b>{t.caja}</b> se abrió el {horaBogota(t.fechaapertura)} y sigue abierto.
          La caja se abre y se cierra cada día: haga el arqueo y cierre ese turno, y luego abra uno nuevo para vender hoy.
        </p>
        <Btn icon="lock" variant="danger" onClick={() => navigate(ROUTES.CAJA)}>Ir a cerrar el turno #{t.idturno}</Btn>
      </>
    ));
  }

  const lista = cajas.data ?? [];
  return contenedor('lock_open', 'Abrir caja del día', (
    <>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, marginTop: 0 }}>
        Para vender en el punto de venta abra un turno de caja. Las ventas de contado quedan en ese turno y al final
        del día se cierra con el arqueo y el reporte Z.
      </p>
      {cajas.isLoading ? (
        <p style={{ fontSize: 13, color: '#94a3b8' }}>Cargando cajas…</p>
      ) : !lista.length ? (
        <p style={{ fontSize: 13, color: '#b45309' }}>
          No tiene cajas asignadas. Pida al administrador que le asigne una en Caja › Cajas.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
            Caja
            <select
              value={form.idcaja}
              onChange={(e) => setForm({ ...form, idcaja: e.target.value })}
              style={{ ...inputStyle, width: '100%', marginTop: 4 }}
            >
              <option value="">Seleccione…</option>
              {lista.map((c) => (
                <option key={c.idcaja} value={c.idcaja} disabled={c.ocupada}>
                  {c.nombre}{c.sede ? ` · ${c.sede}` : ''}{c.ocupada ? ' (en uso)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
            Fondo inicial (base en efectivo)
            <input
              type="number" min={0} step="any" placeholder="0"
              value={form.fondoinicial}
              onChange={(e) => setForm({ ...form, fondoinicial: e.target.value })}
              style={{ ...inputStyle, width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
            Observación
            <input
              maxLength={300}
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              style={{ ...inputStyle, width: '100%', marginTop: 4 }}
            />
          </label>
          {errorAbrir && <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{errorAbrir}</p>}
          <div>
            <Btn icon="lock_open" disabled={!form.idcaja || abrir.isPending} onClick={() => abrir.mutate()}>
              {abrir.isPending ? 'Abriendo…' : 'Abrir caja'}
            </Btn>
          </div>
        </div>
      )}
    </>
  ));
}
