import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ModalLogin } from '../auth/ModalLogin';
import { useAuth } from '../../hooks/useAuth';
import { usePreferencias } from '../../context/PreferenciasContext';
import { ROUTES } from '../../../shared/constants';
import { SUBMENUS_QUIENES_SOMOS } from '../../pages/quienes-somos/QuienesSomosPage';
import { AvatarUsuario } from '../common/AvatarUsuario';
import logoImg from '../../../assets/Logo.png.png';
import type { Idioma } from '../../../shared/i18n/translations';

/** "JULIAN DAVID" + "ROSALES PORTILLA" → "Julian Rosales" (cabe en una línea). */
const nombreCorto = (nombre?: string, apellido?: string) =>
  [nombre, apellido]
    .map((p) => String(p ?? '').trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getUsuario, logout } = useAuth();
  const usuario = getUsuario();
  // Login en modal sobre la página actual (sin navegar a /login).
  const [loginAbierto, setLoginAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [quienesSomosAbierto, setQuienesSomosAbierto] = useState(false);
  // Al bajar, el navbar gana sombra para "flotar" sobre el contenido.
  const [conScroll, setConScroll] = useState(false);
  useEffect(() => {
    const alScroll = () => setConScroll(window.scrollY > 8);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);
  const menuRef = useRef<HTMLDivElement>(null);
  const quienesSomosRef = useRef<HTMLDivElement>(null);
  const { esDark, toggleTema, idioma, setIdioma, tx } = usePreferencias();
  const n = tx.navbar;
  const es = idioma === 'es';

  // Navegación principal: igual con o sin sesión. Lo personal va en el menú del usuario.
  const enlacesDesktop = [
    { label: n.home, path: ROUTES.HOME },
    { label: n.viajes, path: ROUTES.VIAJES },
    { label: n.encomiendas, path: ROUTES.ENCOMIENDAS },
  ];

  const enlacesMenuUsuario = [
    { label: n.misViajes, path: ROUTES.MIS_VIAJES, icon: 'confirmation_number' },
    { label: n.misEncomiendas, path: ROUTES.MIS_ENCOMIENDAS, icon: 'inventory_2' },
    { label: n.millas, path: ROUTES.MILLAS, icon: 'stars', badge: 'VIP' },
    { label: es ? 'Mi perfil' : 'My profile', path: ROUTES.PERFIL, icon: 'person' },
  ];

  // Barra inferior (móvil): máximo 5 accesos para que no se amontone.
  const enlacesBottomNav = [
    { label: n.home, path: ROUTES.HOME, icon: 'home' },
    { label: n.viajes, path: ROUTES.VIAJES, icon: 'travel_explore' },
    { label: n.encomiendas, path: ROUTES.ENCOMIENDAS, icon: 'local_shipping' },
    { label: es ? 'Nosotros' : 'About Us', path: ROUTES.QUIENES_SOMOS_MISION_VISION, icon: 'corporate_fare' },
    ...(usuario
      ? [
        { label: n.misViajes, path: ROUTES.MIS_VIAJES, icon: 'confirmation_number' },
      ]
      : []),
  ];

  // Cerrar el menú al hacer clic fuera, con Escape o al cambiar de página.
  useEffect(() => {
    if (!menuAbierto && !quienesSomosAbierto) return;
    const alClic = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
      if (quienesSomosRef.current && !quienesSomosRef.current.contains(e.target as Node)) setQuienesSomosAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAbierto(false);
        setQuienesSomosAbierto(false);
      }
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [menuAbierto, quienesSomosAbierto]);
  useEffect(() => {
    setMenuAbierto(false);
    setQuienesSomosAbierto(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuAbierto(false);
    await logout();
    // El catálogo es público: al cerrar sesión se vuelve al inicio, no al login.
    navigate(ROUTES.HOME);
  };

  /* ── Clases condicionales según tema ── */
  const navBg = esDark ? 'bg-[#0d1b2e]/95 border-white/10' : 'bg-white/95 border-slate-200/80';
  const navSombra = conScroll
    ? (esDark ? 'shadow-[0_8px_30px_rgba(0,0,0,0.45)]' : 'shadow-[0_8px_30px_rgba(14,58,140,0.14)]')
    : (esDark ? 'shadow-[0_2px_10px_rgba(0,0,0,0.3)]' : 'shadow-[0_2px_12px_rgba(14,58,140,0.07)]');
  const linkActive = esDark ? 'text-white bg-white/10' : 'text-[#0e3a8c] bg-[#e8f0fe]';
  const linkInactive = esDark
    ? 'text-slate-300 hover:text-white hover:bg-white/5'
    : 'text-slate-600 hover:text-[#0e3a8c] hover:bg-slate-100';
  const capsula = esDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200';
  const pillBg = esDark ? 'bg-white/5' : 'bg-slate-100';
  const pillActive = esDark ? 'bg-white/15 text-white' : 'bg-[#0e3a8c] text-white';
  const pillInactive = esDark
    ? 'text-slate-400 hover:text-white'
    : 'text-slate-500 hover:text-slate-800';
  const iconBtn = esDark
    ? 'text-slate-400 hover:text-white hover:bg-white/10'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100';
  const userName = esDark ? 'text-white' : 'text-[#0e3a8c]';
  const menuPanel = esDark ? 'bg-[#0d1b2e] border-white/10' : 'bg-white border-slate-200';
  const menuItem = esDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-50';

  const bottomNavBg = esDark
    ? 'bg-[#0d1b2e] border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]'
    : 'bg-white border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]';
  const bottomActive = esDark ? 'bg-white/10 text-white' : 'bg-[#e8f0fe] text-[#0e3a8c]';
  const bottomInactive = esDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600';
  const bottomLabelActive = esDark ? 'text-white' : 'text-[#0e3a8c]';
  const bottomLabelInactive = esDark ? 'text-slate-500' : 'text-slate-400';

  const correo = (usuario as { correo?: string } | null)?.correo;
  const enSeccionPersonal = enlacesMenuUsuario.some((e) => e.path === location.pathname);

  return (
    <>
      {/* Header top bar */}
      <header className={`sticky top-0 z-[60] border-b backdrop-blur-md transition-all duration-300 ${navBg} ${navSombra}`}>
        {/* Franja de marca: rojo del logo → azul Cootranar */}
        <div aria-hidden="true" className="h-[3px] bg-gradient-to-r from-[#c62828] via-[#0e3a8c] to-[#1d4ed8]" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center select-none py-1 group shrink-0">
            <img
              id="navbar-logo"
              src={logoImg}
              alt="Cootranar"
              className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {enlacesDesktop.map((enlace) => {
              const activo = location.pathname === enlace.path;
              return (
                <Link
                  key={enlace.path}
                  to={enlace.path}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${activo ? linkActive : linkInactive
                    }`}
                >
                  {enlace.label}
                  {activo && (
                    <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 -bottom-[11px] h-[3px] w-8 rounded-full bg-gradient-to-r from-[#c62828] to-[#0e3a8c]" />
                  )}
                </Link>
              );
            })}

            {/* Menú desplegable: Quiénes Somos */}
            <div
              ref={quienesSomosRef}
              className="relative"
              onMouseEnter={() => setQuienesSomosAbierto(true)}
              onMouseLeave={() => setQuienesSomosAbierto(false)}
            >
              {(() => {
                const enQuienesSomos = location.pathname.startsWith(ROUTES.QUIENES_SOMOS);
                return (
                  <button
                    type="button"
                    onClick={() => setQuienesSomosAbierto((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={quienesSomosAbierto}
                    className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1 cursor-pointer ${enQuienesSomos || quienesSomosAbierto ? linkActive : linkInactive
                      }`}
                  >
                    <span>{es ? 'Quiénes Somos' : 'About Us'}</span>
                    <span
                      className={`material-symbols-outlined text-base transition-transform duration-200 ${quienesSomosAbierto ? 'rotate-180' : ''
                        }`}
                    >
                      expand_more
                    </span>
                    {enQuienesSomos && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 -translate-x-1/2 -bottom-[11px] h-[3px] w-8 rounded-full bg-gradient-to-r from-[#c62828] to-[#0e3a8c]"
                      />
                    )}
                  </button>
                );
              })()}

              {quienesSomosAbierto && (
                <div
                  role="menu"
                  className="absolute left-0 top-full pt-2 w-64 z-[70]"
                >
                  <div
                    className={`rounded-2xl border shadow-2xl overflow-hidden py-1.5 ${menuPanel}`}
                  >
                    {SUBMENUS_QUIENES_SOMOS.map((item) => {
                      const itemActivo =
                        location.pathname === item.path ||
                        (location.pathname === ROUTES.QUIENES_SOMOS && item.id === 'mision-vision');
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          role="menuitem"
                          onClick={() => setQuienesSomosAbierto(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${itemActivo
                            ? esDark
                              ? 'bg-[#0e3a8c] text-white'
                              : 'bg-[#0e3a8c] text-white'
                            : menuItem
                            }`}
                        >
                          <span
                            className={`material-symbols-outlined text-lg ${itemActivo
                              ? 'text-sky-300'
                              : 'text-[#0e3a8c] dark:text-blue-400'
                              }`}
                          >
                            {item.icon}
                          </span>
                          <span className="leading-snug">{es ? item.labelEs : item.labelEn}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Utilidades agrupadas en una cápsula para separarlas de la navegación */}
            <div className={`flex items-center gap-1 rounded-full border p-1 ${capsula}`}>

              {/* Botón de ayuda — solo en HomePage */}
              {location.pathname === ROUTES.HOME && (
                <button
                  id="navbar-btn-tour"
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('cootranar:iniciar-tour'))}
                  title={es ? 'Ver tutorial de búsqueda' : 'View search tutorial'}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${iconBtn} relative group`}
                >
                  <span className="material-symbols-outlined text-xl">help_outline</span>
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute top-full mt-2 right-0 whitespace-nowrap bg-[#0e3a8c] dark:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-50">
                    {es ? '¿Cómo buscar un viaje?' : 'How to search a trip?'}
                  </span>
                </button>
              )}

              {/* Language selector */}
              <div className={`hidden sm:flex items-center gap-1 rounded-full p-0.5 transition-colors duration-200 ${pillBg}`}>
                {(['es', 'en'] as Idioma[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setIdioma(lang)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${idioma === lang ? pillActive : pillInactive
                      }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTema}
                title={esDark ? 'Modo claro' : 'Modo oscuro'}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${iconBtn}`}
              >
                <span className="material-symbols-outlined text-xl">
                  {esDark ? 'dark_mode' : 'light_mode'}
                </span>
              </button>
            </div>

            {usuario ? (
              /* ── Menú de usuario ── */
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAbierto((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuAbierto}
                  className={`flex items-center gap-2 rounded-full border pl-1 pr-2.5 py-1 transition-all duration-200 ${menuAbierto || enSeccionPersonal
                    ? (esDark ? 'bg-white/10 border-white/20' : 'bg-[#e8f0fe] border-[#0e3a8c]/25')
                    : (esDark ? 'border-white/10 hover:bg-white/10' : 'border-slate-200 hover:border-[#0e3a8c]/30 hover:bg-slate-50')
                    }`}
                >
                  <span className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-white/20 flex items-center justify-center shrink-0">
                    <AvatarUsuario usuario={usuario} size="sm" />
                  </span>
                  <span className={`hidden lg:block text-sm font-bold whitespace-nowrap max-w-[160px] truncate ${userName}`}>
                    {nombreCorto(usuario.nombre, usuario.apellido)}
                  </span>
                  <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''} ${esDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    expand_more
                  </span>
                </button>

                {menuAbierto && (
                  <div
                    role="menu"
                    className={`absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-xl overflow-hidden z-[70] ${menuPanel}`}
                  >
                    <div className={`flex items-center gap-3 px-4 py-3 border-b ${esDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        <AvatarUsuario usuario={usuario} size="sm" />
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${esDark ? 'text-white' : 'text-slate-900'}`}>
                          {usuario.nombre} {usuario.apellido}
                        </p>
                        {correo && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{correo}</p>}
                      </div>
                    </div>

                    <div className="py-1.5">
                      {enlacesMenuUsuario.map((e) => {
                        const activo = location.pathname === e.path;
                        return (
                          <Link
                            key={e.path}
                            to={e.path}
                            role="menuitem"
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${menuItem} ${activo ? (esDark ? 'text-white bg-white/5' : 'text-[#0e3a8c] bg-[#e8f0fe]/60') : ''
                              }`}
                          >
                            <span className="material-symbols-outlined text-xl text-[#0e3a8c] dark:text-blue-400">{e.icon}</span>
                            <span className="flex-1">{e.label}</span>
                            {e.badge && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                {e.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    <div className={`border-t py-1.5 ${esDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        {n.cerrarSesion}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginAbierto(true)}
                className="bg-gradient-to-r from-[#0e3a8c] to-[#1d4ed8] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md shadow-blue-900/25 hover:shadow-lg hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
              >
                {n.iniciarSesion}
              </button>
            )}
          </div>
        </div>
      </header>

      <ModalLogin
        abierto={loginAbierto}
        onCerrar={() => setLoginAbierto(false)}
        onExito={() => {
          setLoginAbierto(false);
          // Avisa al resto de la página (p. ej. la vista de asientos) que ya hay sesión.
          window.dispatchEvent(new Event('cootranar:sesion-iniciada'));
        }}
      />

      {/* Bottom Navigation — solo móvil y tablet */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-[60] border-t transition-colors duration-200 ${bottomNavBg}`}>
        <div className="flex items-center justify-around px-2 pt-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
          {enlacesBottomNav.map((enlace) => {
            const activo =
              location.pathname === enlace.path ||
              (enlace.path.startsWith(ROUTES.QUIENES_SOMOS) && location.pathname.startsWith(ROUTES.QUIENES_SOMOS));
            return (
              <Link
                key={enlace.path}
                to={enlace.path}
                className="flex flex-col items-center gap-1 min-w-[56px]"
              >
                <div
                  className={`px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${activo ? bottomActive : bottomInactive
                    }`}
                >
                  <span
                    className="material-symbols-outlined text-[24px] block"
                    style={{ fontVariationSettings: activo ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {enlace.icon}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold tracking-wide whitespace-nowrap transition-colors duration-200 ${activo ? bottomLabelActive : bottomLabelInactive
                    }`}
                >
                  {enlace.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
