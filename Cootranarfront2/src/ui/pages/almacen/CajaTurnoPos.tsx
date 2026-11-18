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
        <div style={{ color: '#ffffff', fontWeight: 800 }}>{t.caja} · Apertura {t.codigoapertura}</div>
        <div>Abierto {horaBogota(t.fechaapertura)} · {resumen.numeroVentas} venta(s) · {money(resumen.totalVentas)}</div>
      </div>
      <button
        type="button"
        onClick={() => navigate(ROUTES.CAJA)}
        title="Cierre de la apertura y cuadre de lo que ingresó"
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
  const [form, setForm] = useState({ idcaja: '', observacion: '' });
  const [errorAbrir, setErrorAbrir] = useState<string | null>(null);

  const cajas = useQuery({
    queryKey: ['cont', 'caja', 'mis-cajas'],
    queryFn: () => cont.get<{ idcaja: number; nombre: string; sede?: string; ocupada: boolean }[]>('/caja/mis-cajas'),
    enabled: estado === 'sin-turno',
  });
  const lista = cajas.data ?? [];
  // Si el empleado solo tiene su caja propia, queda elegida de una vez.
  const libres = lista.filter((c) => !c.ocupada);
  const idcajaElegida = form.idcaja || (libres.length === 1 ? String(libres[0].idcaja) : '');

  const abrir = useMutation({
    // La apertura arranca en cero; solo genera el código AP-… de referencia.
    mutationFn: () => cont.post('/caja/turnos', {
      idcaja: Number(idcajaElegida),
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
    return contenedor('lock_clock', 'Hay una apertura de un día anterior', (
      <>
        <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.55, marginTop: 0 }}>
          La apertura <b>{t.codigoapertura}</b> de <b>{t.caja}</b> se abrió el {horaBogota(t.fechaapertura)} y sigue abierta.
          La caja se abre y se cierra cada día: ciérrela con el cuadre y luego abra una nueva para vender hoy.
        </p>
        <Btn icon="lock" variant="danger" onClick={() => navigate(ROUTES.CAJA)}>Ir a cerrar {t.codigoapertura}</Btn>
      </>
    ));
  }

  return contenedor('lock_open', 'Abrir caja del día', (
    <>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, marginTop: 0 }}>
        Al abrir se genera un código de apertura (AP-…) que arranca en cero. Las ventas quedan en esa apertura y al
        cerrar se hace el cuadre de cuánto dinero ingresó.
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
              value={idcajaElegida}
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
            <Btn icon="lock_open" disabled={!idcajaElegida || abrir.isPending} onClick={() => abrir.mutate()}>
              {abrir.isPending ? 'Abriendo…' : 'Abrir caja'}
            </Btn>
          </div>
        </div>
      )}
    </>
  ));
}
