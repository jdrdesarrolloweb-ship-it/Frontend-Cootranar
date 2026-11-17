import axios from 'axios';
import { descifrarDataRecursivo } from '../../shared/utils/cryptoRsa';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Si es true, un 401 en esta petición NO redirige a /login: solo limpia la
     * sesión local y deja que quien llamó maneje el error (p. ej. abriendo el
     * modal de inicio de sesión sin perder la vista de compra).
     */
    skipAuthRedirect?: boolean;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // envía y recibe cookies HttpOnly del backend
  headers: {
    'Content-Type': 'application/json',
  },
});


export const clearSession = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('usuario');
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

/** true si el navegador tiene restos de una sesión iniciada (usuario o token). */
export const haySesionLocal = (): boolean => {
  const usuario = localStorage.getItem('usuario');
  const token = localStorage.getItem('authToken');
  const valido = (v: string | null) => !!v && v !== 'undefined' && v !== 'null';
  return valido(usuario) || valido(token);
};



// ─── Interceptor de REQUEST: adjunta token ────────────────────────────────────
httpClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('authToken');

  // Lista de endpoints públicos que NO deben incluir el token
  const publicEndpoints = [
    '/auth/login',
    '/auth/registrar',
    '/auth/verificar-email',
    '/auth/olvide-password',
    '/auth/restablecer-password',
    '/auth/reenviar-verificacion',
    '/auth/loginGoogle',
  ];

  const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

  if (token && !isPublicEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ─── Interceptor de RESPONSE: descifrado automático y maneja 401 ────────────
httpClient.interceptors.response.use(
  async (response) => {
    if (response.data) {
      response.data = await descifrarDataRecursivo(response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || '';
      const enNuevaPassword = currentPath.includes('/nueva-password') || requestUrl.includes('restablecer-password');

      if (error.config?.skipAuthRedirect) {
        // Quien llamó decide qué hacer (p. ej. pedir login en un modal).
        clearSession();
      } else if (!enNuevaPassword && haySesionLocal()) {
        // Había una sesión y el backend la rechazó: expiró o es inválida.
        // Un visitante sin sesión navegando el catálogo público NO se redirige.
        clearSession();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
