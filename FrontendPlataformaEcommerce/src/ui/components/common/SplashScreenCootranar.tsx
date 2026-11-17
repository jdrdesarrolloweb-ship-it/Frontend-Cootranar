import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { usePreferencias } from '../../context/PreferenciasContext';
import { useContenidoWeb } from '../../context/ContenidoWebContext';
import logoLetras from '../../../assets/logoLetras.png';
import condorAlaSuperior from '../../../assets/condorAlaSuperior.png';
import condorCuerpo from '../../../assets/condorCuerpo.png';
import condorAlaInferior from '../../../assets/condorAlaInferior.png';

gsap.registerPlugin(MotionPathPlugin);

/* ─────────────────────────────────────────────────────────────────────────────
 * Intro de marca: el cóndor despega, "escribe" Cootranar a su paso, da la
 * vuelta, aterriza detrás del logo y el logo armado vuela hasta el navbar
 * mientras la página se revela en círculo.
 *
 * Cuándo se muestra:
 *  - Cada vez que se carga o recarga la página de inicio (/ o /home).
 *  - Nunca en las demás páginas (al navegar dentro de la app tampoco se repite,
 *    porque el componente solo decide al cargar la página).
 *  - Con "reducir movimiento": solo un fundido breve del logo.
 * ──────────────────────────────────────────────────────────────────────────── */

const RUTAS_CON_INTRO = ['/', '/home'];
const COLORES_PARTICULAS = ['#f59e0b', '#fbbf24', '#dc2626', '#ffffff'];

type Modo = 'completo' | 'corto' | 'reducido' | 'ninguno';

const decidirModo = (): Modo => {
  if (typeof window === 'undefined') return 'ninguno';
  const ruta = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!RUTAS_CON_INTRO.includes(ruta)) return 'ninguno';
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'reducido';
  return 'completo';
};

/** Espera a que la página termine de cargar (con un máximo), para que la barra sea real. */
const esperarCarga = (maxMs: number) =>
  Promise.race([
    new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    }),
    new Promise<void>((resolve) => setTimeout(resolve, maxMs)),
  ]);

const precargar = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Estilos globales mientras corre la intro: logo del navbar oculto (lo reemplaza el que
// aterriza) y portada oculta hasta su entrada en cascada.
const ESTILOS_GLOBALES = `
html[data-splash-logo="oculto"] #navbar-logo { opacity: 0; }
html[data-splash="activo"] [data-hero-anim] { opacity: 0; }
`;

export function SplashScreenCootranar() {
  const { idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const es = idioma === 'es';
  const [modo] = useState<Modo>(decidirModo);
  const [visible, setVisible] = useState(modo !== 'ninguno');
  const [condorDetras, setCondorDetras] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const fondoRef = useRef<HTMLDivElement>(null);
  const montanasLejosRef = useRef<SVGGElement>(null);
  const montanasCercaRef = useRef<SVGGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rutaRef = useRef<SVGPathElement>(null);
  const letrasRef = useRef<HTMLImageElement>(null);
  const bordeRef = useRef<HTMLDivElement>(null);
  const destelloRef = useRef<HTMLDivElement>(null);
  const ondaRef = useRef<HTMLDivElement>(null);
  const particulasRef = useRef<HTMLDivElement>(null);
  const condorWrapRef = useRef<HTMLDivElement>(null);
  const alaSupRef = useRef<HTMLImageElement>(null);
  const cuerpoRef = useRef<HTMLImageElement>(null);
  const alaInfRef = useRef<HTMLImageElement>(null);
  const subtituloRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const saliendoRef = useRef(false);
  const salirRef = useRef<(rapido?: boolean) => void>(() => {});

  // Marcas globales antes del primer pintado (evita ver el logo del navbar duplicado).
  useLayoutEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    html.dataset.splash = 'activo';
    html.dataset.splashLogo = 'oculto';
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      delete html.dataset.splash;
      delete html.dataset.splashLogo;
      document.body.style.overflow = overflowPrevio;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelado = false;
    const tweens: (gsap.core.Timeline | gsap.core.Tween)[] = [];
    let flapTl: gsap.core.Timeline | null = null;

    /* ── Salida: el logo vuela al navbar y la página se revela en círculo ── */
    const salir = (rapido = false) => {
      if (saliendoRef.current || cancelado) return;
      saliendoRef.current = true;
      tweens.forEach((t) => t.kill());
      flapTl?.kill();

      const overlay = overlayRef.current;
      const stage = stageRef.current;
      const fondo = fondoRef.current;
      if (!overlay || !stage || !fondo) { setVisible(false); return; }
      overlay.style.pointerEvents = 'none';

      // Portada: entrada en cascada mientras se abre el círculo
      window.dispatchEvent(new Event('cootranar:splash-fin'));
      delete document.documentElement.dataset.splash;

      const dur = rapido ? 0.45 : 0.75;
      const sRect = stage.getBoundingClientRect();
      const destino = document.getElementById('navbar-logo')?.getBoundingClientRect();
      const visibleNav = destino && destino.width > 0 && destino.top < window.innerHeight;
      const cx = sRect.left + sRect.width / 2;
      const cy = sRect.top + sRect.height / 2;

      const fin = () => {
        delete document.documentElement.dataset.splashLogo;
        setVisible(false);
      };

      gsap.to([extrasRef.current, subtituloRef.current, particulasRef.current, botonRef.current], { opacity: 0, duration: dur * 0.5 });

      if (modo === 'reducido' || !visibleNav) {
        gsap.to(overlay, { opacity: 0, duration: rapido ? 0.25 : 0.4, ease: 'power2.inOut', onComplete: fin });
        return;
      }

      // Logo armado → logo del navbar (mismo encuadre: letras + cóndor)
      const escala = destino.width / sRect.width;
      gsap.to(stage, {
        x: destino.left + destino.width / 2 - cx,
        y: destino.top + destino.height / 2 - cy,
        scale: escala,
        duration: dur,
        ease: 'power3.inOut',
      });
      gsap.fromTo(
        fondo,
        { clipPath: `circle(150% at ${cx}px ${cy}px)` },
        {
          clipPath: `circle(0% at ${destino.left + destino.width / 2}px ${destino.top + destino.height / 2}px)`,
          duration: dur,
          ease: 'power3.inOut',
          onComplete: fin,
        }
      );
    };
    salirRef.current = salir;

    Promise.race([
      Promise.all([logoLetras, condorAlaSuperior, condorCuerpo, condorAlaInferior].map(precargar)),
      new Promise<void>((r) => setTimeout(r, 450)),
    ]).then(() => {
      if (cancelado) return;
      const stage = stageRef.current;
      const wrap = condorWrapRef.current;
      const letras = letrasRef.current;
      const alaSup = alaSupRef.current;
      const alaInf = alaInfRef.current;
      const cuerpo = cuerpoRef.current;
      if (!stage || !wrap || !letras || !alaSup || !alaInf || !cuerpo) return;

      const W = stage.offsetWidth;
      const H = stage.offsetHeight;

      gsap.set(alaSup, { transformOrigin: '69.8% 66.5%' });
      gsap.set(alaInf, { transformOrigin: '79% 71.5%' });
      gsap.set(cuerpo, { transformOrigin: '71% 69%' });
      gsap.set(wrap, { transformOrigin: '71% 67%' });
      gsap.set(barraRef.current, { scaleX: 0, transformOrigin: '0% 50%' });

      const letrasSub = subtituloRef.current?.querySelectorAll('[data-letra]') ?? [];
      const mostrarSubtitulo = (t: gsap.core.Timeline, pos: number) =>
        t.fromTo(letrasSub, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.012, ease: 'power2.out' }, pos);

      const destello = (t: gsap.core.Timeline, pos: number) =>
        t.fromTo(
          destelloRef.current,
          { left: '-45%', opacity: 0 },
          {
            keyframes: [
              { left: '-25%', opacity: 1, duration: 0.12, ease: 'power1.out' },
              { left: '95%', opacity: 1, duration: 0.58, ease: 'sine.inOut' },
              { left: '118%', opacity: 0, duration: 0.16, ease: 'power1.in' },
            ],
          },
          pos
        );

      const terminar = (t: gsap.core.Timeline) => {
        t.eventCallback('onComplete', () => {
          esperarCarga(1200).then(() => {
            gsap.to(barraRef.current, { scaleX: 1, duration: 0.2 });
            setTimeout(() => salir(), 220);
          });
        });
      };

      /* ── Reducir movimiento: logo estático y fundido ── */
      if (modo === 'reducido') {
        gsap.set([letras, wrap], { opacity: 1, clipPath: 'none' });
        setCondorDetras(true);
        const t = gsap.timeline();
        t.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: 0.25 }).to(barraRef.current, { scaleX: 0.9, duration: 0.5 }, 0);
        letrasSub.forEach((l) => ((l as HTMLElement).style.opacity = '1'));
        tweens.push(t);
        terminar(t);
        return;
      }

      /* ── Versión corta para quien ya conoce la intro ── */
      if (modo === 'corto') {
        gsap.set(letras, { clipPath: 'inset(0 0% 0 0)', opacity: 1 });
        gsap.set(wrap, { opacity: 1 });
        setCondorDetras(true);
        const t = gsap.timeline();
        t.fromTo(stage, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' })
          .to(barraRef.current, { scaleX: 0.9, duration: 0.9, ease: 'power1.inOut' }, 0);
        destello(t, 0.3);
        mostrarSubtitulo(t, 0.25);
        tweens.push(t);
        terminar(t);
        return;
      }

      /* ── Versión completa ── */
      gsap.set(letras, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
      gsap.set(wrap, { x: -0.8 * W, y: -0.06 * H, opacity: 0, scaleX: 1, scaleY: 1 });
      gsap.set(alaSup, { scaleY: 1.02, rotation: -4 });
      gsap.set(alaInf, { scaleY: -0.65, rotation: -8 });
      gsap.set(cuerpo, { yPercent: 1.6, rotation: 2 });
      if (rutaRef.current) {
        const largo = rutaRef.current.getTotalLength();
        gsap.set(rutaRef.current, { strokeDasharray: largo, strokeDashoffset: largo });
      }

      // Aleteo continuo cuya velocidad cambia por fase (despegue rápido, crucero amplio, planeo).
      flapTl = gsap.timeline({ repeat: -1, yoyo: true });
      flapTl
        .to(alaSup, { scaleY: -0.68, rotation: 6, duration: 0.2, ease: 'sine.inOut' }, 0)
        .to(alaInf, { scaleY: 1.15, rotation: 8, duration: 0.2, ease: 'sine.inOut' }, 0)
        .to(cuerpo, { yPercent: -2.4, rotation: -2.5, duration: 0.2, ease: 'sine.inOut' }, 0);
      flapTl.timeScale(1.45);

      const planear = (duracion = 0.25) => {
        flapTl?.pause();
        return gsap.to([alaSup, alaInf], {
          scaleY: (i: number) => (i === 0 ? 1.06 : -0.45),
          rotation: (i: number) => (i === 0 ? -7 : -4),
          duration: duracion,
          ease: 'power2.out',
        });
      };
      const aletear = (velocidad: number) => {
        flapTl?.timeScale(velocidad).resume();
      };

      // Orientación: un único escritor de la rotación combina la pendiente del vuelo y el ladeo.
      const ladeo = { v: 0 };
      const previo = { x: -0.8 * W, y: -0.06 * H, rot: 0 };
      let ultimaParticula = 0;
      let revelado = 0;

      const alActualizar = (revelar: boolean) => () => {
        const x = Number(gsap.getProperty(wrap, 'x'));
        const y = Number(gsap.getProperty(wrap, 'y'));
        const mirando = Math.sign(Number(gsap.getProperty(wrap, 'scaleX'))) || 1;
        const dx = x - previo.x;
        const dy = y - previo.y;
        let objetivo = previo.rot;
        if (Math.hypot(dx, dy) > 0.4) {
          const angulo = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
          objetivo = clamp(angulo * 0.45, -16, 16) * mirando + ladeo.v;
        }
        previo.rot += (objetivo - previo.rot) * 0.22;
        previo.x = x;
        previo.y = y;
        gsap.set(wrap, { rotation: previo.rot });

        // El cóndor "escribe" el logo: el revelado sigue su posición real hasta la última "r".
        if (revelar) {
          revelado = Math.max(revelado, clamp((x / W + 0.8) / 1.12, 0, 1));
          gsap.set(letras, { clipPath: `inset(0 ${(1 - revelado) * 100}% 0 0)` });
          gsap.set(bordeRef.current, { left: `${revelado * 100}%`, opacity: revelado < 0.99 ? 1 : 0 });
        }

        // Estela de partículas desde las alas
        const ahora = performance.now();
        const capa = particulasRef.current;
        if (capa && ahora - ultimaParticula > 38 && capa.childElementCount < 70) {
          ultimaParticula = ahora;
          const p = document.createElement('span');
          const tam = 3 + Math.random() * 4;
          p.style.cssText = `position:absolute;left:${x + 0.64 * W}px;top:${y + 0.6 * H}px;width:${tam}px;height:${tam}px;border-radius:9999px;background:${COLORES_PARTICULAS[Math.floor(Math.random() * COLORES_PARTICULAS.length)]};box-shadow:0 0 8px currentColor;pointer-events:none;`;
          capa.appendChild(p);
          gsap.to(p, {
            x: -18 * mirando + (Math.random() - 0.5) * 14,
            y: 18 + Math.random() * 26,
            opacity: 0,
            scale: 0.3,
            duration: 0.7 + Math.random() * 0.4,
            ease: 'power1.in',
            onComplete: () => p.remove(),
          });
        }
      };

      const tl = gsap.timeline();
      tweens.push(tl);

      // Barra: avanza con la animación; el último tramo espera a que la página cargue.
      tl.to(barraRef.current, { scaleX: 0.9, duration: 2.7, ease: 'power1.inOut' }, 0);

      // Ambiente: montañas de Nariño con profundidad y ruta que se dibuja
      tl.to(montanasLejosRef.current, { x: -18, duration: 2.8, ease: 'none' }, 0)
        .to(montanasCercaRef.current, { x: -42, duration: 2.8, ease: 'none' }, 0)
        .to(rutaRef.current, { strokeDashoffset: 0, duration: 1.15, ease: 'power1.inOut' }, 0.1);

      // FASE 1 (0 → 1.15 s): despegue rápido y vuelo curvo de izquierda a derecha escribiendo el logo
      tl.to(wrap, { opacity: 1, duration: 0.15 }, 0)
        .call(() => { gsap.to(flapTl, { timeScale: 0.95, duration: 0.6 }); }, [], 0.25)
        .to(wrap, {
          motionPath: {
            path: [
              { x: -0.8 * W, y: -0.06 * H },
              { x: -0.42 * W, y: -0.14 * H },
              { x: 0, y: -0.03 * H },
              { x: 0.34 * W, y: -0.1 * H },
            ],
            curviness: 1.25,
          },
          duration: 1.15,
          ease: 'sine.inOut',
          onUpdate: alActualizar(true),
        }, 0)
        .call(() => {
          gsap.set(letras, { clipPath: 'inset(0 0% 0 0)' });
          gsap.to(bordeRef.current, { opacity: 0, duration: 0.2 });
        }, [], 1.15);

      // FASE 2 (1.15 → 2.15 s): viraje ladeado con alas en planeo, regreso por lo alto y segundo viraje
      tl.call(() => { planear(0.2); }, [], 1.15)
        .to(ladeo, { v: 12, duration: 0.25, ease: 'sine.out' }, 1.15)
        .to(wrap, { scaleX: -0.84, scaleY: 0.84, duration: 0.3, ease: 'sine.inOut' }, 1.17)
        .to(ladeo, { v: 0, duration: 0.25, ease: 'sine.in' }, 1.42)
        .call(() => aletear(1.1), [], 1.45)
        .to(wrap, {
          motionPath: {
            path: [
              { x: 0.34 * W, y: -0.1 * H },
              { x: 0.38 * W, y: -0.26 * H },
              { x: 0.06 * W, y: -0.38 * H },
              { x: -0.22 * W, y: -0.24 * H },
              { x: -0.16 * W, y: -0.12 * H },
            ],
            curviness: 1.4,
          },
          duration: 1.0,
          ease: 'sine.inOut',
          onUpdate: alActualizar(false),
        }, 1.15)
        .call(() => { planear(0.18); }, [], 1.88)
        .to(ladeo, { v: -10, duration: 0.2, ease: 'sine.out' }, 1.88)
        .to(wrap, { scaleX: 0.97, scaleY: 0.97, duration: 0.26, ease: 'sine.inOut' }, 1.9)
        .to(ladeo, { v: 0, duration: 0.2 }, 2.08)
        .call(() => setCondorDetras(true), [], 2.1);

      // FASE 3 (2.15 → 2.6 s): planeo final, aterrizaje con inercia y último aleteo para frenar
      tl.to(wrap, {
        motionPath: { path: [{ x: -0.16 * W, y: -0.12 * H }, { x: -0.05 * W, y: -0.035 * H }, { x: 0, y: 0.018 * H }], curviness: 1 },
        scaleX: 1,
        scaleY: 1,
        duration: 0.34,
        ease: 'power2.out',
        onUpdate: alActualizar(false),
      }, 2.15)
        .to(wrap, { y: 0, rotation: 0, duration: 0.22, ease: 'back.out(3)' }, 2.49)
        .call(() => {
          flapTl?.kill();
          // Un último aleteo corto para frenar y plegar
          gsap.timeline()
            .to(alaSup, { scaleY: -0.4, rotation: 4, duration: 0.09, ease: 'sine.inOut' })
            .to(alaInf, { scaleY: 0.9, rotation: 6, duration: 0.09, ease: 'sine.inOut' }, 0)
            .to([alaSup, alaInf], { scaleY: 1, rotation: 0, duration: 0.22, ease: 'power2.out' });
          gsap.to(cuerpo, { yPercent: 0, duration: 0.2 });
        }, [], 2.47)
        // Cabeza viva: leve giro del cuerpo desde el cuello
        .to(cuerpo, { rotation: -3, duration: 0.14, ease: 'sine.out' }, 2.62)
        .to(cuerpo, { rotation: 0, duration: 0.25, ease: 'sine.inOut' }, 2.76);

      // Onda de luz al encajar y destello metálico completo de la "C" hasta la última "r"
      tl.fromTo(ondaRef.current, { scale: 0, opacity: 0.7 }, { scale: 3, opacity: 0, duration: 0.6, ease: 'power2.out' }, 2.48)
        .fromTo(stage, { scale: 1 }, { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, 2.48);
      destello(tl, 2.48);

      mostrarSubtitulo(tl, 2.25);
      tl.to({}, { duration: 0.35 });
      terminar(tl);
    });

    return () => {
      cancelado = true;
      tweens.forEach((t) => t.kill());
      flapTl?.kill();
    };
  }, [visible, modo]);

  // Saltar con Escape
  useEffect(() => {
    if (!visible) return;
    const alTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') salirRef.current(true); };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [visible]);

  if (!visible || contenido.home.splashActivo === false) return null;

  const subtitulo1 = es ? (contenido.home.splashSubtitulo1 || 'Transporte de Pasajeros y Encomiendas') : 'Passenger & Parcel Transport';
  const subtitulo2 = es ? (contenido.home.splashSubtitulo2 || 'Conectando a Nariño y el suroccidente colombiano') : 'Connecting Nariño and southwest Colombia';
  const partir = (texto: string) =>
    Array.from(texto).map((c, i) => (
      <span key={i} data-letra className="inline-block opacity-0" style={{ whiteSpace: 'pre' }}>{c}</span>
    ));

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-label={es ? 'Bienvenidos a Cootranar' : 'Welcome to Cootranar'}
      onClick={() => salirRef.current(true)}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none px-4 cursor-pointer"
    >
      <style>{ESTILOS_GLOBALES}</style>

      {/* Fondo: se recorta en círculo hacia el navbar al salir */}
      <div
        ref={fondoRef}
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 45%, #103c91 0%, #071d49 55%, #030b1c 100%)' }}
      >
        {/* Resplandor ambiental */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[min(90vw,680px)] h-[min(55vw,360px)] rounded-full blur-3xl opacity-45"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(56,189,248,0.28) 50%, rgba(14,58,140,0) 75%)' }}
        />
        {/* Montañas de Nariño (dos capas con profundidad) */}
        <svg className="absolute bottom-0 left-[-5%] w-[110%] h-[38%]" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <g ref={montanasLejosRef} fill="rgba(147,197,253,0.07)">
            <path d="M0 300 L0 170 L90 120 L170 150 L260 80 L340 130 L430 60 L520 120 L600 90 L700 140 L790 70 L880 125 L970 95 L1060 140 L1140 100 L1200 130 L1200 300 Z" />
          </g>
          <g ref={montanasCercaRef} fill="rgba(3,11,28,0.55)">
            <path d="M0 300 L0 220 L120 170 L210 205 L330 150 L450 210 L560 170 L680 225 L800 175 L920 215 L1040 180 L1200 220 L1200 300 Z" />
          </g>
        </svg>
      </div>

      {/* Contenido */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-[680px]">
        <div ref={stageRef} className="relative w-[min(88vw,620px)] aspect-[1600/622] flex items-center justify-center">
          {/* Ruta que se dibuja bajo el logo */}
          <svg aria-hidden="true" className="absolute left-0 right-0 bottom-[2%] w-full h-[30%] pointer-events-none z-0" viewBox="0 0 620 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ruta-cootranar" x1="0" x2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0" />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path ref={rutaRef} d="M5 48 C 120 20, 220 56, 320 34 S 520 18, 615 30" fill="none" stroke="url(#ruta-cootranar)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          {/* Partículas de la estela */}
          <div ref={particulasRef} aria-hidden="true" className="absolute inset-0 pointer-events-none z-[25] text-amber-400" />

          {/* Letras "Cootranar" */}
          <img
            ref={letrasRef}
            src={logoLetras}
            alt="Cootranar"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] z-20"
            style={{ clipPath: 'inset(0 100% 0 0)' }}
          />
          {/* Borde brillante del revelado ("tinta fresca") */}
          <div
            ref={bordeRef}
            aria-hidden="true"
            className="absolute top-[18%] bottom-[18%] w-[3px] -ml-[1.5px] rounded-full pointer-events-none z-[21] opacity-0"
            style={{ background: 'linear-gradient(180deg, transparent, #fff 30%, #fde68a 70%, transparent)', boxShadow: '0 0 14px 4px rgba(253,230,138,0.65)' }}
          />
          {/* Destello metálico recortado a la forma de las letras */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-[22] overflow-hidden"
            style={{
              WebkitMaskImage: `url(${logoLetras})`, maskImage: `url(${logoLetras})`,
              WebkitMaskSize: 'contain', maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center', maskPosition: 'center',
            }}
          >
            <div
              ref={destelloRef}
              className="absolute inset-y-0 w-[42%] opacity-0"
              style={{
                left: '-45%',
                background:
                  'linear-gradient(108deg, transparent 0%, rgba(255,255,255,0.18) 25%, rgba(254,243,199,0.95) 48%, rgba(255,255,255,1) 53%, rgba(253,224,71,0.45) 70%, transparent 100%)',
              }}
            />
          </div>

          {/* Onda de luz al aterrizar */}
          <div
            ref={ondaRef}
            aria-hidden="true"
            className="absolute left-[63%] top-[52%] w-[22%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[15] opacity-0"
            style={{ border: '2px solid rgba(253,230,138,0.8)', boxShadow: '0 0 30px rgba(245,158,11,0.5)' }}
          />

          {/* Cóndor articulado en 3 piezas */}
          <div ref={condorWrapRef} className={`absolute inset-0 w-full h-full pointer-events-none opacity-0 ${condorDetras ? 'z-10' : 'z-30'}`}>
            <img ref={alaInfRef} src={condorAlaInferior} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(220,38,38,0.35)]" />
            <img ref={cuerpoRef} src={condorCuerpo} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(220,38,38,0.4)]" />
            <img ref={alaSupRef} src={condorAlaSuperior} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(220,38,38,0.45)]" />
          </div>
        </div>

        {/* Subtítulo letra por letra */}
        <div ref={subtituloRef} className="mt-2 sm:mt-3 flex flex-col items-center text-center">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.28em] text-blue-100/90">{partir(subtitulo1)}</span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-amber-400/90 mt-1">{partir(subtitulo2)}</span>
        </div>

        <div ref={extrasRef} className="mt-6 flex flex-col items-center">
          <div className="w-44 sm:w-56 h-1 rounded-full bg-white/15 overflow-hidden">
            <div ref={barraRef} className="h-full w-full rounded-full bg-gradient-to-r from-[#dc2626] via-[#f59e0b] to-white" />
          </div>
        </div>
      </div>

      {/* Saltar: botón, clic en cualquier parte o Escape */}
      <button
        ref={botonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); salirRef.current(true); }}
        className="absolute bottom-6 right-6 px-3.5 py-1.5 rounded-full text-xs font-bold text-white/75 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
      >
        {es ? 'Saltar intro' : 'Skip intro'}
      </button>
    </div>
  );
}
