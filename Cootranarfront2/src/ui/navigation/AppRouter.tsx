import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { TiquetesPage } from '../pages/tiquetes/TiquetesPage';
import { TaquillaPage } from '../pages/taquilla/TaquillaPage';
import { EncomiendaPage } from '../pages/encomiendas/EncomiendaPage';
import { DespachosPage } from '../pages/despachos/DespachosPage';
import { GestionTiquetesPage } from '../pages/viajes/GestionTiquetesPage';
import { AgenciasPage } from '../pages/agencias/AgenciasPage';
import { AseguradorasPage } from '../pages/aseguradoras/AseguradorasPage';
import { CiudadesPage } from '../pages/ciudades/CiudadesPage';
import { ConductoresPage } from '../pages/conductores/ConductoresPage';
import { OficinasPage } from '../pages/oficinas/OficinasPage';
import { PolizasPage } from '../pages/polizas/PolizasPage';
import { VehiculosPage } from '../pages/vehiculos/VehiculosPage';
import { ViajesPage } from '../pages/viajes/ViajesPage';
import { BusesSemillaPage } from '../pages/vehiculos/BusesSemillaPage';
import { TiposServicioPage } from '../pages/tipos-servicio/TiposServicioPage';
import { TiposBusPage } from '../pages/tipos-bus/TiposBusPage';
import { RutasPage } from '../pages/rutas/RutasPage';
import { ConfiguracionMillasPage } from '../pages/millas/ConfiguracionMillasPage';
import { GestionContenidoWebPage } from '../pages/contenido-web/GestionContenidoWebPage';
import { TarifasRutaPage } from '../pages/rutas/TarifasRutaPage';
import { ConfiguracionMasivaTarifasPage } from '../pages/rutas/ConfiguracionMasivaTarifasPage';
import { TaquillerosPage } from '../pages/empleados/TaquillerosPage';
import { EmpleadosEncomiendasPage } from '../pages/empleados/EmpleadosEncomiendasPage';
import { EmpleadosAlmacenPage } from '../pages/empleados/EmpleadosAlmacenPage';
import { CajaPage } from '../pages/contabilidad/CajaPage';
import { ContabilidadDashboardPage } from '../pages/contabilidad/ContabilidadDashboardPage';
import { ComprobantesPage } from '../pages/contabilidad/ComprobantesPage';
import { LibrosPage } from '../pages/contabilidad/LibrosPage';
import { EstadosFinancierosPage } from '../pages/contabilidad/EstadosFinancierosPage';
import { PlanCuentasPage } from '../pages/contabilidad/PlanCuentasPage';
import { TercerosPage } from '../pages/contabilidad/TercerosPage';
import { TesoreriaPage } from '../pages/contabilidad/TesoreriaPage';
import { ImpuestosPage } from '../pages/contabilidad/ImpuestosPage';
import { ActivosPage, PresupuestosPage, NominaPage } from '../pages/contabilidad/GestionContablePages';
import { IntegracionesPage } from '../pages/contabilidad/IntegracionesPage';
import { ConfiguracionContablePage } from '../pages/contabilidad/ConfiguracionContablePage';
import { OficinasEncomiendasPage } from '../pages/oficinas-encomiendas/OficinasEncomiendasPage';
import { TarifasEncomiendasPage } from '../pages/encomiendas/TarifasEncomiendasPage';
import { UsuariosPage } from '../pages/usuarios/UsuariosPage';
import { ReporteIngresosPage } from '../pages/reportes/ReporteIngresosPage';
import { PerfilPage } from '../pages/perfil/PerfilPage';
import { AlmacenDashboardPage } from '../pages/almacen/AlmacenDashboardPage';
import { PuntoVentaPage } from '../pages/almacen/PuntoVentaPage';
import { VentasAlmacenPage } from '../pages/almacen/VentasAlmacenPage';
import { ProductosAlmacenPage } from '../pages/almacen/ProductosAlmacenPage';
import { InventarioAlmacenPage } from '../pages/almacen/InventarioAlmacenPage';
import { ComprasAlmacenPage } from '../pages/almacen/ComprasAlmacenPage';
import { ConsumoInternoPage } from '../pages/almacen/ConsumoInternoPage';
import { TrasladosAlmacenPage } from '../pages/almacen/TrasladosAlmacenPage';
import { CarteraSociosPage } from '../pages/almacen/CarteraSociosPage';
import { ConfiguracionAlmacenPage } from '../pages/almacen/ConfiguracionAlmacenPage';
import { PrivateRoute } from './PrivateRoute';
import { BaseDatosPage } from '../pages/base-datos/BaseDatosPage';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ROUTES } from '../../shared/constants';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          
          {/* Ruta universal de Perfil para cualquier usuario autenticado */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'TAQUILLERO', 'EMPLEADO_ENCOMIENDAS', 'ALMACENISTA', 'CONTADOR', 'OPERADOR']} />}>
            <Route path={ROUTES.PERFIL} element={<PerfilPage />} />
          </Route>

          {/* Rutas compartidas (Administrador y Taquillero) */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'TAQUILLERO']} />}>
            <Route path={ROUTES.TAQUILLA} element={<TaquillaPage />} />
            <Route path={ROUTES.VIAJES} element={<ViajesPage />} />
            <Route path={ROUTES.BUSES_SEMILLA} element={<BusesSemillaPage />} />
            <Route path={ROUTES.GESTION_TIQUETES} element={<GestionTiquetesPage />} />
          </Route>

          {/* Rutas de Encomiendas (Administrador y Empleado de Encomiendas) */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO_ENCOMIENDAS']} />}>
            <Route path={ROUTES.ENCOMIENDAS} element={<EncomiendaPage />} />
            <Route path={ROUTES.DESPACHOS} element={<DespachosPage />} />
            <Route path={ROUTES.TARIFAS_ENCOMIENDAS} element={<TarifasEncomiendasPage />} />
            <Route path={ROUTES.EMPLEADOS_ENCOMIENDAS} element={<EmpleadosEncomiendasPage />} />
            <Route path={ROUTES.OFICINAS_ENCOMIENDAS} element={<OficinasEncomiendasPage />} />
          </Route>

          {/* Almacén de repuestos y lubricantes (Administrador y Almacenista) */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'ALMACENISTA']} />}>
            <Route path={ROUTES.ALMACEN} element={<AlmacenDashboardPage />} />
            <Route path={ROUTES.ALMACEN_VENTA} element={<PuntoVentaPage />} />
            <Route path={ROUTES.ALMACEN_VENTAS} element={<VentasAlmacenPage />} />
            <Route path={ROUTES.ALMACEN_PRODUCTOS} element={<ProductosAlmacenPage />} />
            <Route path={ROUTES.ALMACEN_INVENTARIO} element={<InventarioAlmacenPage />} />
            <Route path={ROUTES.ALMACEN_COMPRAS} element={<ComprasAlmacenPage />} />
            <Route path={ROUTES.ALMACEN_CONSUMO} element={<ConsumoInternoPage />} />
            <Route path={ROUTES.ALMACEN_TRASLADOS} element={<TrasladosAlmacenPage />} />
            <Route path={ROUTES.ALMACEN_CARTERA} element={<CarteraSociosPage />} />
          </Route>

          {/* Caja: cajeros de taquilla y almacén, contador y administrador */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'CONTADOR', 'ALMACENISTA', 'TAQUILLERO']} />}>
            <Route path={ROUTES.CAJA} element={<CajaPage />} />
          </Route>

          {/* Contabilidad (Administrador y Contador) */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR', 'CONTADOR']} />}>
            <Route path={ROUTES.CONT} element={<ContabilidadDashboardPage />} />
            <Route path={ROUTES.CONT_COMPROBANTES} element={<ComprobantesPage />} />
            <Route path={ROUTES.CONT_LIBROS} element={<LibrosPage />} />
            <Route path={ROUTES.CONT_ESTADOS} element={<EstadosFinancierosPage />} />
            <Route path={ROUTES.CONT_CUENTAS} element={<PlanCuentasPage />} />
            <Route path={ROUTES.CONT_TERCEROS} element={<TercerosPage />} />
            <Route path={ROUTES.CONT_TESORERIA} element={<TesoreriaPage />} />
            <Route path={ROUTES.CONT_IMPUESTOS} element={<ImpuestosPage />} />
            <Route path={ROUTES.CONT_ACTIVOS} element={<ActivosPage />} />
            <Route path={ROUTES.CONT_PRESUPUESTOS} element={<PresupuestosPage />} />
            <Route path={ROUTES.CONT_NOMINA} element={<NominaPage />} />
            <Route path={ROUTES.CONT_INTEGRACIONES} element={<IntegracionesPage />} />
            <Route path={ROUTES.CONT_CONFIGURACION} element={<ConfiguracionContablePage />} />
          </Route>

          {/* Rutas exclusivas del Administrador */}
          <Route element={<PrivateRoute allowedRoles={['ADMINISTRADOR']} />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.REPORTE_INGRESOS} element={<ReporteIngresosPage />} />
            <Route path={ROUTES.TIQUETES} element={<TiquetesPage />} />
            <Route path={ROUTES.RUTAS} element={<RutasPage />} />
            <Route path="/rutas/:idruta/tarifas" element={<TarifasRutaPage />} />
            <Route path="/rutas/:idruta/tarifas-masivas" element={<ConfiguracionMasivaTarifasPage />} />
            <Route path={ROUTES.AGENCIAS} element={<AgenciasPage />} />
            <Route path={ROUTES.ASEGURADORAS} element={<AseguradorasPage />} />
            <Route path={ROUTES.CIUDADES} element={<CiudadesPage />} />
            <Route path={ROUTES.CONDUCTORES} element={<ConductoresPage />} />
            <Route path={ROUTES.OFICINAS} element={<OficinasPage />} />
            <Route path={ROUTES.POLIZAS} element={<PolizasPage />} />
            <Route path={ROUTES.VEHICULOS} element={<VehiculosPage />} />
            <Route path={ROUTES.TIPOS_SERVICIO} element={<TiposServicioPage />} />
            <Route path={ROUTES.TIPOS_BUS} element={<TiposBusPage />} />
            <Route path={ROUTES.TAQUILLEROS} element={<TaquillerosPage />} />
            <Route path={ROUTES.USUARIOS} element={<UsuariosPage />} />
            <Route path={ROUTES.CONFIGURACION_MILLAS} element={<ConfiguracionMillasPage />} />
            <Route path={ROUTES.CONTENIDO_WEB} element={<GestionContenidoWebPage />} />
            <Route path={ROUTES.ALMACEN_CONFIGURACION} element={<ConfiguracionAlmacenPage />} />
            <Route path={ROUTES.EMPLEADOS_ALMACEN} element={<EmpleadosAlmacenPage />} />
            <Route path={ROUTES.BASE_DATOS} element={<BaseDatosPage />} />
          </Route>

          <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
