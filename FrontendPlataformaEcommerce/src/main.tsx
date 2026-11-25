import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';
import { activarBloqueoInspeccion } from './shared/utils/bloqueoInspeccion';

activarBloqueoInspeccion();

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '186642839091-tqu5tuisap4q95d2hldn1a0u64cde6p8.apps.googleusercontent.com';

// Usar un client ID dummy en nueva-password para evitar errores de OAuth
const isNuevaPasswordPage = window.location.pathname.includes('/nueva-password');
const clientId = isNuevaPasswordPage ? 'dummy-client-id' : GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
);
