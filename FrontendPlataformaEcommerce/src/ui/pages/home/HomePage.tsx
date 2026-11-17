import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Navbar } from '../../components/layout/Navbar';
import { ROUTES } from '../../../shared/constants';
import { SeccionMillasHome } from '../../components/millas/SeccionMillasHome';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { TarjetaViaje } from '../../components/common/TarjetaViaje';
import { GridTarjetasViajeSkeleton } from '../../components/common/TarjetaViajeSkeleton';
import { ComboboxCiudades, type OpcionCombobox } from '../../components/common/ComboboxCiudades';
import { BusCootranarAnimacion } from '../../components/common/BusCootranarAnimacion';
import { plataformaEcommerceApi, type CiudadOrigen, type OpcionDestino, type ViajesQuery } from '../../../infrastructure/api/plataformaEcommerceApi';
import { useViajesHome } from '../../hooks/useViajesHome';
import { usePreferencias } from '../../context/PreferenciasContext';
import { useContenidoWeb } from '../../context/ContenidoWebContext';
import { useTourBusqueda } from '../../hooks/useTourBusqueda';
import busCootranar from '../../../assets/busCootranar.png';
import heroConfortBus from '../../../assets/heroConfortBus.jpg';
import heroEncomiendas from '../../../assets/heroEncomiendas.jpg';

interface SlideHero {
  imagen: string;
  objectPosition: string;
  linea1Es: string;
  linea1En: string;
  linea2Es: string;
  linea2En: string;
  pastillaEs: string;
  pastillaEn: string;
  descripcionEs: string;
  descripcionEn: string;
}

const SLIDES_HERO: SlideHero[] = [
  {
    imagen: heroConfortBus,
    objectPosition: 'object-[65%_45%]',
    linea1Es: 'Tu viaje empieza',
    linea1En: 'Your trip begins',
    linea2Es: 'con la comodidad',
    linea2En: 'with the comfort',
    pastillaEs: 'de elegirnos.',
    pastillaEn: 'of choosing us.',
    descripcionEs:
      'Disfruta el camino con la comodidad de nuestros buses y los servicios a bordo pensados para acompañarte durante el recorrido.',
    descripcionEn:
      'Enjoy the road with the comfort of our buses and onboard services designed to accompany you throughout your journey.',
  },
  {
    imagen: busCootranar,
    objectPosition: 'object-[62%_40%]',
    linea1Es: 'Tu seguridad es',
    linea1En: 'Your safety is',
    linea2Es: 'nuestra prioridad',
    linea2En: 'our top priority',
    pastillaEs: 'en cada kilómetro.',
    pastillaEn: 'every single mile.',
    descripcionEs:
      'Viaja tranquilo por Nariño y Colombia con rastreo satelital GPS 24/7, revisión técnico-mecánica permanente y conductores certificados.',
    descripcionEn:
      'Travel with peace of mind across Nariño and Colombia with 24/7 GPS tracking, permanent inspections, and certified drivers.',
  },
  {
    imagen: heroEncomiendas,
    objectPosition: 'object-[65%_40%]',
    linea1Es: 'Tus encomiendas',
    linea1En: 'Your parcels',
    linea2Es: 'llegan seguras',
    linea2En: 'arrive safely',
    pastillaEs: 'a todo destino.',
    pastillaEn: 'to every destination.',
    descripcionEs:
      'Transportamos tus paquetes y carga con vehículos propios, guía digital en línea y agencias en Pasto, Cali, Popayán, Ipiales y Tumaco.',
    descripcionEn:
      'We transport your packages and cargo with our own fleet, digital tracking waybills, and offices in Pasto, Cali, Popayán, Ipiales, and Tumaco.',
  },
];



function ciudadOrigenToOpcion(c: CiudadOrigen): OpcionCombobox {
  return { id: c.idciudad, nombre: c.nombre, tipo: 'ciudad' };
}

function opcionDestinoToCombobox(o: OpcionDestino): OpcionCombobox {
  return { id: o.id, nombre: o.nombre, tipo: o.tipo };
}

function hoyISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


export function HomePage() {
  const { tx, idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const h = tx.home;
  const { iniciarTour } = useTourBusqueda();

  const slidesActivos: SlideHero[] = (() => {
    const desdeCms = (contenido.home?.slides || [])
      .filter((s) => s.activo !== false)
      .map((s) => ({
        imagen:
          s.claveImagen === 'custom' && s.urlImagen
            ? s.urlImagen
            : s.claveImagen === 'confort'
            ? heroConfortBus
            : s.claveImagen === 'encomiendas'
            ? heroEncomiendas
            : busCootranar,
        objectPosition:
          s.claveImagen === 'confort'
            ? 'object-[65%_45%]'
            : s.claveImagen === 'encomiendas'
            ? 'object-[65%_40%]'
            : 'object-[62%_40%]',
        linea1Es: s.linea1Es,
        linea1En: s.linea1En,
        linea2Es: s.linea2Es,
        linea2En: s.linea2En,
        pastillaEs: s.pastillaEs,
        pastillaEn: s.pastillaEn,
        descripcionEs: s.descripcionEs,
        descripcionEn: s.descripcionEn,
      }));
    return desdeCms.length > 0 ? desdeCms : SLIDES_HERO;
  })();

  const [origenSeleccionado, setOrigenSeleccionado] = useState<OpcionCombobox | null>(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<OpcionCombobox | null>(null);
  const [origenTexto, setOrigenTexto] = useState('');
  const [destinoTexto, setDestinoTexto] = useState('');
  const [fecha, setFecha] = useState('');
  const [fechaError, setFechaError] = useState('');

  const [filtrosActivos, setFiltrosActivos] = useState<ViajesQuery>({});


  const { viajesHoy, viajesProgramados, loading, error, refetch } = useViajesHome(filtrosActivos);

  const [ciudadesOrigen, setCiudadesOrigen] = useState<OpcionCombobox[]>([]);
  const [opcionesDestino, setOpcionesDestino] = useState<OpcionCombobox[]>([]);
  const [loadingOrigen, setLoadingOrigen] = useState(false);
  const [loadingDestino, setLoadingDestino] = useState(false);


  const VIAJES_INICIALES = 3;
  const navigate = useNavigate();
  const buscadorHeroRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [buscadorFijo, setBuscadorFijo] = useState(false);

  // Al terminar la intro de marca, la portada entra en cascada (texto, sellos, buscador).
  useEffect(() => {
    if (document.documentElement.dataset.splash !== 'activo') return;
    const entrar = () => {
      gsap.fromTo('[data-hero-anim]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.15, clearProps: 'transform' });
    };
    window.addEventListener('cootranar:splash-fin', entrar, { once: true });
    return () => window.removeEventListener('cootranar:splash-fin', entrar);
  }, []);
  const [slideActivo, setSlideActivo] = useState(0);
  const indiceSeguro = slideActivo % slidesActivos.length;

  const irSlideAnterior = useCallback(() => {
    setSlideActivo((i) => (i - 1 + slidesActivos.length) % slidesActivos.length);
  }, [slidesActivos.length]);

  const irSlideSiguiente = useCallback(() => {
    setSlideActivo((i) => (i + 1) % slidesActivos.length);
  }, [slidesActivos.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSlideActivo((i) => (i + 1) % slidesActivos.length);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [slideActivo, slidesActivos.length]);

  // El buscador fijo se puede contraer; la preferencia se recuerda en este navegador.
  const [buscadorFijoAbierto, setBuscadorFijoAbierto] = useState(() => {
    try { return localStorage.getItem('cootranar_buscador_fijo') !== 'cerrado'; } catch { return true; }
  });
  const alternarBuscadorFijo = () => {
    setBuscadorFijoAbierto((abierto) => {
      try { localStorage.setItem('cootranar_buscador_fijo', abierto ? 'cerrado' : 'abierto'); } catch { /* sin storage */ }
      return !abierto;
    });
  };

  useEffect(() => {
    const evaluarScroll = () => {
      if (!buscadorHeroRef.current) return;
      const rect = buscadorHeroRef.current.getBoundingClientRect();
      // Se activa cuando la tarjeta original del Hero sale por la parte superior,
      // y se oculta otra vez cuando el footer ya ocupa la pantalla.
      const footer = document.querySelector('[data-footer-cinematico]');
      const enFooter = footer ? footer.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
      setBuscadorFijo(rect.bottom < 20 && !enFooter);
    };
    window.addEventListener('scroll', evaluarScroll, { passive: true });
    evaluarScroll();
    return () => window.removeEventListener('scroll', evaluarScroll);
  }, []);

  useEffect(() => {
    setLoadingOrigen(true);
    plataformaEcommerceApi
      .getCiudadesOrigen()
      .then((data) => setCiudadesOrigen(data.map(ciudadOrigenToOpcion)))
      .catch(() => {/* silently fall back to empty list */})
      .finally(() => setLoadingOrigen(false));
  }, []);


  useEffect(() => {
    setLoadingDestino(true);
    const origenId = origenSeleccionado?.id;
    plataformaEcommerceApi
      .getCiudadesDestino(origenId)
      .then((data) => setOpcionesDestino(data.map(opcionDestinoToCombobox)))
      .catch(() => setOpcionesDestino([]))
      .finally(() => setLoadingDestino(false));
  }, [origenSeleccionado]);


  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFecha(val);
    if (val && val < hoyISO()) {
      setFechaError(idioma === 'es' ? 'La fecha no puede ser anterior a hoy' : 'The date cannot be before today');
    } else {
      setFechaError('');
    }
  };

  const handleOrigenSelect = useCallback((opcion: OpcionCombobox | null) => {
    setOrigenSeleccionado(opcion);
    setDestinoSeleccionado(null);
    setDestinoTexto('');
  }, []);

  const handleDestinoSelect = useCallback((opcion: OpcionCombobox | null) => {
    setDestinoSeleccionado(opcion);
  }, []);

  const limpiarFiltros = () => {
    setOrigenSeleccionado(null);
    setDestinoSeleccionado(null);
    setOrigenTexto('');
    setDestinoTexto('');
    setFecha('');
    setFechaError('');
  };

  const [animandoBusqueda, setAnimandoBusqueda] = useState(false);

  const finalizarAnimacionBusqueda = useCallback(() => {
    setAnimandoBusqueda(false);
    const el = document.getElementById('lista-viajes');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (fecha && fecha < hoyISO()) {
      setFechaError(idioma === 'es' ? 'La fecha no puede ser anterior a hoy' : 'The date cannot be before today');
      return;
    }
    setFiltrosActivos({
      origen: origenSeleccionado?.nombre,
      destino: destinoSeleccionado?.nombre,
      destinoTipo: destinoSeleccionado?.tipo,
      fecha: fecha || undefined,
    });
    setAnimandoBusqueda(true);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 transition-colors duration-200">
      <BusCootranarAnimacion
        visible={animandoBusqueda}
        origen={origenSeleccionado?.nombre}
        destino={destinoSeleccionado?.nombre}
        idioma={idioma}
        onFinish={finalizarAnimacionBusqueda}
      />
      <Navbar />

      {/* Buscador flotante fijo al hacer scroll hacia abajo */}
      <div
        aria-hidden={!buscadorFijo}
        className={`fixed top-0 left-0 right-0 z-[70] pointer-events-none transition-all duration-300 ease-out ${
          buscadorFijo
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="max-w-[1140px] mx-auto px-3 sm:px-6">
          <div
            className={`relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-b-2xl shadow-[0_14px_34px_rgba(15,23,42,0.16)] border-x border-b border-slate-200/90 dark:border-slate-700 px-4 sm:px-6 transition-all ${
              buscadorFijoAbierto ? 'py-3.5' : 'py-2.5'
            } ${buscadorFijo ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <div className={`flex items-center justify-between gap-3 ${buscadorFijoAbierto ? 'mb-2.5' : ''}`}>
              <button
                type="button"
                onClick={alternarBuscadorFijo}
                aria-expanded={buscadorFijoAbierto}
                aria-controls="buscador-fijo-form"
                className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-[#0e3a8c] dark:text-blue-400">search</span>
                <span className="text-sm sm:text-[15px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight shrink-0">
                  {idioma === 'es' ? 'Buscar tu próximo destino' : 'Find your next destination'}
                </span>
                {/* Contraído: resumen de lo elegido para no perder el contexto */}
                {!buscadorFijoAbierto && (origenTexto || destinoTexto || fecha) && (
                  <span className="hidden sm:inline text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                    · {[origenTexto && destinoTexto ? `${origenTexto} → ${destinoTexto}` : origenTexto || destinoTexto, fecha].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
              {buscadorFijoAbierto && (origenTexto || destinoTexto || fecha || Object.keys(filtrosActivos).length > 0) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0e3a8c] dark:hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  {h.limpiar}
                </button>
              )}
            </div>

            {buscadorFijoAbierto && (
            <form id="buscador-fijo-form" onSubmit={handleBuscar} className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              {/* Origen compacto */}
              <div className="flex-1 min-w-0">
                <ComboboxCiudades
                  compact
                  opciones={ciudadesOrigen}
                  value={origenTexto}
                  onInputChange={setOrigenTexto}
                  onSelect={handleOrigenSelect}
                  placeholder={h.seleccionarOrigen}
                  loading={loadingOrigen}
                  label={h.origen}
                />
              </div>

              {/* Destino compacto */}
              <div className="flex-1 min-w-0">
                <ComboboxCiudades
                  compact
                  opciones={opcionesDestino}
                  value={destinoTexto}
                  onInputChange={setDestinoTexto}
                  onSelect={handleDestinoSelect}
                  placeholder={h.seleccionarDestino}
                  loading={loadingDestino}
                  disabled={opcionesDestino.length === 0 && !loadingDestino && !origenSeleccionado}
                  label={h.destino}
                />
              </div>

              {/* Fecha compacta */}
              <label className="flex-1 min-w-0 h-[50px] rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-1.5 flex flex-col justify-center focus-within:border-[#0e3a8c] dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-[#0e3a8c]/15 transition-all cursor-pointer">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                  {h.fechaSalida}
                </span>
                <input
                  type="date"
                  value={fecha}
                  min={hoyISO()}
                  onChange={handleFechaChange}
                  className="w-full bg-transparent text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-100 border-none p-0 outline-none focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Botón circular de búsqueda */}
              <button
                type="submit"
                title={h.buscarViajesBtn}
                aria-label={h.buscarViajesBtn}
                className="h-11 md:w-11 rounded-full bg-[#0e3a8c] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-900/25 transition-all shrink-0 cursor-pointer px-4 md:px-0"
              >
                <span className="material-symbols-outlined text-xl">search</span>
                <span className="md:hidden text-xs">{h.buscarViajesBtn}</span>
              </button>
            </form>
            )}

            {/* Pestaña para contraer / desplegar */}
            <button
              type="button"
              onClick={alternarBuscadorFijo}
              aria-expanded={buscadorFijoAbierto}
              aria-controls="buscador-fijo-form"
              title={buscadorFijoAbierto
                ? (idioma === 'es' ? 'Contraer buscador' : 'Collapse search')
                : (idioma === 'es' ? 'Desplegar buscador' : 'Expand search')}
              aria-label={buscadorFijoAbierto
                ? (idioma === 'es' ? 'Contraer buscador' : 'Collapse search')
                : (idioma === 'es' ? 'Desplegar buscador' : 'Expand search')}
              className="absolute left-1/2 -translate-x-1/2 -bottom-[22px] h-[22px] w-14 flex items-center justify-center rounded-b-xl bg-white/95 dark:bg-slate-800/95 border-x border-b border-slate-200/90 dark:border-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.12)] text-slate-500 dark:text-slate-300 hover:text-[#0e3a8c] dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl leading-none">
                {buscadorFijoAbierto ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero con galería interactiva */}
      <section
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
          const deltaX = endX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(deltaX) > 45) {
            if (deltaX < 0) irSlideSiguiente();
            else irSlideAnterior();
          }
        }}
        className="relative z-20 min-h-[calc(100dvh-4rem)] flex flex-col justify-between overflow-visible select-none"
      >
        {/* Slides de fondo */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#06183d]">
          {slidesActivos.map((slide, idx) => {
            const activo = idx === indiceSeguro;
            return (
              <img
                key={idx}
                src={slide.imagen}
                alt=""
                fetchPriority={idx === 0 ? 'high' : 'low'}
                loading={idx === 0 ? undefined : 'lazy'}
                className={`absolute inset-0 h-full w-full object-cover ${slide.objectPosition} transition-all duration-700 ease-out ${
                  activo ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                }`}
              />
            );
          })}
          {/* Sombreado lateral e inferior para máxima legibilidad del texto y buscador */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#041029]/85 via-[#041029]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041029]/80 via-transparent to-[#041029]/25" />
        </div>

        {/* Botón anterior (<) — visible solo en escritorio a los costados */}
        <button
          type="button"
          onClick={irSlideAnterior}
          aria-label={idioma === 'es' ? 'Imagen anterior' : 'Previous slide'}
          className="hidden md:flex absolute left-4 lg:left-6 top-[40%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/45 hover:bg-slate-900/75 text-white border border-white/25 backdrop-blur-md items-center justify-center shadow-lg transition-all hover:scale-105 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl leading-none">chevron_left</span>
        </button>

        {/* Botón siguiente (>) — visible solo en escritorio a los costados */}
        <button
          type="button"
          onClick={irSlideSiguiente}
          aria-label={idioma === 'es' ? 'Siguiente imagen' : 'Next slide'}
          className="hidden md:flex absolute right-4 lg:right-6 top-[40%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/45 hover:bg-slate-900/75 text-white border border-white/25 backdrop-blur-md items-center justify-center shadow-lg transition-all hover:scale-105 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl leading-none">chevron_right</span>
        </button>

        {/* Contenido principal del Hero */}
        <div className="max-w-[1220px] mx-auto px-4 sm:px-12 w-full relative z-10 flex-1 flex flex-col justify-between pt-6 sm:pt-12 pb-6 md:pb-8">
          {/* Botón de tour — oculto en hero para acceso programático */}
          <button
            id="btn-tour-hero"
            type="button"
            onClick={iniciarTour}
            className="hidden"
            aria-label="Iniciar tour"
          />

          {/* Fila central: Titular estilo galería a la izquierda + Sellos de calidad a la derecha */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 my-auto pt-2 sm:pt-4 pb-5 sm:pb-6">
            <div data-hero-anim className="max-w-xl text-center sm:text-left">
              <h2
                key={`titulo-${indiceSeguro}`}
                className="font-black italic tracking-tight leading-[1.08] text-[34px] sm:text-5xl md:text-[56px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
              >
                <span className="block text-white">
                  {idioma === 'es' ? slidesActivos[indiceSeguro].linea1Es : slidesActivos[indiceSeguro].linea1En}
                </span>
                <span className="block text-[#93c5fd] mt-0.5">
                  {idioma === 'es' ? slidesActivos[indiceSeguro].linea2Es : slidesActivos[indiceSeguro].linea2En}
                </span>
                <span className="inline-block bg-gradient-to-r from-[#0e3a8c] to-[#1d4ed8] text-white border border-white/25 px-5 sm:px-6 py-1 sm:py-1.5 rounded-full mt-2 shadow-[0_10px_25px_rgba(14,58,140,0.5)]">
                  {idioma === 'es' ? slidesActivos[indiceSeguro].pastillaEs : slidesActivos[indiceSeguro].pastillaEn}
                </span>
              </h2>

              <p
                key={`desc-${indiceSeguro}`}
                className="mt-4 sm:mt-5 text-[15px] sm:text-lg md:text-[19px] font-medium text-white/95 leading-relaxed max-w-lg mx-auto sm:mx-0 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
              >
                {idioma === 'es' ? slidesActivos[indiceSeguro].descripcionEs : slidesActivos[indiceSeguro].descripcionEn}
              </p>

              {/* Controles e indicadores de diapositiva (en móvil incluye flechas < y > integradas) */}
              <div className="mt-4 sm:mt-5 flex items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={irSlideAnterior}
                  aria-label={idioma === 'es' ? 'Imagen anterior' : 'Previous slide'}
                  className="md:hidden w-8 h-8 rounded-full bg-slate-900/55 active:bg-slate-900/80 text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
                </button>

                <div className="flex items-center gap-2">
                  {slidesActivos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSlideActivo(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === indiceSeguro
                          ? 'w-8 bg-white shadow-sm'
                          : 'w-2.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={irSlideSiguiente}
                  aria-label={idioma === 'es' ? 'Siguiente imagen' : 'Next slide'}
                  className="md:hidden w-8 h-8 rounded-full bg-slate-900/55 active:bg-slate-900/80 text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
                </button>
              </div>
            </div>

          </div>

          {/* Buscador acoplado en la parte inferior del Hero */}
          <div
            ref={buscadorHeroRef}
            data-hero-anim
            id="buscador-viaje"
            className="relative z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] p-5 md:p-6 lg:px-7 lg:py-6 border border-white/40 dark:border-slate-700 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {idioma === 'es' ? 'Buscar tu próximo destino' : 'Find your next destination'}
                </span>
                <span className="inline-flex items-center gap-1.5 ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1d4ed8] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                  </span>
                  {idioma === 'es' ? 'Tiquetes en línea' : 'Online tickets'}
                </span>
              </div>
            </div>
            <form onSubmit={handleBuscar}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 items-end">
                {/* Origen combobox */}
                <div id="campo-origen">
                  <ComboboxCiudades
                    opciones={ciudadesOrigen}
                    value={origenTexto}
                    onInputChange={setOrigenTexto}
                    onSelect={handleOrigenSelect}
                    placeholder={h.seleccionarOrigen}
                    loading={loadingOrigen}
                    icon="location_on"
                    label={h.origen}
                    desplegarArriba
                  />
                </div>

                {/* Destino combobox */}
                <div id="campo-destino">
                  <ComboboxCiudades
                    opciones={opcionesDestino}
                    value={destinoTexto}
                    onInputChange={setDestinoTexto}
                    onSelect={handleDestinoSelect}
                    placeholder={h.seleccionarDestino}
                    loading={loadingDestino}
                    disabled={opcionesDestino.length === 0 && !loadingDestino && !origenSeleccionado}
                    icon="near_me"
                    label={h.destino}
                    desplegarArriba
                  />
                </div>

                {/* Fecha */}
                <label id="campo-fecha" className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[#111318] dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-400 text-lg">calendar_month</span> {h.fecha}
                  </span>
                  <input
                    type="date"
                    value={fecha}
                    min={hoyISO()}
                    onChange={handleFechaChange}
                    className={`w-full bg-[#f6f6f8] dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-none rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#0e3a8c] dark:focus:ring-blue-400 outline-none transition-all text-sm ${
                      fechaError ? 'ring-2 ring-red-400' : ''
                    }`}
                  />
                  {fechaError && <p className="text-xs text-red-500 -mt-1">{fechaError}</p>}
                </label>

                <button
                  id="boton-limpiar"
                  type="button"
                  onClick={limpiarFiltros}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[#0e3a8c] dark:text-blue-400 h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all text-sm w-full"
                >
                  <span className="material-symbols-outlined text-base">filter_alt_off</span>
                  {h.limpiar}
                </button>

                <button
                  id="boton-buscar"
                  type="submit"
                  className="bg-[#0e3a8c] dark:bg-blue-600 dark:hover:bg-blue-700 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/30 text-sm w-full lg:col-span-1 sm:col-span-2"
                >
                  <span className="material-symbols-outlined text-base">search</span>
                  {h.buscarViajesBtn}
                </button>
              </div>

            </form>
          </div>
        </div>
      </section>

      {/* Tarjetas */}
      <div id="lista-viajes" className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-10 md:mt-14 space-y-12 md:space-y-16 pb-28 md:pb-16">

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/30 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-3xl">error_outline</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-center font-medium max-w-md">{error}</p>
            <button
              onClick={refetch}
              className="px-5 py-2.5 bg-[#0e3a8c] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-md shadow-blue-900/20"
            >
              {idioma === 'es' ? 'Reintentar' : 'Retry'}
            </button>
          </div>
        )}

        {/* Empty state (no loading, no error, no results) */}
        {!loading && !error && viajesHoy.length === 0 && viajesProgramados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
              <span className="material-symbols-outlined text-3xl">directions_bus</span>
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">{h.noViajes}</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              {idioma === 'es'
                ? 'Intenta seleccionar otra fecha u otro destino para ver viajes disponibles.'
                : 'Try selecting another date or destination to see available trips.'}
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-12 md:space-y-16" role="status" aria-label={idioma === 'es' ? 'Cargando viajes' : 'Loading trips'}>
            {/* Skeleton: Viajes de Hoy */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-lg">today</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {h.viajesHoy}
                  </h3>
                  <span className="h-5 w-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse inline-block" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200/50 to-transparent dark:from-slate-700 dark:via-slate-700/50" />
              </div>
              <GridTarjetasViajeSkeleton cantidad={3} />
              <div className="flex justify-end mt-5">
                <div className="h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>

            {/* Skeleton: Viajes Programados */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {h.viajesProgramados}
                  </h3>
                  <span className="h-5 w-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse inline-block" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200/50 to-transparent dark:from-slate-700 dark:via-slate-700/50" />
              </div>
              <GridTarjetasViajeSkeleton cantidad={3} />
              <div className="flex justify-end mt-5">
                <div className="h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Real data */}
        {!loading && !error && (
          <>
            {(viajesHoy.length > 0 || viajesProgramados.length > 0) && (
              <>
                {/* Viajes de Hoy */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-lg">today</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {h.viajesHoy}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-[#0e3a8c] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                        {viajesHoy.length}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200/50 to-transparent dark:from-slate-700 dark:via-slate-700/50" />
                  </div>
                  {viajesHoy.length === 0 ? (
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
                      <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">{h.noViajesHoy}</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {viajesHoy.slice(0, VIAJES_INICIALES).map((viaje) => (
                          <TarjetaViaje key={viaje.idviaje} viaje={viaje} />
                        ))}
                      </div>
                      <div className="flex justify-end mt-5">
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.VIAJES)}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0e3a8c] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors group cursor-pointer"
                        >
                          <span>
                            {h.descubrirMasViajes}
                          </span>
                          <span
                            className={`material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-1`}
                          >
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Viajes Programados */}
                <div id="seccion-viajes-programados">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-lg">calendar_month</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {h.viajesProgramados}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {viajesProgramados.length}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200/50 to-transparent dark:from-slate-700 dark:via-slate-700/50" />
                  </div>
                  {viajesProgramados.length === 0 ? (
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
                      <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">{h.noViajes}</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {viajesProgramados.slice(0, VIAJES_INICIALES).map((viaje) => (
                          <TarjetaViaje key={viaje.idviaje} viaje={viaje} />
                        ))}
                      </div>
                      <div className="flex justify-end mt-5">
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.VIAJES)}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0e3a8c] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors group cursor-pointer"
                        >
                          <span>
                            {h.descubrirMasViajes}
                          </span>
                          <span
                            className={`material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-1`}
                          >
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Programa de millas: cómo se acumulan y niveles */}
      <SeccionMillasHome />

      <CinematicFooter />

    </div>
  );
}
