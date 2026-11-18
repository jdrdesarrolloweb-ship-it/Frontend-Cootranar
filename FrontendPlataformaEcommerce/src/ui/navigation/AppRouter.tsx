import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';
import { RegistroPage } from '../pages/auth/RegistroPage';
import { VerificarEmailPage } from '../pages/auth/VerificarEmailPage';
import { OlvidoPasswordPage } from '../pages/auth/OlvidoPasswordPage';
import { VerificarCodigoPage } from '../pages/auth/VerificarCodigoPage';
import { NuevaPasswordPage } from '../pages/auth/NuevaPasswordPage';
import { HomePage } from '../pages/home/HomePage';
import { ViajesDestinosPage } from '../pages/viajes/ViajesDestinosPage';
import { SeleccionAsientosPage } from '../pages/seleccion-asientos/SeleccionAsientosPage';
import { MisViajesPage } from '../pages/mis-viajes/MisViajesPage';
import { EncomiendasEntrada } from '../pages/encomiendas/EncomiendasEntrada';
import { MisEncomiendasPage } from '../pages/encomiendas/MisEncomiendasPage';
import { MillasPage } from '../pages/millas/MillasPage';
import { PerfilPage } from '../pages/perfil/PerfilPage';
import { PagoResultadoPage } from '../pages/pago/PagoResultadoPage';
import { QuienesSomosPage } from '../pages/quienes-somos/QuienesSomosPage';
import { PrivateRoute } from './PrivateRoute';
import { ROUTES } from '../../shared/constants';

/** Mismo contenedor que usa PrivateRoute: deja espacio a la barra inferior móvil. */
const LayoutPublico = () => (
  <div className="md:pb-0 pb-20">
    <Outlet />
  </div>
);

export const AppRouter = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Autenticación: /login redirige al inicio y abre el modal de login */}
      <Route path={ROUTES.LOGIN} element={<Navigate to={`${ROUTES.HOME}?auth=login`} replace />} />
      <Route path={ROUTES.REGISTRO} element={<RegistroPage />} />
      <Route path={ROUTES.VERIFICAR_EMAIL} element={<VerificarEmailPage />} />
      <Route path={ROUTES.RECUPERAR_PASSWORD} element={<OlvidoPasswordPage />} />
      <Route path={ROUTES.VERIFICAR_CODIGO_PASSWORD} element={<VerificarCodigoPage />} />
      <Route path={ROUTES.NUEVA_PASSWORD} element={<NuevaPasswordPage />} />

      {/* Catálogo público: cualquiera puede buscar viajes y ver los asientos.
          El inicio de sesión se pide al empezar la compra (al reservar asiento). */}
      <Route element={<LayoutPublico />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.VIAJES} element={<ViajesDestinosPage />} />
        {/* Sin sesión: página informativa; con sesión: cotizador */}
        <Route path={ROUTES.ENCOMIENDAS} element={<EncomiendasEntrada />} />
        <Route path={ROUTES.SELECCION_ASIENTOS} element={<SeleccionAsientosPage />} />
        <Route path={ROUTES.QUIENES_SOMOS} element={<QuienesSomosPage />} />
        <Route path={`${ROUTES.QUIENES_SOMOS}/:seccion`} element={<QuienesSomosPage />} />
      </Route>

      {/* Rutas protegidas - requieren autenticación */}
      <Route element={<PrivateRoute />}>
        <Route path={ROUTES.MIS_VIAJES} element={<MisViajesPage />} />

        <Route path={ROUTES.MIS_ENCOMIENDAS} element={<MisEncomiendasPage />} />
        <Route path={ROUTES.MILLAS} element={<MillasPage />} />
        <Route path={ROUTES.PERFIL} element={<PerfilPage />} />
        <Route path={ROUTES.PAGO_RESULTADO} element={<PagoResultadoPage />} />
        <Route path="/pago/resultado" element={<PagoResultadoPage />} />
      </Route>

      <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </>
  );
};
