import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { httpClient } from '../../infrastructure/api/httpClient';

export interface NotificacionItem {
  id: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  icono: string;
  color: string;
  leido: boolean;
  ruta?: string;
}

/**
 * Calcula la URL del WebSocket nativo dinámicamente según el entorno
 */
const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsProtocol = isHttps ? 'wss:' : 'ws:';
  
  if (import.meta.env.VITE_API_URL) {
    const cleanHost = String(import.meta.env.VITE_API_URL)
      .replace(/^https?:\/\//, '')
      .replace(/\/api\/?$/, '');
    return `${wsProtocol}//${cleanHost}/ws`;
  }

  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `${wsProtocol}//${host}:3000/ws`;
};

export const useNotifications = () => {
  const { user, token } = useAuth();
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Cargar notificaciones iniciales desde el backend vía REST
  const cargarNotificaciones = useCallback(async () => {
    try {
      setCargando(true);
      const rolActual = user?.rolActivo || user?.nombrerol;
      const res = await httpClient.get('/notificaciones', {
        params: {
          rol: rolActual,
          idusuario: user?.idusuario
        }
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNotificaciones(res.data.data);
      }
    } catch (err) {
      console.warn('[useNotifications] No se pudieron cargar notificaciones iniciales:', err);
    } finally {
      setCargando(false);
    }
  }, [user]);

  // 2. Conectar al WebSocket NATIVO (RFC 6455 del Navegador)
  useEffect(() => {
    if (!user) return;

    cargarNotificaciones();

    let unmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let pingInterval: ReturnType<typeof setInterval>;

    const connectWebSocket = () => {
      if (unmounted) return;

      const authToken = token || localStorage.getItem('authToken') || '';
      const baseUrl = getWsUrl();
      const params = new URLSearchParams();

      const rolActual = user.rolActivo || user.nombrerol;
      if (authToken) params.set('token', authToken);
      if (rolActual) params.set('rol', rolActual);
      if (user.idusuario) params.set('idusuario', String(user.idusuario));

      const fullWsUrl = `${baseUrl}?${params.toString()}`;

      try {
        console.log('⚡ [useNotifications] Conectando a WebSocket NATIVO:', baseUrl);
        const ws = new WebSocket(fullWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🔔 [useNotifications] WebSocket NATIVO conectado exitosamente');

          // Keep-alive ping periódico cada 25 segundos
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const mensaje = JSON.parse(event.data);

            if (mensaje.type === 'nueva_notificacion' && mensaje.data) {
              const nueva: NotificacionItem = mensaje.data;
              console.log('⚡ [useNotifications] Nueva notificación en tiempo real recibida:', nueva.titulo);

              setNotificaciones((prev) => {
                if (prev.some((n) => n.id === nueva.id)) return prev;
                return [nueva, ...prev];
              });

              // Sonido sutil de alerta
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.4;
                audio.play().catch(() => {});
              } catch {
                // Audio autoplay restringido por browser
              }
            }
          } catch (err) {
            console.warn('[useNotifications] Error parseando mensaje WebSocket:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('⚠️ [useNotifications] Error en WebSocket nativo:', err);
        };

        ws.onclose = (event) => {
          clearInterval(pingInterval);
          if (!unmounted) {
            console.log(`⚠️ [useNotifications] WebSocket cerrado (${event.code}). Reconectando en 3s...`);
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (err) {
        console.error('❌ [useNotifications] Error iniciando WebSocket nativo:', err);
        if (!unmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        }
      }
    };

    connectWebSocket();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, token, cargarNotificaciones]);

  // 3. Marcar notificación como leída
  const marcarLeida = useCallback(async (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
    );

    try {
      await httpClient.patch(`/notificaciones/${id}/leido`);
    } catch {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'marcar_leida', id }));
      }
    }
  }, []);

  // 4. Marcar todas como leídas
  const marcarTodasLeidas = useCallback(async () => {
    setNotificaciones((prev) =>
      prev.map((n) => ({ ...n, leido: true }))
    );

    try {
      await httpClient.patch('/notificaciones/marcar-todas-leidas');
    } catch {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'marcar_todas_leidas' }));
      }
    }
  }, []);

  const noLeidasCount = notificaciones.filter((n) => !n.leido).length;

  return {
    notificaciones,
    noLeidasCount,
    cargando,
    marcarLeida,
    marcarTodasLeidas,
    recargar: cargarNotificaciones
  };
};
