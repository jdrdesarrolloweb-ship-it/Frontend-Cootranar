import axios from 'axios';
import { descifrarDataRecursivo } from '../../shared/utils/cryptoRsa';
import { isTokenExpired, clearAuthStorage } from '../../shared/utils/authUtils';

declare module 'axios' {
  interface AxiosRequestConfig {
    _retriedRemote?: boolean;
  }
}

const isLocalHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

const LOCAL_API_URL = 'http://localhost:3000/api';
const REMOTE_API_URL = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://cootranar-api-ecosystem.onrender.com/api');

export const getApiBaseUrl = (): string => {
  if (isLocalHost) {
    return LOCAL_API_URL;
  }
  return REMOTE_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Permite enviar y recibir cookies
});

let isRedirecting = false;

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const url = config.url || '';
  // Endpoints públicos: no llevan sesión (una sesión vencida no debe sacar al usuario
  // de la recuperación de contraseña).
  const isLoginUrl = url.includes('/auth/login') || url.includes('/login')
    || url.includes('/auth/olvide-password') || url.includes('/auth/restablecer-password');

  if (token && !isLoginUrl) {
    if (isTokenExpired(token)) {
      console.warn('⚠️ Token JWT expirado antes de enviar petición. Limpiando sesión...');
      clearAuthStorage();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(new axios.Cancel('Sesión expirada'));
    }

    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

httpClient.interceptors.response.use(
  async (response) => {
    if (response.data) {
      response.data = await descifrarDataRecursivo(response.data);
    }
    return response;
  },
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Si estamos en localhost y el gateway local (:3000) no responde, reintentar automáticamente en Render
    if (isLocalHost && !error.response && error.config && !error.config._retriedRemote && REMOTE_API_URL !== LOCAL_API_URL) {
      error.config._retriedRemote = true;
      error.config.baseURL = REMOTE_API_URL;
      return httpClient.request(error.config);
    }

    const status = error.response?.status;
    const url = error.config?.url;
    let data = error.response?.data;

    // Intentar descifrar data si viene cifrado
    if (data) {
      try {
        data = await descifrarDataRecursivo(data);
      } catch {
        // Mantener data tal como está si falla
      }
    }

    console.error(`[HTTP Error] ${status} en ${url}`, data);

    if (status === 403) {
      console.warn('⚠️ Error 403: Sin permisos para este recurso.');
    }

    if (status === 401) {
      const msg = (data?.message || '').toLowerCase();
      const esLoginUrl = url?.includes('/auth/login') || url?.includes('/login');
      const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login');
      const esPermisos = msg.includes('permiso') || msg.includes('autorizado') || msg.includes('rol') || msg.includes('acceso') || msg.includes('no tiene');

      console.log('[401 Debug] Mensaje:', msg);

      if (esPermisos) {
        console.warn('⚠️ Error 401: Sin permisos suficientes. No se cierra sesión.');
      } else if (!esLoginUrl) {
        // En cualquier petición protegida no autorizada (token expirado, inválido o ausente)
        console.warn('⚠️ Error 401: Sesión no válida o expirada. Redirigiendo a Login...');
        clearAuthStorage();

        if (!isLoginPage && !isRedirecting) {
          isRedirecting = true;
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
