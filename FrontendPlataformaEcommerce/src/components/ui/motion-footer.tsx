import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';
import { usePreferencias } from '@/ui/context/PreferenciasContext';
import { useContenidoWeb } from '@/ui/context/ContenidoWebContext';
import { REDES_SOCIALES } from '@/ui/components/auth/redesSociales';
import { ROUTES } from '@/shared/constants';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// -------------------------------------------------------------------------
// 1. ESTILOS
// El componente original usa los tokens de tema de shadcn (--foreground,
// --primary...). Este proyecto no tiene ese tema, así que se definen aquí,
// acotados al footer, con la paleta de Cootranar (siempre en tono oscuro).
// -------------------------------------------------------------------------
const STYLES = `
.cinematic-footer-wrapper {
  -webkit-font-smoothing: antialiased;

  --background: #06183d;
  --foreground: #f8fafc;
  --muted: #94a3b8;
  --primary: #38bdf8;
  --secondary: #1d4ed8;
  --destructive: #ef4444;
  --marca-rojo: #c62828;

  --pill-bg-1: color-mix(in oklch, var(--foreground) 6%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-shadow: color-mix(in oklch, #000 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 14%, transparent);
  --pill-inset-shadow: color-mix(in oklch, #000 60%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 12%, transparent);

  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 12%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 4%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--primary) 45%, transparent);
  --pill-shadow-hover: color-mix(in oklch, #000 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 24%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}
@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}
.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }

/* Movimiento reducido: sin animaciones continuas */
@media (prefers-reduced-motion: reduce) {
  .animate-footer-breathe, .animate-footer-scroll-marquee, .animate-footer-heartbeat { animation: none; }
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--primary) 22%, transparent) 0%,
    color-mix(in oklch, var(--secondary) 22%, transparent) 40%,
    transparent 70%
  );
}
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 0 20px 40px -10px var(--pill-shadow-hover), inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}
.footer-giant-bg-text {
  font-size: clamp(2.25rem, 11vw, 13rem);
  line-height: 0.95;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: transparent;
  -webkit-text-stroke: 1.5px color-mix(in oklch, var(--foreground) 12%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 16%, transparent) 0%, color-mix(in oklch, var(--foreground) 4%, transparent) 85%, transparent 100%);
  -webkit-background-clip: text;
  background-clip: text;
}
.footer-text-glow {
  line-height: 1.2;
  padding-bottom: 0.18em;
  padding-top: 0.05em;
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 45%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--primary) 25%, transparent));
}
`;

// -------------------------------------------------------------------------
// 2. BOTÓN MAGNÉTICO (sigue al cursor con GSAP)
// -------------------------------------------------------------------------
export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
    /** Para usarlo con <Link> de react-router (as={Link}). */
    to?: string;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = 'button', ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      const element = localRef.current;
      if (!element) return;
      // Sin efecto magnético en pantallas táctiles ni con movimiento reducido.
      if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(element, {
          x: x * 0.4, y: y * 0.4, rotationX: -y * 0.15, rotationY: x * 0.15, scale: 1.05,
          ease: 'power2.out', duration: 0.4,
        });
      };
      const handleMouseLeave = () => {
        gsap.to(element, { x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1, ease: 'elastic.out(1, 0.3)', duration: 1.2 });
      };

      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
        gsap.killTweensOf(element);
      };
    }, []);

    return (
      <Component
        ref={(node: HTMLElement | null) => {
          localRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn('cursor-pointer', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = 'MagneticButton';

// -------------------------------------------------------------------------
// 3. FOOTER
// -------------------------------------------------------------------------
export function CinematicFooter() {
  const { idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const es = idioma === 'es';
  const fTextos = contenido.paginasPublicas.footer;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const frases = es
    ? (fTextos?.frasesMarquesinaEs?.length ? fTextos.frasesMarquesinaEs : ['Viaja seguro', 'Rastreo GPS 24/7', 'Encomiendas a toda la región', 'Acumula millas', 'Compra en línea'])
    : (fTextos?.frasesMarquesinaEn?.length ? fTextos.frasesMarquesinaEn : ['Travel safe', '24/7 GPS tracking', 'Parcels across the region', 'Earn miles', 'Buy online']);

  const redesDinamicas = REDES_SOCIALES.map((r) => ({
    ...r,
    href:
      r.id === 'instagram'
        ? fTextos?.instagramUrl || r.href
        : r.id === 'facebook'
        ? fTextos?.facebookUrl || r.href
        : r.id === 'tiktok'
        ? fTextos?.tiktokUrl || r.href
        : r.id === 'whatsapp'
        ? fTextos?.whatsappUrl || r.href
        : r.href,
  }));

  useEffect(() => {
    if (!wrapperRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '4vh', scale: 0.94, opacity: 0.5 },
        {
          y: '0vh',
          scale: 1,
          opacity: 1,
           duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 90%',
            end: 'top 30%',
            scrub: 0.6,
          },
        }
      );
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 28, opacity: 0.85 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 85%',
            end: 'top 25%',
            scrub: 0.5,
          },
        }
      );
    }, wrapperRef);

    // Recalcular posiciones de ScrollTrigger cada vez que cambie el alto del documento
    // (por ejemplo, al pasar de skeletons a datos reales o al filtrar viajes).
    const ro = new ResizeObserver(() => {
      ScrollTrigger.refresh();
    });
    ro.observe(document.body);

    return () => {
      ro.disconnect();
      ctx.revert();
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const Marquesina = () => (
    <div className="flex items-center space-x-12 px-6">
      {frases.map((f, i) => (
        <React.Fragment key={f}>
          <span>{f}</span>
          <span className={i % 2 === 0 ? 'text-sky-400/70' : 'text-[var(--marca-rojo)]'}>✦</span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/*
        "Cortina": el contenedor está en el flujo normal y recorta (clip-path) al
        footer fijo que tiene debajo; al hacer scroll, el footer se "revela".
      */}
      <div
        ref={wrapperRef}
        data-footer-cinematico
        className="relative h-screen w-full"
        style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
      >
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
          {/* Luz ambiental + cuadrícula */}
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* 1. Marquesina diagonal */}
          <div className="absolute top-12 left-0 w-full overflow-hidden border-y border-white/10 bg-[#06183d]/60 backdrop-blur-md py-4 z-10 -rotate-2 scale-110 shadow-2xl" aria-hidden="true">
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] text-[var(--muted)] uppercase">
              <Marquesina />
              <Marquesina />
            </div>
          </div>

          {/* 2. Contenido central */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
            <h2 ref={headingRef} className="text-5xl md:text-8xl leading-[1.2] pb-3 md:pb-4 px-2 font-black footer-text-glow tracking-tighter mb-6 md:mb-8 text-center">
              {es ? (fTextos?.tituloEs || '¿Listo para viajar?') : (fTextos?.tituloEn || 'Ready to travel?')}
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-5 w-full">
              {/* Acciones principales */}
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <MagneticButton as={Link} to={ROUTES.VIAJES} className="footer-glass-pill px-8 md:px-10 py-4 md:py-5 rounded-full text-[var(--foreground)] font-bold text-sm md:text-base flex items-center gap-3 group">
                  <span className="material-symbols-outlined text-2xl text-[var(--primary)]">directions_bus</span>
                  {es ? 'Buscar viajes' : 'Find trips'}
                </MagneticButton>
                <MagneticButton as={Link} to={ROUTES.ENCOMIENDAS} className="footer-glass-pill px-8 md:px-10 py-4 md:py-5 rounded-full text-[var(--foreground)] font-bold text-sm md:text-base flex items-center gap-3 group">
                  <span className="material-symbols-outlined text-2xl text-[var(--primary)]">inventory_2</span>
                  {es ? 'Enviar encomienda' : 'Send a parcel'}
                </MagneticButton>
              </div>

              {/* Redes sociales */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full mt-1">
                {redesDinamicas.map((r) => (
                  <MagneticButton
                    key={r.id}
                    as="a"
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Cootranar en ${r.titulo}`}
                    className="footer-glass-pill px-5 py-3 rounded-full text-[var(--muted)] font-medium text-xs md:text-sm hover:text-[var(--foreground)] flex items-center gap-2"
                  >
                    <span className="[&_svg]:w-4 [&_svg]:h-4">{r.icono}</span>
                    {r.titulo}
                  </MagneticButton>
                ))}
              </div>
            </div>
          </div>

          {/* Texto gigante de marca (ubicado sobre la barra inferior sin superponerse) */}
          <div
            ref={giantTextRef}
            aria-hidden="true"
            className="footer-giant-bg-text relative z-0 w-full text-center px-4 mb-2 md:mb-3 whitespace-nowrap pointer-events-none select-none"
          >
            COOTRANAR
          </div>

          {/* 3. Barra inferior (con espacio para la barra de navegación del móvil) */}
          <div className="relative z-20 w-full pb-24 md:pb-6 pt-2 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5">
            <div className="text-[var(--muted)] text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
              © {new Date().getFullYear()} Cootranar. {es ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </div>

            <div className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default">
              <span className="text-[var(--muted)] text-[10px] md:text-xs font-bold uppercase tracking-widest">{es ? 'Hecho con' : 'Made with'}</span>
              <span className="animate-footer-heartbeat text-sm md:text-base text-[var(--destructive)]" aria-label={es ? 'amor' : 'love'}>❤</span>
              <span className="text-[var(--muted)] text-[10px] md:text-xs font-bold uppercase tracking-widest">{es ? 'en' : 'in'}</span>
              <span className="text-[var(--foreground)] font-black text-xs md:text-sm tracking-normal ml-1">Nariño</span>
            </div>

            <MagneticButton
              as="button"
              type="button"
              onClick={scrollToTop}
              aria-label={es ? 'Volver arriba' : 'Back to top'}
              className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] group order-3"
            >
              <span className="material-symbols-outlined text-xl transform group-hover:-translate-y-1.5 transition-transform duration-300">arrow_upward</span>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
