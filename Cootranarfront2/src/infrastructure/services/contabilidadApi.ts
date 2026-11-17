import { httpClient } from '../api/httpClient';

/**
 * Cliente del módulo contable (/api/contabilidad). Devuelve directamente `data`.
 * Las rutas se escriben relativas a /contabilidad (ej. cont.get('/cuentas')).
 */
type Params = Record<string, string | number | boolean | null | undefined>;
const limpiar = (p: Params = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const base = '/contabilidad';

export const cont = {
  get: async <T = any>(ruta: string, params?: Params): Promise<T> => (await httpClient.get(base + ruta, { params: limpiar(params) })).data.data,
  post: async <T = any>(ruta: string, body?: unknown): Promise<T> => (await httpClient.post(base + ruta, body ?? {})).data.data,
  put: async <T = any>(ruta: string, body?: unknown): Promise<T> => (await httpClient.put(base + ruta, body ?? {})).data.data,
  patch: async <T = any>(ruta: string, body?: unknown): Promise<T> => (await httpClient.patch(base + ruta, body ?? {})).data.data,
};

export interface Cuenta {
  idcuenta: number; codigo: string; nombre: string; nivel: number; naturaleza: 'D' | 'C'; esmovimiento: boolean;
  exigetercero: boolean; exigecentro: boolean; activa: boolean; codigopadre?: string; tienemovimientos?: boolean;
}
export interface Tercero {
  idtercero: number; tipodocumento: string; documento: string; dv: number | null; nombre: string; tipopersona: string;
  escliente: boolean; esproveedor: boolean; esempleado: boolean; correo?: string; telefono?: string; direccion?: string;
  idciudad?: number; activo: boolean; responsabilidades?: string[];
}
export interface Centro { idcentro: number; codigo: string; nombre: string; tipo: string; idpadre: number | null; activo: boolean }
