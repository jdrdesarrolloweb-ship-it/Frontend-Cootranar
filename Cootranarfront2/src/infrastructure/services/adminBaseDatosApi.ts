import { httpClient } from '../api/httpClient';

export interface TablaBD {
  schema: string;
  tabla: string;
  filasAprox: number;
  protegida: boolean;
  referenciadaPor: number;
  referencia: number;
}

export interface ColumnaBD {
  nombre: string;
  tipo: string;
  udt: string;
  nulo: boolean;
  predeterminado: string | null;
  autogenerado: boolean;
  pk: boolean;
}

export type FilaBD = Record<string, unknown> & { __ctid?: string };

export interface PaginaFilas {
  schema: string;
  tabla: string;
  columnas: ColumnaBD[];
  pk: string[];
  protegida: boolean;
  total: number;
  pagina: number;
  limite: number;
  filas: FilaBD[];
}

export interface DependenciaBD {
  schema: string;
  tabla: string;
  filas: number;
  accion: 'ELIMINAR' | 'VACIAR_REFERENCIA';
  columnas: string[];
  ruta: string;
  protegida: boolean;
  profundidad: number;
}

export interface ImpactoEliminar {
  seleccionadas: number;
  dependencias: DependenciaBD[];
  totalAEliminar: number;
  bloqueadaPorProtegidas: boolean;
}

export interface ImpactoVaciar {
  tablas: Array<{ schema: string; tabla: string; filas: number; motivo: string; protegida: boolean }>;
  totalFilas: number;
  bloqueadaPorProtegidas: boolean;
}

export interface RegistroAuditoriaBD {
  idauditoria: number;
  accion: string;
  esquema: string | null;
  tabla: string | null;
  detalle: Record<string, unknown>;
  fecha: string;
  usuario: string | null;
}

/** Identificador de una fila: valores de la llave primaria, o __ctid si la tabla no tiene. */
export type ClaveFila = Record<string, unknown>;

export interface BackupBD {
  idbackup: number;
  tipo: 'MANUAL' | 'PRE_OPERACION';
  motivo: string | null;
  archivo: string | null;
  tamano: number | null;
  estado: 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO' | 'EXPIRADO';
  error: string | null;
  duracionms: number | null;
  fecha: string;
  usuario: string | null;
}

export interface RespaldoBD {
  idrespaldo: number;
  idauditoria: number | null;
  accion: string;
  descripcion: string | null;
  totalfilas: number;
  idbackup: number | null;
  estado: 'DISPONIBLE' | 'RESTAURADO';
  fecha: string;
  fecharestauracion: string | null;
  usuario: string | null;
  usuariorestaura: string | null;
  tablas: Array<{ tabla: string; tipo: 'FILAS' | 'REFERENCIAS'; filas: number }>;
}

export interface ResultadoEliminar {
  cascada: boolean;
  eliminadas: Record<string, number>;
  idrespaldo: number | null;
  idbackup: number | null;
}

export interface ResultadoVaciar {
  tablasVaciadas: number;
  filasEliminadas: number;
  idrespaldo: number | null;
  idbackup: number | null;
  aviso: string | null;
}

export interface ResultadoDeshacer {
  idrespaldo: number;
  restauradas: Record<string, number>;
  totalFilas: number;
  avisos: string[];
}

const BASE = '/admin-bd';
// Las operaciones que crean un backup completo pueden tardar más de un minuto
const LARGO = { timeout: 11 * 60 * 1000 };
const ruta = (schema: string, tabla: string) => `${BASE}/tablas/${encodeURIComponent(schema)}/${encodeURIComponent(tabla)}`;

export const adminBaseDatosApi = {
  async listarTablas(): Promise<TablaBD[]> {
    const r = await httpClient.get<{ data: TablaBD[] }>(`${BASE}/tablas`);
    return r.data.data;
  },

  async obtenerFilas(schema: string, tabla: string, params: { pagina: number; limite: number; buscar?: string }): Promise<PaginaFilas> {
    const r = await httpClient.get<{ data: PaginaFilas }>(ruta(schema, tabla), { params });
    return r.data.data;
  },

  async impactoEliminar(schema: string, tabla: string, claves: ClaveFila[]): Promise<ImpactoEliminar> {
    const r = await httpClient.post<{ data: ImpactoEliminar }>(`${ruta(schema, tabla)}/impacto`, { claves });
    return r.data.data;
  },

  async eliminarFilas(schema: string, tabla: string, claves: ClaveFila[], cascada: boolean): Promise<ResultadoEliminar> {
    const r = await httpClient.post<{ data: ResultadoEliminar }>(`${ruta(schema, tabla)}/eliminar`, { claves, cascada }, LARGO);
    return r.data.data;
  },

  async actualizarFila(schema: string, tabla: string, clave: ClaveFila, cambios: Record<string, unknown>): Promise<FilaBD> {
    const r = await httpClient.put<{ data: FilaBD }>(`${ruta(schema, tabla)}/fila`, { clave, cambios });
    return r.data.data;
  },

  async impactoVaciar(tablas: string[]): Promise<ImpactoVaciar> {
    const r = await httpClient.post<{ data: ImpactoVaciar }>(`${BASE}/vaciar/impacto`, { tablas });
    return r.data.data;
  },

  async vaciar(tablas: string[], confirmacion: string): Promise<ResultadoVaciar> {
    const r = await httpClient.post<{ data: ResultadoVaciar }>(`${BASE}/vaciar`, { tablas, confirmacion }, LARGO);
    return r.data.data;
  },

  async auditoria(limite = 100): Promise<RegistroAuditoriaBD[]> {
    const r = await httpClient.get<{ data: RegistroAuditoriaBD[] }>(`${BASE}/auditoria`, { params: { limite } });
    return r.data.data;
  },

  async backups(): Promise<BackupBD[]> {
    const r = await httpClient.get<{ data: BackupBD[] }>(`${BASE}/backups`);
    return r.data.data;
  },

  async crearBackup(motivo?: string): Promise<BackupBD> {
    const r = await httpClient.post<{ data: BackupBD }>(`${BASE}/backups`, { motivo: motivo || undefined }, LARGO);
    return r.data.data;
  },

  async urlDescargaBackup(idbackup: number): Promise<{ url: string; nombre: string; expiraEnSegundos: number }> {
    const r = await httpClient.get<{ data: { url: string; nombre: string; expiraEnSegundos: number } }>(`${BASE}/backups/${idbackup}/descarga`);
    return r.data.data;
  },

  async respaldos(): Promise<RespaldoBD[]> {
    const r = await httpClient.get<{ data: RespaldoBD[] }>(`${BASE}/respaldos`);
    return r.data.data;
  },

  async deshacer(idrespaldo: number): Promise<ResultadoDeshacer> {
    const r = await httpClient.post<{ data: ResultadoDeshacer }>(`${BASE}/respaldos/${idrespaldo}/deshacer`, {}, LARGO);
    return r.data.data;
  },
};

export default adminBaseDatosApi;
