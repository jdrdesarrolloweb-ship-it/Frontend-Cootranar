import { httpClient } from '../api/httpClient';

export interface BusSemilla {
  idvehiculo: number;
  idtipobus: number;
  placa: string;
  numeromovil: string;
  capacidad: number;
  cantidadpisos: number;
  activo: boolean;
  nombretipobus: string | null;
  nombretiposervicio: string | null;
  viajespendientes: number;
}

export interface ViajeSemilla {
  idviaje: number;
  codigoviaje: string | null;
  fechasalida: string;
  horasalida: string;
  nombreruta: string;
  ciudadorigen: string;
  ciudaddestino: string;
  numeromovil: string;
  capacidad: number;
  nombretipobus: string | null;
  asientosvendidos: number;
  asientosreservados: number;
}

export interface VerificacionTraslado {
  clave: string;
  ok: boolean;
  mensaje: string;
}

export interface AsientoPlanTraslado {
  idasientoviaje: number;
  idtiquete: number;
  asientoAnterior: number;
  asientoNuevo: number;
  problema: string | null;
}

export interface EvaluacionTraslado {
  viaje: { idviaje: number; codigoviaje: string | null; fechasalida: string; horasalida: string; movilsemilla: string };
  vehiculoReal: { idvehiculo: number; numeromovil: string; placa: string; nombretipobus: string | null; capacidad: number; asientos: number[] };
  verificaciones: VerificacionTraslado[];
  plan: { vendidos: AsientoPlanTraslado[]; conflictos: AsientoPlanTraslado[] };
  puedeTrasladar: boolean;
}

/** { asientoSemilla: asientoReal } */
export type MapeoAsientos = Record<number, number>;

export const vehiculosSemillaApi = {
  listar: () =>
    httpClient.get<{ data: BusSemilla[] }>('/vehiculos-semilla'),

  crearDesdePlantilla: (idVehiculoPlantilla: number) =>
    httpClient.post<{ data: BusSemilla; message: string }>('/vehiculos-semilla', { idVehiculoPlantilla }),

  desactivar: (idvehiculo: number) =>
    httpClient.patch(`/vehiculos-semilla/${idvehiculo}/desactivar`, {}),

  listarViajes: (desde: string, hasta: string) =>
    httpClient.get<{ data: { desde: string; hasta: string; viajes: ViajeSemilla[] } }>(
      '/vehiculos-semilla/viajes', { params: { desde, hasta } }
    ),

  evaluarTraslado: (idviaje: number, numeroMovil: string, mapeo?: MapeoAsientos) =>
    httpClient.post<{ data: EvaluacionTraslado }>(
      `/vehiculos-semilla/viajes/${idviaje}/evaluar-traslado`, { numeroMovil, mapeo }
    ),

  trasladar: (idviaje: number, numeroMovil: string, mapeo?: MapeoAsientos) =>
    httpClient.post<{ data: unknown; message: string }>(
      `/vehiculos-semilla/viajes/${idviaje}/trasladar`, { numeroMovil, mapeo }
    ),
};
