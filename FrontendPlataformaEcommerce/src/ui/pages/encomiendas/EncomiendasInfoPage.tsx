import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { ModalLogin, type ModoAuth } from '../../components/auth/ModalLogin';
import { usePreferencias } from '../../context/PreferenciasContext';
import { useContenidoWeb } from '../../context/ContenidoWebContext';
import { ROUTES } from '../../../shared/constants';
import busCootranar from '../../../assets/busCootranar.png';

type Destino = 'cotizar' | 'rastrear';

interface Props {
  /** Se llama tras iniciar sesión queriendo cotizar: la ruta muestra el cotizador. */
  onQuiereCotizar: () => void;
}

/**
 * Página pública de encomiendas: explica el servicio y lleva al usuario a
 * cotizar o rastrear. Las acciones piden iniciar sesión en el modal (sin
 * enviar a /login) y al terminar continúan con lo que el usuario eligió.
 */
export function EncomiendasInfoPage({ onQuiereCotizar }: Props) {
  const { idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const es = idioma === 'es';
  const eTextos = contenido.paginasPublicas.encomiendas;
  const navigate = useNavigate();
  const [login, setLogin] = useState<{ destino: Destino; modo: ModoAuth } | null>(null);
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);

  const pedirSesion = (destino: Destino, modo: ModoAuth = 'login') => setLogin({ destino, modo });

  const alIniciarSesion = () => {
    const destino = login?.destino;
    setLogin(null);
    window.dispatchEvent(new Event('cootranar:sesion-iniciada'));
    if (destino === 'rastrear') navigate(ROUTES.MIS_ENCOMIENDAS);
    else onQuiereCotizar();
  };

  const beneficios = [
    { icono: 'hub', titulo: es ? 'Cobertura regional' : 'Regional coverage', texto: es ? 'Enviamos entre las oficinas de Cootranar en Nariño, Valle del Cauca y el suroccidente.' : 'We ship between Cootranar offices across Nariño, Valle del Cauca and the southwest.' },
    { icono: 'schedule', titulo: es ? 'Despacho diario' : 'Daily dispatch', texto: es ? 'Tu paquete viaja en nuestras rutas con salidas todos los días.' : 'Your parcel travels on our routes with daily departures.' },
    { icono: 'qr_code_2', titulo: es ? 'Código de seguimiento' : 'Tracking code', texto: es ? 'Cada envío tiene un código y un QR para consultar su estado en todo momento.' : 'Each shipment gets a code and QR to check its status anytime.' },
    { icono: 'verified_user', titulo: es ? 'Valor declarado' : 'Declared value', texto: es ? 'Declara el valor de tu envío para viajar con mayor tranquilidad.' : 'Declare your parcel value to ship with more peace of mind.' },
  ];

  const pasos = [
    { icono: 'calculate', titulo: es ? 'Cotiza en línea' : 'Get a quote online', texto: es ? 'Elige la oficina de origen y destino, el peso y las medidas. Ves el precio al instante.' : 'Choose origin and destination offices, weight and size. See the price instantly.' },
    { icono: 'qr_code_scanner', titulo: es ? 'Recibe tu código' : 'Get your code', texto: es ? 'Al confirmar te damos un código de referencia y un QR.' : 'When you confirm, you get a reference code and QR.' },
    { icono: 'storefront', titulo: es ? 'Lleva tu paquete' : 'Drop it off', texto: es ? 'Presenta el código en la oficina; allí se verifica el peso y se despacha.' : 'Show the code at the office; weight is checked and it ships.' },
    { icono: 'local_shipping', titulo: es ? 'Rastrea y recibe' : 'Track and receive', texto: es ? 'Sigue el estado desde "Mis Encomiendas" hasta que llegue a su destino.' : 'Follow its status in "My Parcels" until it arrives.' },
  ];

  const faqs = [
    { p: es ? '¿Necesito una cuenta para enviar?' : 'Do I need an account to ship?', r: es ? 'Sí. Con tu cuenta guardamos tus cotizaciones y puedes rastrear tus envíos desde "Mis Encomiendas". Crearla toma un minuto.' : 'Yes. Your account keeps your quotes and lets you track shipments from "My Parcels". It takes a minute to create.' },
    { p: es ? '¿El precio de la cotización es final?' : 'Is the quoted price final?', r: es ? 'Es referencial: el peso y el volumen se verifican en la oficina al recibir el paquete.' : 'It is an estimate: weight and volume are checked at the office.' },
    { p: es ? '¿Dónde entrego mi paquete?' : 'Where do I drop off my parcel?', r: es ? 'En la oficina de encomiendas de origen que elijas al cotizar.' : 'At the origin parcel office you choose when quoting.' },
    { p: es ? '¿Cómo sé dónde está mi encomienda?' : 'How do I know where my parcel is?', r: es ? 'Con el código de referencia, desde "Mis Encomiendas", ves cada cambio de estado.' : 'With the reference code, in "My Parcels", you see every status change.' },
  ];

  const botonPrimario = 'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[#0e3a8c] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/25 transition-all cursor-pointer';
  const botonSecundario = 'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm backdrop-blur-sm transition-all cursor-pointer';

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 transition-colors duration-200">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={busCootranar} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_40%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06183d]/95 via-[#06183d]/80 to-[#06183d]/40" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-14 sm:py-20 text-white">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-white/15 border border-white/20 rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            {es ? eTextos.etiquetaEs : eTextos.etiquetaEn}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 max-w-2xl leading-[1.1]">
            {es ? eTextos.titulo1Es : eTextos.titulo1En}
            <span className="block text-[#38bdf8]">{es ? eTextos.titulo2Es : eTextos.titulo2En}</span>
          </h1>
          <p className="text-blue-100 mt-4 max-w-xl text-sm sm:text-base leading-relaxed">
            {es ? eTextos.subtituloEs : eTextos.subtituloEn}
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button type="button" onClick={() => pedirSesion('cotizar')} className={botonPrimario}>
              <span className="material-symbols-outlined text-lg">add_box</span>
              {es ? 'Realizar una encomienda' : 'Send a parcel'}
            </button>
            <button type="button" onClick={() => pedirSesion('rastrear')} className={botonSecundario}>
              <span className="material-symbols-outlined text-lg">travel_explore</span>
              {es ? 'Rastrear mis envíos' : 'Track my parcels'}
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 space-y-14">
        {/* Beneficios */}
        <section aria-labelledby="titulo-beneficios">
          <h2 id="titulo-beneficios" className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">
            {es ? '¿Por qué enviar con Cootranar?' : 'Why ship with Cootranar?'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {beneficios.map((b) => (
              <div key={b.titulo} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-2xl text-[#0e3a8c] dark:text-blue-400 bg-[#e8f0fe] dark:bg-white/5 rounded-xl p-2.5">{b.icono}</span>
                <h3 className="font-bold text-slate-900 dark:text-white mt-4">{b.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{b.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section aria-labelledby="titulo-pasos">
          <h2 id="titulo-pasos" className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">
            {es ? '¿Cómo funciona?' : 'How does it work?'}
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pasos.map((p, i) => (
              <li key={p.titulo} className="relative p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="absolute top-4 right-4 text-4xl font-black text-slate-100 dark:text-white/5 select-none">{i + 1}</span>
                <span className="material-symbols-outlined text-2xl text-white bg-[#0e3a8c] dark:bg-blue-600 rounded-xl p-2.5">{p.icono}</span>
                <h3 className="font-bold text-slate-900 dark:text-white mt-4">{p.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Llamado a la acción */}
        <section className="rounded-3xl bg-gradient-to-br from-[#0a2d6e] via-[#0e3a8c] to-[#1d4ed8] text-white p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold">{es ? '¿Listo para enviar tu paquete?' : 'Ready to send your parcel?'}</h2>
            <p className="text-blue-100 text-sm mt-1">
              {es ? 'Inicia sesión o crea tu cuenta gratis y cotiza en menos de un minuto.' : 'Sign in or create your free account and get a quote in under a minute.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => pedirSesion('cotizar')} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#0e3a8c] font-bold text-sm hover:bg-blue-50 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-lg">calculate</span>
              {es ? 'Cotizar mi encomienda' : 'Quote my parcel'}
            </button>
            <button type="button" onClick={() => pedirSesion('cotizar', 'registro')} className={botonSecundario}>
              <span className="material-symbols-outlined text-lg">person_add</span>
              {es ? 'Crear cuenta gratis' : 'Create free account'}
            </button>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section aria-labelledby="titulo-faq" className="max-w-3xl">
          <h2 id="titulo-faq" className="text-2xl font-extrabold text-slate-900 dark:text-white mb-5">
            {es ? 'Preguntas frecuentes' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const abierta = faqAbierta === i;
              return (
                <div key={f.p} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqAbierta(abierta ? null : i)}
                    aria-expanded={abierta}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {f.p}
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {abierta && <p className="px-5 pb-4 -mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.r}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <CinematicFooter />

      <ModalLogin
        abierto={login !== null}
        modoInicial={login?.modo ?? 'login'}
        onCerrar={() => setLogin(null)}
        onExito={alIniciarSesion}
        titulo={login?.destino === 'rastrear'
          ? (es ? 'Inicia sesión para rastrear' : 'Sign in to track')
          : (es ? 'Inicia sesión para enviar' : 'Sign in to ship')}
        subtitulo={login?.destino === 'rastrear'
          ? (es ? 'Consulta el estado de tus encomiendas.' : 'Check the status of your parcels.')
          : (es ? 'Cotiza y genera tu encomienda en minutos.' : 'Quote and create your parcel in minutes.')}
      />
    </div>
  );
}
