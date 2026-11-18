/** Turno de caja del cajero para el POS (apertura y cierre diario). */
import { useQuery } from '@tanstack/react-query';
import { cont } from '../../../infrastructure/services/contabilidadApi';

export interface TurnoCaja {
  idturno: number;
  codigoapertura: string;
  caja: string;
  codigocaja: string;
  fechaapertura: string;
  fondoinicial: string;
}
export interface ResumenTurno { turno: TurnoCaja; totalVentas: number; numeroVentas: number; efectivoEsperado: number }

export type EstadoCajaPos = 'cargando' | 'error' | 'sin-turno' | 'vencido' | 'abierto';

export const diaBogota = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(d));
export const horaBogota = (d: string) =>
  new Date(d).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
export const errorTexto = (e: unknown, defecto: string): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string } | null;
  return err?.response?.data?.message || err?.message || defecto;
};

// Misma clave que la página de Caja, para que abrir/cerrar en cualquiera refresque la otra.
const CLAVE_TURNO = ['cont', 'caja', 'turno'];

export function useTurnoCajaPos() {
  const q = useQuery({
    queryKey: CLAVE_TURNO,
    queryFn: () => cont.get<ResumenTurno | null>('/caja/turno-actual'),
    refetchInterval: 60_000,
  });
  const resumen = q.data ?? null;
  let estado: EstadoCajaPos;
  if (q.isLoading) estado = 'cargando';
  else if (q.isError) estado = 'error';
  else if (!resumen?.turno) estado = 'sin-turno';
  else if (diaBogota(resumen.turno.fechaapertura) < diaBogota(new Date())) estado = 'vencido';
  else estado = 'abierto';
  return { estado, resumen, error: q.error, recargar: q.refetch };
}

