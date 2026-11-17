import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../context/SidebarContext';
import logoCootranar from '../../../assets/LOGO-COOTRANAR.png';

// Mantiene la posición exacta del scroll del menú lateral al cambiar de página
let ultimoScrollSidebar = (() => {
  try {
    return Number(sessionStorage.getItem('cootranar_sidebar_scroll') || 0);
  } catch {
    return 0;
  }
})();

interface NavItem {
  path: string;
  label: string;
  icon: string;
  descripcion?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    id: 'analisis',
    title: 'Análisis',
    icon: 'analytics',
    items: [
      { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'dashboard', descripcion: 'Resumen financiero, métricas clave y estadísticas operativas del día.' },
      { path: ROUTES.REPORTE_INGRESOS, label: 'Ingresos por Bus', icon: 'bar_chart', descripcion: 'Consolidado de recaudo, ocupación y rendimiento por vehículo.' },
    ],
  },
  {
    id: 'taquilla',
    title: 'Taquilla',
    icon: 'confirmation_number',
    items: [
      { path: ROUTES.TAQUILLA, label: 'Venta de Tiquetes', icon: 'confirmation_number', descripcion: 'Punto de emisión, reserva y selección de asientos en tiempo real.' },
      { path: ROUTES.GESTION_TIQUETES, label: 'Tiquetes por Viaje', icon: 'receipt_long', descripcion: 'Control detallado de pasajeros y pasajes emitidos por itinerario.' },
    ],
  },
  {
    id: 'gestion-base',
    title: 'Gestión Base',
    icon: 'domain',
    items: [
      { path: ROUTES.CIUDADES, label: 'Ciudades', icon: 'location_city', descripcion: 'Directorio de ciudades de origen y destino de la red vial.' },
      { path: ROUTES.AGENCIAS, label: 'Agencias', icon: 'storefront', descripcion: 'Sedes y puntos de atención de la cooperativa en cada región.' },
      { path: ROUTES.OFICINAS, label: 'Oficinas', icon: 'apartment', descripcion: 'Taquillas y oficinas administrativas de despacho autorizadas.' },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    icon: 'directions_bus',
    items: [
      { path: ROUTES.TIPOS_BUS, label: 'Tipos de Bus', icon: 'directions_bus', descripcion: 'Modelos, carrocerías y distribución de silletería de la flota.' },
      { path: ROUTES.TIPOS_SERVICIO, label: 'Tipos de Servicio', icon: 'tune', descripcion: 'Categorías de viaje: Directo, Preferencial y Corriente.' },
      { path: ROUTES.VEHICULOS, label: 'Vehículos', icon: 'commute', descripcion: 'Expediente digital, SOAT, tecnomecánica y estado del parque automotor.' },
      { path: ROUTES.RUTAS, label: 'Rutas', icon: 'alt_route', descripcion: 'Trazados intermunicipales, distancias y paradas intermedias.' },
      { path: ROUTES.VIAJES, label: 'Viajes', icon: 'schedule', descripcion: 'Programación de itinerarios, horas de salida y asignación de buses.' },
      { path: ROUTES.BUSES_SEMILLA, label: 'Buses Semilla', icon: 'airport_shuttle', descripcion: 'Buses genéricos por capacidad para vender viajes futuros y trasladarlos al bus real.' },
    ],
  },
  {
    id: 'recursos-legal',
    title: 'Recursos y Legal',
    icon: 'shield_person',
    items: [
      { path: ROUTES.CONDUCTORES, label: 'Conductores', icon: 'badge', descripcion: 'Hojas de vida, licencias de conducción y control de conductores.' },
      { path: ROUTES.ASEGURADORAS, label: 'Aseguradoras', icon: 'health_and_safety', descripcion: 'Empresas aseguradoras y convenios de respaldo de la flota.' },
      { path: ROUTES.POLIZAS, label: 'Pólizas', icon: 'policy', descripcion: 'Pólizas contractuales y extracontractuales vigentes.' },
      { path: ROUTES.USUARIOS, label: 'Usuarios', icon: 'group', descripcion: 'Cuentas de usuario, roles y credenciales de acceso.' },
    ],
  },
  {
    id: 'encomiendas',
    title: 'Encomiendas',
    icon: 'inventory_2',
    items: [
      { path: ROUTES.ENCOMIENDAS, label: 'Encomiendas', icon: 'inventory_2', descripcion: 'Registro, cotización, emisión de guías y rastreo de paquetería.' },
      { path: ROUTES.DESPACHOS, label: 'Despachos', icon: 'local_shipping', descripcion: 'Manifiestos de carga y control de envíos entre agencias.' },
      { path: ROUTES.TARIFAS_ENCOMIENDAS, label: 'Tarifas Encomiendas', icon: 'price_change', descripcion: 'Tarifas base por ruta entre oficinas de encomiendas.' },
      { path: ROUTES.OFICINAS_ENCOMIENDAS, label: 'Oficinas Encomiendas', icon: 'store', descripcion: 'Puntos autorizados de recepción y entrega de paquetes.' },
    ],
  },
  {
    id: 'almacen',
    title: 'Almacén',
    icon: 'warehouse',
    items: [
      { path: ROUTES.ALMACEN, label: 'Resumen almacén', icon: 'monitoring', descripcion: 'Ventas del día, valor del inventario, alertas de stock mínimo y reportes.' },
      { path: ROUTES.ALMACEN_VENTA, label: 'Punto de venta', icon: 'point_of_sale', descripcion: 'Venta de repuestos y lubricantes a socios (contado o crédito) y público.' },
      { path: ROUTES.ALMACEN_VENTAS, label: 'Ventas', icon: 'receipt_long', descripcion: 'Historial de ventas, recibos y anulaciones.' },
      { path: ROUTES.ALMACEN_INVENTARIO, label: 'Inventario', icon: 'warehouse', descripcion: 'Existencias por bodega, kárdex, costo promedio y ajustes.' },
      { path: ROUTES.ALMACEN_PRODUCTOS, label: 'Productos', icon: 'oil_barrel', descripcion: 'Catálogo de repuestos y lubricantes, precios y categorías.' },
      { path: ROUTES.ALMACEN_COMPRAS, label: 'Compras', icon: 'add_shopping_cart', descripcion: 'Entradas de mercancía y proveedores.' },
      { path: ROUTES.ALMACEN_CONSUMO, label: 'Consumo flota', icon: 'build', descripcion: 'Salidas para mantenimiento de los buses de la empresa.' },
      { path: ROUTES.ALMACEN_TRASLADOS, label: 'Traslados', icon: 'swap_horiz', descripcion: 'Envío y recepción de mercancía entre bodegas.' },
      { path: ROUTES.ALMACEN_CARTERA, label: 'Crédito socios', icon: 'credit_score', descripcion: 'Cupos, deudas y abonos de los socios propietarios.' },
      { path: ROUTES.ALMACEN_CONFIGURACION, label: 'Puntos de almacén', icon: 'store', descripcion: 'Puntos de almacén: ciudad, dirección y teléfono.' },
    ],
  },
  {
    id: 'caja',
    title: 'Caja',
    icon: 'point_of_sale',
    items: [
      { path: ROUTES.CAJA, label: 'Caja', icon: 'point_of_sale', descripcion: 'Apertura, movimientos, arqueo y cierre de turno (reportes X y Z).' },
    ],
  },
  {
    id: 'contabilidad',
    title: 'Contabilidad',
    icon: 'account_balance',
    items: [
      { path: ROUTES.CONT, label: 'Dashboard financiero', icon: 'monitoring', descripcion: 'Ingresos, gastos, utilidad, saldos e indicadores.' },
      { path: ROUTES.CONT_COMPROBANTES, label: 'Comprobantes', icon: 'receipt_long', descripcion: 'Comprobantes manuales y automáticos, reversos.' },
      { path: ROUTES.CONT_LIBROS, label: 'Libros', icon: 'menu_book', descripcion: 'Balance de prueba, diario, mayor y auxiliares.' },
      { path: ROUTES.CONT_ESTADOS, label: 'Estados financieros', icon: 'account_balance', descripcion: 'Situación financiera, resultados, flujo de efectivo y comparativos.' },
      { path: ROUTES.CONT_TESORERIA, label: 'Tesorería y cartera', icon: 'account_balance_wallet', descripcion: 'Bancos, conciliación, cuentas por pagar y cartera.' },
      { path: ROUTES.CONT_IMPUESTOS, label: 'Impuestos', icon: 'percent', descripcion: 'IVA, retenciones, certificados, exógena e ICA.' },
      { path: ROUTES.CONT_CUENTAS, label: 'Plan de cuentas', icon: 'account_tree', descripcion: 'PUC, cuentas por operación y centros de costo.' },
      { path: ROUTES.CONT_TERCEROS, label: 'Terceros', icon: 'groups', descripcion: 'Clientes, proveedores y empleados con NIT/DV.' },
      { path: ROUTES.CONT_ACTIVOS, label: 'Activos fijos', icon: 'inventory_2', descripcion: 'Activos y depreciación mensual.' },
      { path: ROUTES.CONT_PRESUPUESTOS, label: 'Presupuestos', icon: 'savings', descripcion: 'Presupuesto vs ejecutado por cuenta y centro.' },
      { path: ROUTES.CONT_NOMINA, label: 'Nómina', icon: 'badge', descripcion: 'Causación contable de la nómina.' },
      { path: ROUTES.CONT_INTEGRACIONES, label: 'Integraciones', icon: 'sync', descripcion: 'Contabilización automática y conciliaciones.' },
      { path: ROUTES.CONT_CONFIGURACION, label: 'Configuración', icon: 'settings', descripcion: 'Períodos, cierre, empresa, parámetros y auditoría.' },
    ],
  },
  {
    id: 'empleados',
    title: 'Gestión Empleados',
    icon: 'assignment_ind',
    items: [
      { path: ROUTES.TAQUILLEROS, label: 'Taquilleros', icon: 'assignment_ind', descripcion: 'Asignación de turnos, apertura y arqueo de taquillas.' },
      { path: ROUTES.EMPLEADOS_ALMACEN, label: 'Empleados Almacén', icon: 'badge', descripcion: 'Personal de los puntos de almacén de repuestos y lubricantes.' },
      { path: ROUTES.EMPLEADOS_ENCOMIENDAS, label: 'Empleados Encomiendas', icon: 'person_pin', descripcion: 'Personal operativo a cargo de la gestión de carga.' },
    ],
  },
  {
    id: 'fidelizacion-web',
    title: 'Fidelización y Web',
    icon: 'web',
    items: [
      { path: ROUTES.CONFIGURACION_MILLAS, label: 'Programa de Millas', icon: 'loyalty', descripcion: 'Reglas de acumulación, niveles del club, recompensas y promociones.' },
      { path: ROUTES.CONTENIDO_WEB, label: 'Contenido Web', icon: 'web', descripcion: 'Gestión de textos, carrusel, Quiénes Somos y páginas públicas del E-commerce.' },
    ],
  },
];

interface SidebarProps {
  isLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isLoading = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed, toggle, isMobile, mobileOpen, setMobileOpen, theme, setTheme } = useSidebar();
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const [previewItem, setPreviewItem] = useState<{
    item: NavItem;
    sectionTitle?: string;
    top: number;
  } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const prevPathnameRef = useRef<string>(location.pathname);
  const [scrollActual, setScrollActual] = useState<number>(ultimoScrollSidebar);

  const guardarScrollSidebar = (valor: number) => {
    ultimoScrollSidebar = valor;
    setScrollActual(valor);
    try {
      sessionStorage.setItem('cootranar_sidebar_scroll', String(valor));
    } catch {
      /* sin storage */
    }
  };

  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = ultimoScrollSidebar;
    }
  }, [location.pathname, isLoading]);

  const isActive = (path: string) => location.pathname === path;
  const isDark = theme === 'dark';

  // Estado de secciones desplegadas por funcionalidad (acordeón)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>(() => {
    try {
      const guardado = sessionStorage.getItem('cootranar_sidebar_secciones');
      if (guardado) return JSON.parse(guardado);
    } catch {
      /* sin storage */
    }
    const inicial: Record<string, boolean> = {};
    for (const sec of sections) {
      inicial[sec.id] = sec.items.some((it) => it.path === location.pathname);
    }
    if (!Object.values(inicial).some(Boolean)) {
      inicial.analisis = true;
    }
    return inicial;
  });

  // Asegurar que la sección de la ruta actual se abra únicamente cuando cambia la ruta
  useEffect(() => {
    if (prevPathnameRef.current === location.pathname) return;
    prevPathnameRef.current = location.pathname;

    const seccionActiva = sections.find((sec) =>
      sec.items.some((it) => it.path === location.pathname)
    );
    if (seccionActiva) {
      setSeccionesAbiertas((prev) => {
        if (prev[seccionActiva.id]) return prev;
        const siguiente = { ...prev, [seccionActiva.id]: true };
        try {
          sessionStorage.setItem('cootranar_sidebar_secciones', JSON.stringify(siguiente));
        } catch {
          /* sin storage */
        }
        return siguiente;
      });
    }
  }, [location.pathname]);

  const toggleSeccion = (id: string) => {
    setSeccionesAbiertas((prev) => {
      const siguiente = { ...prev, [id]: !prev[id] };
      try {
        sessionStorage.setItem('cootranar_sidebar_secciones', JSON.stringify(siguiente));
      } catch {
        /* sin storage */
      }
      return siguiente;
    });
  };

  const cantidadSeccionesAbiertas = Object.values(seccionesAbiertas).filter(Boolean).length;

  const cerrarTodosLosMenus = () => {
    const vacio: Record<string, boolean> = {};
    setSeccionesAbiertas(vacio);
    try {
      sessionStorage.setItem('cootranar_sidebar_secciones', JSON.stringify(vacio));
    } catch {
      /* sin storage */
    }
  };

  const subirAlInicioSidebar = () => {
    if (navRef.current) {
      navRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    guardarScrollSidebar(0);
  };

  const shimmerGradient = isDark
    ? 'linear-gradient(90deg, #27272a 0%, #3f3f46 50%, #27272a 100%)'
    : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)';

  const boneStyle: React.CSSProperties = {
    background: shimmerGradient,
    backgroundSize: '200% 100%',
    animation: 'boneyardShimmer 1.5s infinite ease-in-out',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setMenuPerfilAbierto(false);
      }
    };
    if (menuPerfilAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuPerfilAbierto]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  // Filtrar secciones según el rol del usuario
  const filteredSections = sections
    .map((section) => {
      const items = section.items.filter((item) => {
        if (user?.nombrerol === 'TAQUILLERO') {
          return (
            item.path === ROUTES.CAJA ||
            item.path === ROUTES.TAQUILLA ||
            item.path === ROUTES.VIAJES ||
            item.path === ROUTES.BUSES_SEMILLA ||
            item.path === ROUTES.GESTION_TIQUETES
          );
        }
        if (user?.nombrerol === 'ALMACENISTA') {
          return (item.path.startsWith(ROUTES.ALMACEN) && item.path !== ROUTES.ALMACEN_CONFIGURACION) || item.path === ROUTES.CAJA;
        }
        if (user?.nombrerol === 'CONTADOR') {
          return item.path.startsWith(ROUTES.CONT) || item.path === ROUTES.CAJA;
        }
        if (user?.nombrerol === 'EMPLEADO_ENCOMIENDAS') {
          return (
            item.path === ROUTES.ENCOMIENDAS ||
            item.path === ROUTES.DESPACHOS ||
            item.path === ROUTES.TARIFAS_ENCOMIENDAS ||
            item.path === ROUTES.OFICINAS_ENCOMIENDAS ||
            item.path === ROUTES.EMPLEADOS_ENCOMIENDAS
          );
        }
        return true;
      });
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);

  // Paleta de colores dinámica según el tema
  const colors = isDark
    ? {
      bg: '#0f0f11',
      border: 'rgba(255, 255, 255, 0.08)',
      shadow: '0 20px 40px -8px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5)',
      text: '#ffffff',
      textMuted: '#94a3b8',
      divider: 'rgba(255, 255, 255, 0.07)',
      itemActiveBg: '#27272a',
      itemActiveText: '#ffffff',
      itemHoverBg: 'rgba(255, 255, 255, 0.06)',
      themeToggleBg: '#1e1e22',
      themeTogglePill: '#2e2e33',
      themeToggleActiveText: '#ffffff',
      themeToggleInactiveText: '#71717a',
      profileHoverBg: 'rgba(255, 255, 255, 0.06)',
      dropdownBg: '#18181b',
    }
    : {
      bg: '#ffffff',
      border: 'rgba(0, 0, 0, 0.06)',
      shadow: '0 12px 36px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
      text: '#0f172a',
      textMuted: '#64748b',
      divider: 'rgba(0, 0, 0, 0.06)',
      itemActiveBg: '#f1f5f9',
      itemActiveText: '#0f172a',
      itemHoverBg: 'rgba(0, 0, 0, 0.03)',
      themeToggleBg: '#f1f5f9',
      themeTogglePill: '#ffffff',
      themeToggleActiveText: '#0f172a',
      themeToggleInactiveText: '#94a3b8',
      profileHoverBg: 'rgba(0, 0, 0, 0.04)',
      dropdownBg: '#ffffff',
    };

  const ancho = isMobile ? 260 : (collapsed ? 74 : 260);

  return (
    <>
      {/* ── Backdrop para móvil ── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 90,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          bottom: '12px',
          width: `${ancho}px`,
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '26px',
          boxShadow: colors.shadow,
          display: 'flex',
          flexDirection: 'column',
          zIndex: isMobile ? 100 : 50,
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-130%)') : 'none',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease',
          userSelect: 'none',
          overflow: 'visible',
        }}
      >
        {/* ── 1. Top Window Dots (macOS style) ── */}
        <div
          style={{
            padding: collapsed ? '16px 0 10px' : '16px 20px 10px',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-start',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
        </div>

        {/* ── 2. Brand & Collapse Row ── */}
        <div
          style={{
            padding: collapsed ? '4px 0 12px' : '6px 16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            flexShrink: 0,
          }}
        >
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <button
                onClick={toggle}
                title="Contraer barra lateral"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.text,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.itemHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  menu
                </span>
              </button>

              <Link
                to={ROUTES.DASHBOARD}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  minWidth: 0,
                }}
              >
                <img
                  src={logoCootranar}
                  alt="Cootranar"
                  style={{
                    height: '55px',
                    maxWidth: '175px',
                    objectFit: 'contain',
                    display: 'block',
                    filter: isDark
                      ? 'brightness(1.3) contrast(1.15) drop-shadow(0 0 2px rgba(255,255,255,0.6))'
                      : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </Link>
            </div>
          ) : (
            <button
              onClick={toggle}
              title="Expandir barra lateral"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.itemHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                menu
              </span>
            </button>
          )}
        </div>

        {/* ── 2.5 Controles rápidos: Cerrar menús desplegados y Subir al inicio ── */}
        <div
          style={{
            padding: collapsed && !isMobile ? '0 8px 6px' : '0 12px 8px',
            display: 'flex',
            flexDirection: collapsed && !isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            borderBottom: `1px solid ${colors.divider}`,
          }}
        >
          <button
            type="button"
            onClick={cerrarTodosLosMenus}
            disabled={cantidadSeccionesAbiertas === 0}
            title="Cerrar todos los menús desplegados"
            style={{
              flex: collapsed && !isMobile ? undefined : 1,
              width: collapsed && !isMobile ? '44px' : undefined,
              height: '32px',
              padding: collapsed && !isMobile ? '0' : '0 10px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              backgroundColor:
                cantidadSeccionesAbiertas > 0
                  ? isDark
                    ? '#1e1e22'
                    : '#f8fafc'
                  : 'transparent',
              color: cantidadSeccionesAbiertas > 0 ? colors.text : colors.textMuted,
              opacity: cantidadSeccionesAbiertas > 0 ? 1 : 0.45,
              cursor: cantidadSeccionesAbiertas > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (cantidadSeccionesAbiertas > 0) {
                e.currentTarget.style.backgroundColor = colors.itemHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (cantidadSeccionesAbiertas > 0) {
                e.currentTarget.style.backgroundColor = isDark ? '#1e1e22' : '#f8fafc';
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              unfold_less
            </span>
            {(!collapsed || isMobile) && <span>Cerrar menús</span>}
          </button>

          <button
            type="button"
            onClick={subirAlInicioSidebar}
            disabled={scrollActual <= 4}
            title="Subir al principio del menú lateral"
            style={{
              flex: collapsed && !isMobile ? undefined : 1,
              width: collapsed && !isMobile ? '44px' : undefined,
              height: '32px',
              padding: collapsed && !isMobile ? '0' : '0 10px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              backgroundColor:
                scrollActual > 4
                  ? isDark
                    ? '#1e1e22'
                    : '#f8fafc'
                  : 'transparent',
              color: scrollActual > 4 ? colors.text : colors.textMuted,
              opacity: scrollActual > 4 ? 1 : 0.45,
              cursor: scrollActual > 4 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (scrollActual > 4) {
                e.currentTarget.style.backgroundColor = colors.itemHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (scrollActual > 4) {
                e.currentTarget.style.backgroundColor = isDark ? '#1e1e22' : '#f8fafc';
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              vertical_align_top
            </span>
            {(!collapsed || isMobile) && <span>Subir</span>}
          </button>
        </div>

        {/* ── 3. Navigation List (Scrollable) ── */}
        <nav
          ref={navRef}
          onScroll={(e) => guardarScrollSidebar(e.currentTarget.scrollTop)}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: collapsed ? '6px 8px' : '4px 10px',
            scrollbarWidth: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {filteredSections.map((section, sIndex) => {
            const abierta = Boolean(seccionesAbiertas[section.id]);
            const tieneActivo = section.items.some((it) => isActive(it.path));

            return (
              <div key={section.id || sIndex} style={{ marginBottom: '2px' }}>
                {sIndex > 0 && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: colors.divider,
                      margin: collapsed ? '6px 6px' : '5px 8px',
                    }}
                  />
                )}

                {/* Encabezado plegable de la funcionalidad */}
                {collapsed && !isMobile ? (
                  <button
                    type="button"
                    onClick={() => toggleSeccion(section.id)}
                    title={`${section.title} (${abierta ? 'Ocultar' : 'Mostrar'})`}
                    style={{
                      width: '44px',
                      height: '44px',
                      margin: '0 auto',
                      borderRadius: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      color: tieneActivo ? '#3b82f6' : colors.text,
                      backgroundColor: tieneActivo
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.16)'
                          : '#eff6ff'
                        : abierta
                          ? colors.itemHoverBg
                          : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '21px',
                        fontVariationSettings: tieneActivo ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {section.icon}
                    </span>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        fontSize: '12px',
                        opacity: 0.75,
                        transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSeccion(section.id)}
                    aria-expanded={abierta}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '9.5px 12px',
                      borderRadius: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13.5px',
                      fontWeight: tieneActivo || abierta ? 700 : 600,
                      color: tieneActivo ? (isDark ? '#60a5fa' : '#0D3B8E') : colors.text,
                      backgroundColor: tieneActivo
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.12)'
                          : '#eff6ff'
                        : abierta
                          ? colors.itemHoverBg
                          : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!tieneActivo) {
                        e.currentTarget.style.backgroundColor = colors.itemHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!tieneActivo) {
                        e.currentTarget.style.backgroundColor = abierta ? colors.itemHoverBg : 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '20px',
                          flexShrink: 0,
                          color: tieneActivo ? (isDark ? '#60a5fa' : '#0D3B8E') : colors.textMuted,
                          fontVariationSettings: tieneActivo ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        {section.icon}
                      </span>
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        {section.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
                          color: colors.textMuted,
                        }}
                      >
                        {section.items.length}
                      </span>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '19px',
                          color: colors.textMuted,
                          transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                )}

                {/* Lista desplegable de páginas de la funcionalidad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: abierta ? '1fr' : '0fr',
                    opacity: abierta ? 1 : 0,
                    transition: 'grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        marginTop: abierta ? '4px' : '0px',
                        marginLeft: collapsed && !isMobile ? 0 : '18px',
                        paddingLeft: collapsed && !isMobile ? 0 : '10px',
                        borderLeft:
                          collapsed && !isMobile
                            ? 'none'
                            : `2px solid ${isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'}`,
                      }}
                    >
                      {section.items.map((item) => {
                        const active = isActive(item.path);

                        if (collapsed && !isMobile) {
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => {
                                if (isMobile) setMobileOpen(false);
                                setPreviewItem(null);
                              }}
                              style={{
                                width: '40px',
                                height: '40px',
                                margin: '0 auto',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                                color: active ? colors.itemActiveText : colors.textMuted,
                                backgroundColor: active ? colors.itemActiveBg : 'transparent',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!active) {
                                  e.currentTarget.style.backgroundColor = colors.itemHoverBg;
                                  e.currentTarget.style.color = colors.text;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPreviewItem({
                                  item,
                                  sectionTitle: section.title,
                                  top: rect.top,
                                });
                              }}
                              onMouseLeave={(e) => {
                                if (!active) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = colors.textMuted;
                                }
                                setPreviewItem(null);
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: '19px',
                                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                                }}
                              >
                                {item.icon}
                              </span>
                            </Link>
                          );
                        }

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                              if (isMobile) setMobileOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '11px',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              textDecoration: 'none',
                              fontSize: '13px',
                              fontWeight: active ? 700 : 500,
                              color: active ? colors.itemActiveText : colors.textMuted,
                              backgroundColor: active ? colors.itemActiveBg : 'transparent',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!active) {
                                e.currentTarget.style.backgroundColor = colors.itemHoverBg;
                                e.currentTarget.style.color = colors.text;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!active) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = colors.textMuted;
                              }
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '18px',
                                flexShrink: 0,
                                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              {item.icon}
                            </span>
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                              }}
                            >
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── 4. Theme Switcher (Light / Dark pill toggle) ── */}
        <div
          style={{
            padding: collapsed ? '10px 0' : '10px 14px',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
            borderTop: `1px solid ${colors.divider}`,
          }}
        >
          {!collapsed ? (
            <div
              style={{
                width: '100%',
                backgroundColor: colors.themeToggleBg,
                borderRadius: '999px',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setTheme('light')}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 0',
                  background: !isDark ? colors.themeTogglePill : 'transparent',
                  color: !isDark ? colors.themeToggleActiveText : colors.themeToggleInactiveText,
                  boxShadow: !isDark ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Modo Claro"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  light_mode
                </span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 0',
                  background: isDark ? colors.themeTogglePill : 'transparent',
                  color: isDark ? colors.themeToggleActiveText : colors.themeToggleInactiveText,
                  boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Modo Oscuro"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  dark_mode
                </span>
              </button>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: colors.themeToggleBg,
                borderRadius: '999px',
                padding: '3px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setTheme('light')}
                style={{
                  width: '30px',
                  height: '30px',
                  border: 'none',
                  borderRadius: '50%',
                  background: !isDark ? colors.themeTogglePill : 'transparent',
                  color: !isDark ? colors.themeToggleActiveText : colors.themeToggleInactiveText,
                  boxShadow: !isDark ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Modo Claro"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  light_mode
                </span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  width: '30px',
                  height: '30px',
                  border: 'none',
                  borderRadius: '50%',
                  background: isDark ? colors.themeTogglePill : 'transparent',
                  color: isDark ? colors.themeToggleActiveText : colors.themeToggleInactiveText,
                  boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Modo Oscuro"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  dark_mode
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ── 5. User Profile Footer ── */}
        <div
          ref={profileRef}
          style={{
            padding: collapsed ? '10px 0 14px' : '10px 14px 14px',
            borderTop: `1px solid ${colors.divider}`,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {isLoading ? (
            !collapsed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 8px',
                  borderRadius: '14px',
                }}
              >
                <div style={{ ...boneStyle, width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ ...boneStyle, width: '75px', height: '13px', borderRadius: '3px' }} />
                  <div style={{ ...boneStyle, width: '60px', height: '10px', borderRadius: '3px' }} />
                </div>
                <div style={{ ...boneStyle, width: '16px', height: '16px', borderRadius: '4px' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...boneStyle, width: '40px', height: '40px', borderRadius: '50%' }} />
              </div>
            )
          ) : !collapsed ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 8px',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => setMenuPerfilAbierto((v) => !v)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.profileHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Avatar con burbuja indicadora */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {user?.fotoperfil ? (
                  <img
                    src={user.fotoperfil}
                    alt={user.nombre || 'Avatar'}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'
                )}
                {/* Burbujita de estado */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    border: `2px solid ${colors.bg}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    zIndex: 2,
                  }}
                />
              </div>

              {/* Name and Role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: colors.text,
                    margin: 0,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.nombre || 'Usuario'}
                </p>
                <p
                  style={{
                    fontSize: '10.5px',
                    color: colors.textMuted,
                    margin: '2px 0 0 0',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.nombrerol || 'Administrador'}
                </p>
              </div>

              {/* 3 dots action icon */}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  display: 'flex',
                  color: colors.textMuted,
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                  more_vert
                </span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setMenuPerfilAbierto((v) => !v)}
                title={`${user?.nombre || 'Usuario'} (${user?.nombrerol || 'Rol'}) - Opciones de perfil`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {user?.fotoperfil ? (
                  <img
                    src={user.fotoperfil}
                    alt={user.nombre || 'Avatar'}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'
                )}
                {/* Burbujita indicadora en avatar contraído */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    border: `2px solid ${colors.bg}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 2,
                  }}
                />
              </button>
            </div>
          )}

          {/* Profile popup menu for Logout */}
          {menuPerfilAbierto && (
            <div
              style={{
                position: 'absolute',
                bottom: collapsed ? '4px' : '100%',
                left: collapsed ? '76px' : '14px',
                right: collapsed ? 'auto' : '14px',
                marginBottom: collapsed ? '0px' : '8px',
                backgroundColor: colors.dropdownBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                boxShadow: colors.shadow,
                padding: '8px',
                zIndex: 100,
                minWidth: '190px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${colors.divider}`,
                  marginBottom: '6px',
                }}
              >
                <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: colors.text }}>
                  {user?.nombre || 'Usuario'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: colors.textMuted }}>
                  {user?.nombrerol || 'Administrador'}
                </p>
              </div>

              {/* Opción Mi Perfil */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuPerfilAbierto(false);
                  navigate(ROUTES.PERFIL);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.itemHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#3b82f6' }}>
                  account_circle
                </span>
                Mi Perfil
              </button>

              {/* Opción Cerrar Sesión */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  logout
                </span>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Tarjeta Flotante de Vista Previa al pasar el mouse en modo contraído ── */}
      {collapsed && !isMobile && previewItem && (
        <div
          style={{
            position: 'fixed',
            left: '82px',
            top: `${previewItem.top}px`,
            transform: 'translateY(-12px)',
            width: '260px',
            backgroundColor: isDark ? '#141417' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: isDark
              ? '0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 16px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
            padding: '14px 16px',
            zIndex: 99999,
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Indicador flechita */}
          <div
            style={{
              position: 'absolute',
              left: '-6px',
              top: '20px',
              width: '12px',
              height: '12px',
              backgroundColor: isDark ? '#141417' : '#ffffff',
              borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
              transform: 'rotate(45deg)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {previewItem.item.icon}
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: colors.text }}>
                {previewItem.item.label}
              </h4>
            </div>

            {previewItem.sectionTitle && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  color: colors.textMuted,
                }}
              >
                {previewItem.sectionTitle}
              </span>
            )}
          </div>

          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '11.5px',
              lineHeight: 1.45,
              color: colors.textMuted,
            }}
          >
            {previewItem.item.descripcion || 'Accede al módulo de administración y control.'}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 700,
              color: '#3b82f6',
              borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
              paddingTop: '8px',
            }}
          >
            <span>Ir a la página</span>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              arrow_forward
            </span>
          </div>
        </div>
      )}
    </>
  );
};

