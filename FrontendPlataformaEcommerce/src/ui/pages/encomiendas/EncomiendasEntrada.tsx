import { useEffect, useState } from 'react';
import { haySesionLocal } from '../../../infrastructure/api/httpClient';
import { CotizarEncomiendaPage } from './CotizarEncomiendaPage';
import { EncomiendasInfoPage } from './EncomiendasInfoPage';

/**
 * /encomiendas: sin sesión muestra la página informativa (con botones que abren
 * el modal de login); con sesión, el cotizador. Si el usuario inicia sesión
 * desde la página o el navbar, pasa al cotizador sin recargar.
 */
export function EncomiendasEntrada() {
  const [conSesion, setConSesion] = useState(haySesionLocal);

  useEffect(() => {
    const alIniciar = () => setConSesion(haySesionLocal());
    window.addEventListener('cootranar:sesion-iniciada', alIniciar);
    return () => window.removeEventListener('cootranar:sesion-iniciada', alIniciar);
  }, []);

  return conSesion
    ? <CotizarEncomiendaPage />
    : <EncomiendasInfoPage onQuiereCotizar={() => setConSesion(true)} />;
}
