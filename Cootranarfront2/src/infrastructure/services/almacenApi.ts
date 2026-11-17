import { httpClient } from '../api/httpClient';

/**
 * Cliente del módulo de Almacén (/api/almacen).
 * Todas las funciones devuelven directamente `data` de la respuesta { success, message, data }.
 */

export type Id = number;
type Params = Record<string, string | number | boolean | null | undefined>;

const limpiar = (p: Params = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const get = async <T = any>(url: string, params?: Params): Promise<T> =>
  (await httpClient.get(url, { params: limpiar(params) })).data.data;
const post = async <T = any>(url: string, body?: unknown): Promise<T> => (await httpClient.post(url, body)).data.data;
const put = async <T = any>(url: string, body?: unknown): Promise<T> => (await httpClient.put(url, body)).data.data;
const patch = async <T = any>(url: string, body?: unknown): Promise<T> => (await httpClient.patch(url, body)).data.data;

export interface Paginado<T> {
  items: T[];
  paginacion: { total: number; totalPaginas: number; paginaActual: number; porPagina: number };
}

export interface Bodega {
  idbodega: Id; nombre: string; idciudad: Id; nombreciudad?: string;
  direccion?: string | null; telefono?: string | null; activo: boolean; almacenistas?: number; valorinventario?: string;
}

export interface ContextoAlmacen { esAdmin: boolean; bodega: Bodega | null; bodegas: Bodega[] }

export interface Producto {
  idproducto: Id; codigo: string; codigobarras: string | null; nombre: string; descripcion: string | null;
  idcategoria: Id; nombrecategoria?: string; marca: string | null; unidadmedida: string;
  precioventa: string; preciosocio: string; porcentajeiva: string; stockminimo: string; activo: boolean;
  stock?: string; costopromedio?: string; ubicacion?: string | null;
  preciounitario?: string | number; precioivainc?: string | number;
  saldoanterior?: string | number; entradas?: string | number; salidas?: string | number; nuevosaldo?: string | number;
  localizacion?: string | null;
}

export interface ItemCantidad { idproducto: Id; cantidad: number; preciounitario?: number; costounitario?: number; porcentajeiva?: number }

export const almacenApi = {
  contexto: () => get<ContextoAlmacen>('/almacen/contexto'),
  dashboard: (idbodega?: Id | null) => get('/almacen/dashboard', { idbodega }),

  // Bodegas y personal (admin)
  bodegas: () => get<Bodega[]>('/almacen/bodegas'),
  ciudades: () => get<{ idciudad: Id; nombre: string; nombredepartamento?: string }[]>('/almacen/ciudades'),
  crearBodega: (d: Partial<Bodega>) => post('/almacen/bodegas', d),
  actualizarBodega: (id: Id, d: Partial<Bodega>) => put(`/almacen/bodegas/${id}`, d),
  estadoBodega: (id: Id, activar: boolean) => patch(`/almacen/bodegas/${id}/${activar ? 'activar' : 'desactivar'}`),
  empleados: (p: Params = {}) => get<any[]>('/almacen/empleados', p),
  empleado: (id: Id) => get(`/almacen/empleados/${id}`),
  eliminarEmpleado: async (id: Id) => (await httpClient.delete(`/almacen/empleados/${id}`)).data.data,
  crearEmpleado: (d: any) => post('/almacen/empleados', d),
  actualizarEmpleado: (id: Id, d: any) => put(`/almacen/empleados/${id}`, d),
  estadoEmpleado: (id: Id, activar: boolean) => patch(`/almacen/empleados/${id}/${activar ? 'activar' : 'desactivar'}`),

  // Catálogo
  categorias: () => get<any[]>('/almacen/categorias'),
  crearCategoria: (d: any) => post('/almacen/categorias', d),
  actualizarCategoria: (id: Id, d: any) => put(`/almacen/categorias/${id}`, d),
  productos: (p: Params) => get<Paginado<Producto>>('/almacen/productos', p),
  productoPorCodigo: (codigo: string, idbodega?: Id | null) =>
    get<Producto>(`/almacen/productos/codigo/${encodeURIComponent(codigo)}`, { idbodega }),
  crearProducto: (d: any) => post<Producto>('/almacen/productos', d),
  actualizarProducto: (id: Id, d: any) => put<Producto>(`/almacen/productos/${id}`, d),
  ubicacion: (id: Id, idbodega: Id | null, ubicacion: string) => patch(`/almacen/productos/${id}/ubicacion`, { idbodega, ubicacion }),
  kardex: (id: Id, p: Params) => get(`/almacen/productos/${id}/kardex`, p),
  proveedores: (busqueda?: string) => get<any[]>('/almacen/proveedores', { busqueda }),
  crearProveedor: (d: any) => post('/almacen/proveedores', d),
  actualizarProveedor: (id: Id, d: any) => put(`/almacen/proveedores/${id}`, d),

  // Auxiliares
  socios: (busqueda: string) => get<any[]>('/almacen/socios', { busqueda }),
  vehiculos: (busqueda: string) => get<any[]>('/almacen/vehiculos', { busqueda }),
  historialVehiculo: (id: Id) => get<any[]>(`/almacen/vehiculos/${id}/historial`),
  metodosPago: () => get<{ idmetodopago: Id; nombre: string }[]>('/almacen/metodos-pago'),

  // Operaciones
  compras: (p: Params) => get<Paginado<any>>('/almacen/compras', p),
  compra: (id: Id) => get(`/almacen/compras/${id}`),
  registrarCompra: (d: any) => post('/almacen/compras', d),
  anularCompra: (id: Id, motivo: string) => patch(`/almacen/compras/${id}/anular`, { motivo }),
  ventas: (p: Params) => get<Paginado<any>>('/almacen/ventas', p),
  venta: (id: Id) => get(`/almacen/ventas/${id}`),
  registrarVenta: (d: any) => post('/almacen/ventas', d),
  anularVenta: (id: Id, motivo: string) => patch(`/almacen/ventas/${id}/anular`, { motivo }),
  reintentarFactura: (id: Id) => patch(`/almacen/ventas/${id}/facturar`),
  reintentarNotaCredito: (id: Id) => patch(`/almacen/ventas/${id}/nota-credito`),
  consumos: (p: Params) => get<Paginado<any>>('/almacen/consumos', p),
  registrarConsumo: (d: any) => post('/almacen/consumos', d),
  anularConsumo: (id: Id, motivo: string) => patch(`/almacen/consumos/${id}/anular`, { motivo }),
  traslados: (p: Params) => get<Paginado<any>>('/almacen/traslados', p),
  enviarTraslado: (d: any) => post('/almacen/traslados', d),
  recibirTraslado: (id: Id) => patch(`/almacen/traslados/${id}/recibir`),
  anularTraslado: (id: Id, motivo: string) => patch(`/almacen/traslados/${id}/anular`, { motivo }),
  ajustar: (d: any) => post('/almacen/ajustes', d),

  // Cartera
  cartera: (p: Params) => get<any[]>('/almacen/cartera', p),
  estadoCuenta: (id: Id) => get(`/almacen/cartera/${id}`),
  configurarCupo: (id: Id, d: { cupocredito: number; activo: boolean }) => put(`/almacen/cartera/${id}/cupo`, d),
  abonar: (id: Id, d: { valor: number; idmetodopago: Id; observacion?: string }) => post(`/almacen/cartera/${id}/abonos`, d),

  // Reportes
  reporteVentas: (p: Params) => get('/almacen/reportes/ventas', p),
  reporteVehiculos: (p: Params) => get('/almacen/reportes/vehiculos', p),
  reporteInventario: (idbodega?: Id | null) => get<any[]>('/almacen/reportes/inventario', { idbodega }),
};
