import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import { usePreferencias } from '../../context/PreferenciasContext';
import { ROUTES } from '../../../shared/constants';
import logo from '../../../assets/Logo.png.png';
import busCootranar from '../../../assets/busCootranar.png';
import { BotonesRedes } from './redesSociales';

export type ModoAuth = 'login' | 'registro';

export interface ModalLoginProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama tras iniciar sesión con éxito. */
  onExito: () => void;
  /** Vista con la que se abre (por defecto, iniciar sesión). */
  modoInicial?: ModoAuth;
  /** Textos del modo "iniciar sesión" (p. ej. los de la compra). */
  titulo?: string;
  subtitulo?: string;
  /** Contenido extra sobre el formulario de login (p. ej. el resumen del viaje). */
  encabezado?: ReactNode;
  textoBoton?: string;
}

type Vista = ModoAuth | 'registrado';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '186642839091-tqu5tuisap4q95d2hldn1a0u64cde6p8.apps.googleusercontent.com';
const GOOGLE_HABILITADO =
  !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'TU_GOOGLE_CLIENT_ID_AQUI';

const DURACION_MS = 220;
const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'Pasaporte'];

const REGISTRO_VACIO = {
  nombre: '', apellido: '', correo: '', password: '', confirmarPassword: '',
  tipoDocumento: 'CC', documento: '', telefono: '', direccion: '',
};
type CampoRegistro = keyof typeof REGISTRO_VACIO;

/** Mismas reglas que la página de registro. */
const validarCampo = (name: CampoRegistro, value: string, password: string): string => {
  if (!value) return '';
  switch (name) {
    case 'correo':
      return !value.includes('@') ? 'El correo debe contener @' : '';
    case 'password': {
      const faltan: string[] = [];
      if (value.length < 6 || value.length > 12) faltan.push('entre 6 y 12 caracteres');
      if (!/[A-Z]/.test(value)) faltan.push('1 mayúscula');
      if (!/[0-9]/.test(value)) faltan.push('1 número');
      return faltan.length ? `Falta: ${faltan.join(', ')}` : '';
    }
    case 'confirmarPassword':
      return value !== password ? 'Las contraseñas no coinciden' : '';
    case 'telefono':
      return !/^\d{7,15}$/.test(value) ? 'Teléfono inválido (7-15 dígitos)' : '';
    case 'documento':
      return !/^\d+$/.test(value) ? 'Solo se permiten números' : '';
    default:
      return '';
  }
};

/**
 * Inicio de sesión y registro en un modal sobre la página actual (sin navegar
 * a /login ni /registro), para no hacer un cambio de página brusco.
 * Escritorio: panel con la foto del bus y las redes + formulario. Móvil: franja + formulario.
 */
export function ModalLogin({ abierto, onCerrar, onExito, modoInicial = 'login', titulo, subtitulo, encabezado, textoBoton }: ModalLoginProps) {
  const { login, loginGoogle, registro, loading, error, setError } = useAuth();
  const { esDark, idioma } = usePreferencias();
  const es = idioma === 'es';

  // Montado + visible por separado para animar la entrada y la salida.
  const [montado, setMontado] = useState(abierto);
  const [visible, setVisible] = useState(false);
  const [vista, setVista] = useState<Vista>(modoInicial);
  const [contenidoVisible, setContenidoVisible] = useState(true);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [reg, setReg] = useState({ ...REGISTRO_VACIO });
  const [erroresReg, setErroresReg] = useState<Partial<Record<CampoRegistro, string>>>({});
  const [verPasswordReg, setVerPasswordReg] = useState(false);
  const primerCampoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // La página padre puede re-renderizarse a menudo (p. ej. contador de reserva):
  // onCerrar se guarda en una ref para no reiniciar el efecto en cada render.
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      setVista(modoInicial);
      setContenidoVisible(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMontado(false), DURACION_MS);
    return () => clearTimeout(t);
  }, [abierto, modoInicial]);

  useEffect(() => {
    if (!abierto) return;
    setError('');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrarRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Foco en el primer campo de cada vista
  useEffect(() => {
    if (!abierto || vista === 'registrado') return;
    const t = setTimeout(() => primerCampoRef.current?.focus(), 90);
    return () => clearTimeout(t);
  }, [abierto, vista]);

  if (!montado) return null;

  /** Cambio de vista con un fundido corto, sin saltos. */
  const cambiarVista = (siguiente: Vista) => {
    setContenidoVisible(false);
    setTimeout(() => {
      setVista(siguiente);
      setError('');
      scrollRef.current?.scrollTo({ top: 0 });
      setContenidoVisible(true);
    }, 140);
  };

  // ── Login ────────────────────────────────────────────────────────────────
  const exito = () => {
    setPassword('');
    onExito();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ correo: correo.trim(), password });
      exito();
    } catch {
      // useAuth deja el mensaje en `error`
    }
  };

  const handleGoogle = async (resp: CredentialResponse) => {
    if (!resp.credential) return;
    try {
      await loginGoogle(resp.credential);
      exito();
    } catch {
      // useAuth deja el mensaje en `error`
    }
  };

  // ── Registro ─────────────────────────────────────────────────────────────
  const cambiarReg = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name as CampoRegistro;
    const value = e.target.value;
    setReg((prev) => ({ ...prev, [name]: value }));
    setErroresReg((prev) => ({
      ...prev,
      [name]: validarCampo(name, value, name === 'password' ? value : reg.password),
      ...(name === 'password' && reg.confirmarPassword
        ? { confirmarPassword: validarCampo('confirmarPassword', reg.confirmarPassword, value) }
        : {}),
    }));
    setError('');
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    const errores = Object.fromEntries(
      (Object.keys(reg) as CampoRegistro[]).map((k) => [
        k,
        reg[k].trim() ? validarCampo(k, reg[k], reg.password) : (es ? 'Campo obligatorio' : 'Required field'),
      ])
    ) as Partial<Record<CampoRegistro, string>>;
    if (reg.password !== reg.confirmarPassword) errores.confirmarPassword = 'Las contraseñas no coinciden';
    if (Object.values(errores).some(Boolean)) {
      setErroresReg(errores);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmarPassword, ...data } = reg;
      await registro(data);
      setCorreo(reg.correo);
      cambiarVista('registrado');
    } catch (err: any) {
      const msg = String(err?.response?.data?.message ?? '').toLowerCase();
      const yaExiste = msg.includes('existe') || msg.includes('registrado') || msg.includes('uso');
      if (yaExiste && msg.includes('documento')) setErroresReg((p) => ({ ...p, documento: 'El documento ya se encuentra registrado' }));
      if (yaExiste && msg.includes('correo')) setErroresReg((p) => ({ ...p, correo: 'El correo ya se encuentra registrado' }));
    }
  };

  // ── Estilos ──────────────────────────────────────────────────────────────
  const panel = esDark ? 'bg-[#0d1b2e] text-white' : 'bg-white text-slate-900';
  const sub = esDark ? 'text-slate-400' : 'text-slate-500';
  const inputBase = esDark
    ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:bg-slate-700'
    : 'bg-slate-50/80 border-slate-300 text-slate-800 placeholder:text-slate-400 focus:bg-white';
  const enlace = 'font-bold text-[#0e3a8c] dark:text-blue-400 hover:underline cursor-pointer';
  const botonPrimario =
    'w-full h-12 rounded-full bg-[#082b71] hover:bg-[#061d4e] active:scale-[0.99] disabled:opacity-70 text-white font-bold text-[15px] shadow-lg shadow-[#082b71]/25 flex items-center justify-center gap-2 transition-all';

  const campo = (
    nombre: CampoRegistro,
    etiqueta: string,
    icono: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    ref?: React.Ref<HTMLInputElement>
  ) => (
    <label className="block min-w-0">
      <span className="text-xs font-bold ml-1">{etiqueta}</span>
      <div className="relative mt-1">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">{icono}</span>
        <input
          ref={ref}
          name={nombre}
          value={reg[nombre]}
          onChange={cambiarReg}
          required
          aria-invalid={Boolean(erroresReg[nombre])}
          className={`w-full h-11 pl-10 pr-3 rounded-xl border text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 transition-colors ${inputBase} ${erroresReg[nombre] ? 'border-red-400' : ''}`}
          {...props}
        />
      </div>
      {erroresReg[nombre] && <p className="text-[11px] ml-1 mt-0.5 text-red-600">{erroresReg[nombre]}</p>}
    </label>
  );

  const esRegistro = vista === 'registro' || vista === 'registrado';

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4" role="presentation">
      <div
        className={`absolute inset-0 bg-[#06183d]/60 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCerrar}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-login-titulo"
        className={`relative w-full sm:max-w-[960px] max-h-[94dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl flex transition-all duration-200 ease-out ${panel} ${visible ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95'
          }`}
      >
        {/* ── Panel visual (solo escritorio) ── */}
        <div className="hidden md:flex relative w-[42%] shrink-0 flex-col justify-between p-7 text-white overflow-hidden">
          <img src={busCootranar} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_35%]" />
          <img src={busCootranar} alt="" fetchPriority="low" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[center_35%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06183d]/95 via-[#06183d]/35 to-[#06183d]/20" />
          <div className="relative">
            <BotonesRedes />
          </div>
          <div className={`relative transition-opacity duration-150 ${contenidoVisible ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight">
              {esRegistro
                ? <>{es ? 'Únete a' : 'Join'} <span className="block text-[#38bdf8]">Cootranar.</span></>
                : <>{es ? 'Tu viaje seguro' : 'Your safe trip'} <span className="block text-[#38bdf8]">{es ? 'empieza aquí.' : 'starts here.'}</span></>}
            </h2>
            <p className="text-sm text-blue-100/90 mt-3 leading-relaxed">
              {esRegistro
                ? (es ? 'Crea tu cuenta y empieza a reservar tus viajes de forma rápida, cómoda y segura.' : 'Create your account and book your trips quickly, comfortably and safely.')
                : (es ? 'Accede a tu cuenta para gestionar tus reservas, acumular millas y viajar con la comodidad que mereces.' : 'Sign in to manage your bookings, earn miles and travel in comfort.')}
            </p>
            <div className="flex flex-wrap gap-5 mt-5">
              {[
                { icono: 'security', t: es ? 'Seguridad Total' : 'Total Safety', d: es ? 'Monitoreo GPS 24/7' : '24/7 GPS tracking' },
                { icono: 'schedule', t: es ? 'Puntualidad' : 'On time', d: es ? 'Horarios garantizados' : 'Guaranteed schedules' },
              ].map((b) => (
                <div key={b.t} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-sky-300">{b.icono}</span>
                  <div>
                    <p className="text-xs font-bold leading-tight">{b.t}</p>
                    <p className="text-[11px] text-blue-200/80 leading-tight">{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
          {/* Franja superior en móvil: foto + redes */}
          <div className="md:hidden relative h-24 overflow-hidden">
            <img src={busCootranar} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_40%]" />
            <img src={busCootranar} alt="" fetchPriority="low" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[center_40%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06183d]/90 to-[#06183d]/40" />
            <div className="relative h-full flex items-center px-5">
              <BotonesRedes tamano={38} />
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label={es ? 'Cerrar' : 'Close'}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div
            className={`px-6 sm:px-10 pt-6 md:pt-9 pb-[calc(1.75rem+env(safe-area-inset-bottom))] mx-auto transition-all duration-150 ${vista === 'registro' ? 'max-w-[500px]' : 'max-w-[440px]'
              } ${contenidoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
          >
            {/* ─────────── Registro exitoso ─────────── */}
            {vista === 'registrado' && (
              <div className="text-center py-6">
                <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-3xl">mark_email_read</span>
                </div>
                <h2 id="modal-login-titulo" className="text-2xl font-extrabold tracking-tight">{es ? '¡Registro exitoso!' : 'Account created!'}</h2>
                <p className="text-sm font-semibold mt-2">
                  {es ? 'Te enviamos un correo de verificación a' : 'We sent a verification email to'}{' '}
                  <span className="text-[#0e3a8c] dark:text-blue-400">{reg.correo}</span>
                </p>
                <p className={`text-xs mt-2 mb-7 leading-relaxed ${sub}`}>
                  {es ? 'Abre el enlace del correo para activar tu cuenta y luego inicia sesión.' : 'Open the link in the email to activate your account, then sign in.'}
                </p>
                <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className={`${botonPrimario} mb-4`}>
                  {es ? 'Ir a mi correo' : 'Open my email'}
                  <span className="material-symbols-outlined text-lg">mail</span>
                </a>
                <button type="button" onClick={() => { setReg({ ...REGISTRO_VACIO }); cambiarVista('login'); }} className={`text-sm ${enlace}`}>
                  {es ? 'Ya verifiqué, iniciar sesión' : 'I verified it, sign in'}
                </button>
              </div>
            )}

            {vista !== 'registrado' && (
              <div className="flex flex-col items-center text-center mb-5">
                <img src={logo} alt="Cootranar" className="h-11 w-auto object-contain mb-3" />
                <h2 id="modal-login-titulo" className="text-2xl font-extrabold tracking-tight">
                  {vista === 'registro'
                    ? (es ? 'Crear cuenta' : 'Create account')
                    : (titulo ?? (es ? 'Bienvenido de nuevo' : 'Welcome back'))}
                </h2>
                <p className={`text-sm mt-1 ${sub}`}>
                  {vista === 'registro'
                    ? (es ? 'Completa tus datos para registrarte.' : 'Fill in your details to sign up.')
                    : (subtitulo ?? (es ? 'Compra tus tiquetes, consulta tus viajes y acumula millas.' : 'Buy tickets, check your trips and earn miles.'))}
                </p>
              </div>
            )}

            {vista !== 'registrado' && error && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200" role="alert">
                <p className="text-xs font-semibold text-red-700 text-center">{error}</p>
              </div>
            )}

            {/* ─────────── Iniciar sesión ─────────── */}
            {vista === 'login' && (
              <>
                {encabezado}

                {GOOGLE_HABILITADO && (
                  <>
                    <div className="flex justify-center mb-3">
                      <GoogleLogin
                        onSuccess={handleGoogle}
                        onError={() => setError(es ? 'Error al iniciar sesión con Google.' : 'Google sign-in failed.')}
                        useOneTap={false}
                        theme={esDark ? 'filled_black' : 'outline'}
                        size="large"
                        text="continue_with"
                        shape="pill"
                        width="340"
                      />
                    </div>
                    <div className="relative flex items-center mb-3">
                      <div className={`flex-grow border-t ${esDark ? 'border-white/10' : 'border-slate-200'}`} />
                      <span className={`mx-3 text-[10.5px] font-bold uppercase tracking-wider ${sub}`}>
                        {es ? 'o con tu correo electrónico' : 'or with your email'}
                      </span>
                      <div className={`flex-grow border-t ${esDark ? 'border-white/10' : 'border-slate-200'}`} />
                    </div>
                  </>
                )}

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <label className="block">
                    <span className="text-[13px] font-bold ml-1">{es ? 'Correo electrónico' : 'Email'}</span>
                    <div className="relative mt-1.5">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">mail</span>
                      <input
                        ref={primerCampoRef}
                        type="email"
                        required
                        autoComplete="email"
                        value={correo}
                        onChange={(e) => { setCorreo(e.target.value); setError(''); }}
                        placeholder="usuario@ejemplo.com"
                        className={`w-full h-12 pl-12 pr-4 rounded-2xl border text-[14.5px] focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 transition-colors ${inputBase}`}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <div className="flex justify-between items-center ml-1">
                      <span className="text-[13px] font-bold">{es ? 'Contraseña' : 'Password'}</span>
                      <Link to={ROUTES.RECUPERAR_PASSWORD} onClick={onCerrar} className={`text-xs ${enlace}`}>
                        {es ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
                      </Link>
                    </div>
                    <div className="relative mt-1.5">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">lock</span>
                      <input
                        type={verPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        className={`w-full h-12 pl-12 pr-12 rounded-2xl border text-[14.5px] focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 transition-colors ${inputBase}`}
                      />
                      <button
                        type="button"
                        onClick={() => setVerPassword((v) => !v)}
                        aria-label={verPassword ? (es ? 'Ocultar contraseña' : 'Hide password') : (es ? 'Mostrar contraseña' : 'Show password')}
                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl"
                      >
                        {verPassword ? 'visibility_off' : 'visibility'}
                      </button>
                    </div>
                  </label>

                  <button type="submit" disabled={loading} className={`${botonPrimario} mt-1`}>
                    {loading ? (es ? 'Iniciando sesión...' : 'Signing in...') : (textoBoton ?? (es ? 'Iniciar sesión' : 'Sign in'))}
                    {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                  </button>
                </form>

                <p className={`text-center text-xs mt-4 ${sub}`}>
                  {es ? '¿No tienes cuenta?' : "Don't have an account?"}{' '}
                  <button type="button" onClick={() => cambiarVista('registro')} className={enlace}>
                    {es ? 'Regístrate' : 'Sign up'}
                  </button>
                </p>
              </>
            )}

            {/* ─────────── Crear cuenta ─────────── */}
            {vista === 'registro' && (
              <>
                <form onSubmit={handleRegistro} className="space-y-3" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campo('nombre', es ? 'Nombre' : 'First name', 'person', { placeholder: 'Juan', autoComplete: 'given-name' }, primerCampoRef)}
                    {campo('apellido', es ? 'Apellido' : 'Last name', 'person', { placeholder: 'Pérez', autoComplete: 'family-name' })}
                  </div>
                  {campo('correo', es ? 'Correo electrónico' : 'Email', 'mail', { type: 'email', placeholder: 'usuario@ejemplo.com', autoComplete: 'email' })}
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <label className="block">
                      <span className="text-xs font-bold ml-1">{es ? 'Tipo doc.' : 'ID type'}</span>
                      <select
                        name="tipoDocumento"
                        value={reg.tipoDocumento}
                        onChange={cambiarReg}
                        className={`w-full h-11 mt-1 px-3 rounded-xl border text-[13.5px] font-bold focus:outline-none focus:ring-2 focus:ring-[#0e3a8c]/25 cursor-pointer ${inputBase}`}
                      >
                        {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    {campo('documento', es ? 'Número de documento' : 'ID number', 'badge', { inputMode: 'numeric', placeholder: '1234567890' })}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campo('telefono', es ? 'Teléfono' : 'Phone', 'call', { type: 'tel', inputMode: 'numeric', placeholder: '3001234567', autoComplete: 'tel' })}
                    {campo('direccion', es ? 'Dirección' : 'Address', 'home', { placeholder: 'Calle 123 #45-67', autoComplete: 'street-address' })}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campo('password', es ? 'Contraseña' : 'Password', 'lock', { type: verPasswordReg ? 'text' : 'password', placeholder: '••••••••', autoComplete: 'new-password' })}
                    {campo('confirmarPassword', es ? 'Confirmar' : 'Confirm', 'lock_reset', { type: verPasswordReg ? 'text' : 'password', placeholder: '••••••••', autoComplete: 'new-password' })}
                  </div>
                  <label className={`flex items-center gap-2 ml-1 text-xs cursor-pointer select-none ${sub}`}>
                    <input type="checkbox" checked={verPasswordReg} onChange={(e) => setVerPasswordReg(e.target.checked)} className="w-4 h-4 rounded" />
                    {es ? 'Mostrar contraseñas' : 'Show passwords'}
                    <span className="ml-auto text-[11px]">{es ? '6-12 caracteres, 1 mayúscula y 1 número' : '6-12 chars, 1 uppercase, 1 number'}</span>
                  </label>

                  <button type="submit" disabled={loading} className={`${botonPrimario} mt-1`}>
                    {loading ? (es ? 'Creando cuenta...' : 'Creating account...') : (es ? 'Crear cuenta' : 'Create account')}
                    {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                  </button>
                </form>

                <p className={`text-center text-xs mt-4 ${sub}`}>
                  {es ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
                  <button type="button" onClick={() => cambiarVista('login')} className={enlace}>
                    {es ? 'Inicia sesión' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
