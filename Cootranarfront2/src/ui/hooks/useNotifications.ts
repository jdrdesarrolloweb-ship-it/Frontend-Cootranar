import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { httpClient, API_BASE_URL } from '../../infrastructure/api/httpClient';

export interface NotificacionItem {
  id: string;
  modulo: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  icono: string;
  color: string;
  prioridad: 'BAJA' | 'NORMAL' | 'ALTA';
  ruta?: string | null;
  fecha: string;
  leido: boolean;
}

export type EstadoConexion = 'conectando' | 'conectado' | 'desconectado';

/**
 * URL del WebSocket a partir de la misma API que usa el panel:
 * http://localhost:3000/api → ws://localhost:3000/ws ; https://x/api → wss://x/ws ; /api → wss://<host>/ws
 */
const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const base = API_BASE_URL.startsWith('http')
    ? API_BASE_URL
    : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;
  return base.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws';
};

/** "Hace 5 min", "Hace 2 horas", "Hace 3 días" */
export const tiempoRelativo = (fecha: string): string => {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (!Number.isFinite(min) || min < 1) return 'Justo ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
};

/**
 * Notificaciones del sistema interno en tiempo real (WebSocket nativo contra ms-notificaciones).
 * Carga el historial por REST, recibe las nuevas por WebSocket y se reconecta solo.
 */
export const useNotifications = () => {
  const { user, token } = useAuth();
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [noLeidasServidor, setNoLeidasServidor] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<EstadoConexion>('desconectado');
  const wsRef = useRef<WebSocket | null>(null);
  const [, setTick] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const res = await httpClient.get('/notificaciones', { params: { limite: 50 } });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNotificaciones(res.data.data);
        setNoLeidasServidor(Number(res.data.noLeidas) || 0);
      }
    } catch (err) {
      console.warn('[useNotifications] No se pudieron cargar las notificaciones:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const authToken = token || localStorage.getItem('authToken');
    if (!user || !authToken) return;

    cargar();
    let cerrado = false;
    let reintento: ReturnType<typeof setTimeout>;
    let ping: ReturnType<typeof setInterval>;
    let espera = 2000;

    const conectar = () => {
      if (cerrado) return;
      setEstado('conectando');
      const ws = new WebSocket(`${getWsUrl()}?token=${encodeURIComponent(authToken)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setEstado('conectado');
        espera = 2000;
        ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'ping' })), 25000);
        // Al reconectar se recarga para no perder lo que llegó mientras no había conexión
        cargar();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'nueva_notificacion' && msg.data) {
            const nueva: NotificacionItem = msg.data;
            setNotificaciones((prev) => (prev.some((n) => n.id === nueva.id) ? prev : [nueva, ...prev].slice(0, 100)));
            setNoLeidasServidor((n) => n + 1);
          }
        } catch {
          // mensaje no JSON: se ignora
        }
      };

      ws.onclose = () => {
        clearInterval(ping);
        setEstado('desconectado');
        if (!cerrado) {
          reintento = setTimeout(conectar, espera);
          espera = Math.min(espera * 2, 30000); // reintentos progresivos hasta 30 s
        }
      };
      ws.onerror = () => ws.close();
    };

    conectar();
    // Refrescar los "Hace X min" cada minuto
    const reloj = setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      cerrado = true;
      clearTimeout(reintento);
      clearInterval(ping);
      clearInterval(reloj);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, token, cargar]);

  const marcarLeida = useCallback(async (id: string) => {
    let eraNoLeida = false;
    setNotificaciones((prev) => prev.map((n) => {
      if (n.id === id && !n.leido) eraNoLeida = true;
      return n.id === id ? { ...n, leido: true } : n;
    }));
    if (eraNoLeida) setNoLeidasServidor((n) => Math.max(n - 1, 0));
    try {
      await httpClient.patch(`/notificaciones/${id}/leido`);
    } catch {
      wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: 'marcar_leida', id }));
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    setNoLeidasServidor(0);
    try {
      await httpClient.patch('/notificaciones/marcar-todas-leidas');
    } catch {
      wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: 'marcar_todas_leidas' }));
    }
  }, []);

  return {
    notificaciones,
    // El servidor cuenta también las no leídas que no alcanzan a estar en la lista cargada
    noLeidasCount: Math.max(noLeidasServidor, notificaciones.filter((n) => !n.leido).length),
    cargando,
    estado,
    marcarLeida,
    marcarTodasLeidas,
    recargar: cargar,
  };
};
