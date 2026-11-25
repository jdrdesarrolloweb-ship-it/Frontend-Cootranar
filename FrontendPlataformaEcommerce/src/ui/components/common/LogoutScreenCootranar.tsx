import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { usePreferencias } from '../../context/PreferenciasContext';
import logoLetras from '../../../assets/logoLetras.png';
import condorAlaSuperior from '../../../assets/condorAlaSuperior.png';
import condorCuerpo from '../../../assets/condorCuerpo.png';
import condorAlaInferior from '../../../assets/condorAlaInferior.png';

gsap.registerPlugin(MotionPathPlugin);

/* ─────────────────────────────────────────────────────────────────────────────
 * Animación exclusiva de Cierre de Sesión: "Atardecer Andino y Fin de Ruta"
 *
 *  1. Escenario crepuscular de Nariño: cielo estrellado + sol poniente tras el
 *     Volcán Galeras y la Carretera Panamericana de extremo a extremo (0 → 100%
 *     del ancho) con un bus grande de Cootranar recorriéndola suavemente.
 *  2. Tiquete / Pase de Viaje que estampa el sello dorado "SESIÓN PROTEGIDA" y
 *     da paso al vuelo pausado y majestuoso del cóndor articulado a tamaño
 *     completo frente al sol poniente.
 * ──────────────────────────────────────────────────────────────────────────── */

const COLORES_CHISPAS = ['#fde68a', '#f59e0b', '#fb923c', '#ef4444', '#ffffff'];

const ESTRELLAS = [
  { x: '10%', y: '12%', s: 2, d: 0.1 },
  { x: '22%', y: '8%', s: 2.5, d: 0.3 },
  { x: '36%', y: '16%', s: 1.8, d: 0.2 },
  { x: '50%', y: '10%', s: 2.2, d: 0.45 },
  { x: '65%', y: '14%', s: 2.8, d: 0.15 },
  { x: '78%', y: '9%', s: 2, d: 0.35 },
  { x: '90%', y: '18%', s: 2.4, d: 0.25 },
  { x: '15%', y: '26%', s: 1.6, d: 0.5 },
  { x: '84%', y: '27%', s: 1.9, d: 0.4 },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function LogoutScreenCootranar() {
  const { idioma } = usePreferencias();
  const es = idioma === 'es';

  const [visible, setVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [ciclo, setCiclo] = useState(0);

  const overlayRef = useRef<HTMLDivElement>(null);
  const cieloRef = useRef<HTMLDivElement>(null);
  const solRef = useRef<HTMLDivElement>(null);
  const estrellasRef = useRef<HTMLDivElement>(null);
  const cordilleraLejosRef = useRef<SVGGElement>(null);
  const cordilleraCercaRef = useRef<SVGGElement>(null);
  const viaGuiaRef = useRef<SVGPathElement>(null);
  const lineaRutaRef = useRef<SVGPathElement>(null);
  const busGrupoRef = useRef<SVGGElement>(null);

  const tarjetaRef = useRef<HTMLDivElement>(null);
  const selloRef = useRef<HTMLDivElement>(null);
  const ondaSelloRef = useRef<HTMLDivElement>(null);
  const progresoRutaRef = useRef<HTMLDivElement>(null);

  const vueloStageRef = useRef<HTMLDivElement>(null);
  const particulasRef = useRef<HTMLDivElement>(null);
  const condorWrapRef = useRef<HTMLDivElement>(null);
  const alaSupRef = useRef<HTMLImageElement>(null);
  const cuerpoRef = useRef<HTMLImageElement>(null);
  const alaInfRef = useRef<HTMLImageElement>(null);

  const mensajeFinalRef = useRef<HTMLDivElement>(null);
  const saliendoRef = useRef(false);
  const salirRef = useRef<(rapido?: boolean) => void>(() => {});

  useEffect(() => {
    const alCerrarSesion = (e: Event) => {
      const detalle = (e as CustomEvent<{ nombre?: string }>).detail;
      saliendoRef.current = false;
      setNombre(detalle?.nombre || '');
      setCiclo((c) => c + 1);
      setVisible(true);
    };
    window.addEventListener('cootranar:logout', alCerrarSesion);
    return () => window.removeEventListener('cootranar:logout', alCerrarSesion);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelado = false;
    const tweens: (gsap.core.Timeline | gsap.core.Tween)[] = [];
    let flapTl: gsap.core.Timeline | null = null;

    const salir = (rapido = false) => {
      if (saliendoRef.current || cancelado) return;
      saliendoRef.current = true;
      tweens.forEach((t) => t.kill());
      flapTl?.kill();

      const overlay = overlayRef.current;
      if (!overlay) {
        setVisible(false);
        return;
      }
      overlay.style.pointerEvents = 'none';

      gsap.to(overlay, {
        opacity: 0,
        scale: 1.02,
        duration: rapido ? 0.25 : 0.55,
        ease: 'power2.inOut',
        onComplete: () => {
          if (!cancelado) setVisible(false);
        },
      });
    };
    salirRef.current = salir;

    const overlay = overlayRef.current;
    const tarjeta = tarjetaRef.current;
    const sello = selloRef.current;
    const onda = ondaSelloRef.current;
    const wrap = condorWrapRef.current;
    const alaSup = alaSupRef.current;
    const alaInf = alaInfRef.current;
    const cuerpo = cuerpoRef.current;
    const stage = vueloStageRef.current;

    if (!overlay || !tarjeta || !sello || !onda || !wrap || !alaSup || !alaInf || !cuerpo || !stage) return;

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) {
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      const timer = setTimeout(() => salir(true), 1100);
      return () => {
        cancelado = true;
        clearTimeout(timer);
      };
    }

    const W = stage.offsetWidth || 680;
    const H = stage.offsetHeight || 280;

    // NOTA DE ENCUADRE DEL CÓNDOR:
    // En las imágenes 1600x622, el cóndor está dibujado en ~71% del ancho (derecha).
    // Por eso:
    //   x = -0.78 * W -> borde izquierdo de la pantalla
    //   x = -0.21 * W -> centro exacto (justo frente al sol poniente)
    //   x = +0.26 * W -> borde derecho de la pantalla
    const X_IZQ = -0.78 * W;
    const X_SOL = -0.21 * W;
    const X_DER = 0.24 * W;

    if (particulasRef.current) particulasRef.current.innerHTML = '';
    gsap.set(overlay, { opacity: 1, scale: 1 });
    gsap.set(alaSup, { transformOrigin: '69.8% 66.5%', scaleY: 1.02, rotation: -4 });
    gsap.set(alaInf, { transformOrigin: '79% 71.5%', scaleY: -0.62, rotation: -8 });
    gsap.set(cuerpo, { transformOrigin: '71% 69%', yPercent: 0, rotation: 0 });
    gsap.set(wrap, {
      transformOrigin: '71% 67%',
      x: X_IZQ,
      y: 0.08 * H,
      scale: 0.98,
      opacity: 0,
      rotation: -5,
    });

    // Aleteo pausado, amplio y majestuoso para que se aprecie cada movimiento de las 3 piezas
    flapTl = gsap.timeline({ repeat: -1, yoyo: true });
    flapTl
      .to(alaSup, { scaleY: -0.68, rotation: 7, duration: 0.28, ease: 'sine.inOut' }, 0)
      .to(alaInf, { scaleY: 1.15, rotation: 9, duration: 0.28, ease: 'sine.inOut' }, 0)
      .to(cuerpo, { yPercent: -2.4, rotation: -2.5, duration: 0.28, ease: 'sine.inOut' }, 0);
    flapTl.timeScale(1.0);

    const previo = { x: X_IZQ, y: 0.08 * H, rot: -5 };
    let ultimaChispa = 0;

    const alVolar = () => {
      const x = Number(gsap.getProperty(wrap, 'x'));
      const y = Number(gsap.getProperty(wrap, 'y'));
      const dx = x - previo.x;
      const dy = y - previo.y;
      if (Math.hypot(dx, dy) > 0.3) {
        const angulo = (Math.atan2(dy, Math.max(0.8, dx)) * 180) / Math.PI;
        const objetivo = clamp(angulo * 0.5, -18, 12);
        previo.rot += (objetivo - previo.rot) * 0.18;
      }
      previo.x = x;
      previo.y = y;
      gsap.set(wrap, { rotation: previo.rot });

      // Estela de chispas doradas desde las alas del cóndor (71% W, 65% H)
      const ahora = performance.now();
      const capa = particulasRef.current;
      if (capa && ahora - ultimaChispa > 38 && capa.childElementCount < 85) {
        ultimaChispa = ahora;
        const p = document.createElement('span');
        const tam = 4 + Math.random() * 5;
        const color = COLORES_CHISPAS[Math.floor(Math.random() * COLORES_CHISPAS.length)];
        p.style.cssText = `position:absolute;left:${x + 0.67 * W}px;top:${y + 0.63 * H}px;width:${tam}px;height:${tam}px;border-radius:9999px;background:${color};box-shadow:0 0 12px ${color};pointer-events:none;`;
        capa.appendChild(p);
        gsap.to(p, {
          x: -26 - Math.random() * 24,
          y: 12 + Math.random() * 26,
          opacity: 0,
          scale: 0.25,
          duration: 0.85 + Math.random() * 0.45,
          ease: 'power1.out',
          onComplete: () => p.remove(),
        });
      }
    };

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => salir(), 220);
      },
    });
    tweens.push(tl);

    // 1. Entrada del paisaje crepuscular andino + sol poniente + estrellas (duración total ~3.5 s)
    tl.fromTo(
      cieloRef.current,
      { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' },
      { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 0.45, ease: 'power3.inOut' },
      0
    )
      .fromTo(
        solRef.current,
        { y: -30, scale: 0.88, opacity: 0 },
        { y: 18, scale: 1.06, opacity: 1, duration: 3.3, ease: 'sine.out' },
        0.1
      )
      .fromTo(
        estrellasRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.1, ease: 'power1.out' },
        0.25
      )
      .fromTo(
        cordilleraLejosRef.current,
        { y: 35, opacity: 0 },
        { y: 0, x: -22, opacity: 1, duration: 3.3, ease: 'power1.out' },
        0.1
      )
      .fromTo(
        cordilleraCercaRef.current,
        { y: 45, opacity: 0 },
        { y: 0, x: -40, opacity: 1, duration: 3.3, ease: 'power1.out' },
        0.14
      );

    // Carretera Panamericana completa de lado a lado y bus grande de Cootranar recorriendo toda la curva
    if (lineaRutaRef.current) {
      tl.fromTo(
        lineaRutaRef.current,
        { strokeDashoffset: 0 },
        { strokeDashoffset: -280, duration: 3.4, ease: 'none' },
        0.15
      );
    }
    if (busGrupoRef.current && viaGuiaRef.current) {
      tl.fromTo(
        busGrupoRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25 },
        0.18
      ).to(
        busGrupoRef.current,
        {
          motionPath: {
            path: viaGuiaRef.current,
            align: viaGuiaRef.current,
            alignOrigin: [0.5, 0.86],
            autoRotate: true,
            start: 0.06,
            end: 0.92,
          },
          duration: 3.25,
          ease: 'power1.inOut',
        },
        0.18
      );
    }

    // 2. FASE TIQUETE (0.16 → 1.05 s): El Pase de Viaje estampa "SESIÓN PROTEGIDA" y se retira
    //    para dejar el cielo y el sol poniente completamente despejados para el vuelo del cóndor
    tl.fromTo(
      tarjeta,
      { y: 34, scale: 0.88, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.36, ease: 'back.out(1.6)' },
      0.16
    )
      .fromTo(
        progresoRutaRef.current,
        { scaleX: 0, transformOrigin: '0% 50%' },
        { scaleX: 1, duration: 0.38, ease: 'power2.out' },
        0.24
      )
      .fromTo(
        sello,
        { scale: 2.3, opacity: 0, rotation: -18 },
        { scale: 1, opacity: 1, rotation: -5, duration: 0.22, ease: 'back.out(2.2)' },
        0.46
      )
      .fromTo(
        onda,
        { scale: 0.3, opacity: 0.9 },
        { scale: 2.8, opacity: 0, duration: 0.5, ease: 'power2.out' },
        0.48
      )
      .to(
        tarjeta,
        { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' },
        0.48
      )
      .to(
        tarjeta,
        { y: -22, scale: 0.86, opacity: 0, duration: 0.35, ease: 'power2.in' },
        0.98
      );

    // 3. FASE CÓNDOR (0.85 → 3.35 s — 2.5 segundos de vuelo lento y protagonista frente al sol):
    //    El cóndor entra por la izquierda a tamaño grande, cruza lentamente frente al sol dorado
    //    sobre el Volcán Galeras y planea hacia el cielo estrellado a la derecha.
    tl.fromTo(
      mensajeFinalRef.current,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)' },
      1.12
    )
      .to(wrap, { opacity: 1, duration: 0.28, ease: 'power1.out' }, 0.85)
      // Tramo 1 (0.85 → 2.25 s): Vuelo lento y majestuoso desde la izquierda hasta el centro frente al sol
      .to(
        wrap,
        {
          motionPath: {
            path: [
              { x: X_IZQ, y: 0.08 * H },
              { x: -0.52 * W, y: -0.06 * H },
              { x: -0.35 * W, y: -0.14 * H },
              { x: X_SOL, y: -0.12 * H },
            ],
            curviness: 1.25,
          },
          scale: 1.14,
          duration: 1.4,
          ease: 'sine.inOut',
          onUpdate: alVolar,
        },
        0.85
      )
      // Tramo 2 (2.25 → 3.35 s): Planeo térmico frente al sol y ascenso pausado hacia la derecha
      .call(
        () => {
          flapTl?.timeScale(0.72);
        },
        [],
        2.15
      )
      .to(
        wrap,
        {
          motionPath: {
            path: [
              { x: X_SOL, y: -0.12 * H },
              { x: -0.04 * W, y: -0.18 * H },
              { x: 0.12 * W, y: -0.28 * H },
              { x: X_DER, y: -0.38 * H },
            ],
            curviness: 1.25,
          },
          scale: 0.92,
          duration: 1.1,
          ease: 'sine.inOut',
          onUpdate: alVolar,
        },
        2.25
      )
      .to(
        wrap,
        { opacity: 0, duration: 0.32, ease: 'power1.in' },
        3.08
      );

    return () => {
      cancelado = true;
      tweens.forEach((t) => t.kill());
      flapTl?.kill();
    };
  }, [visible, ciclo]);

  // Saltar con Escape
  useEffect(() => {
    if (!visible) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') salirRef.current(true);
    };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [visible]);

  if (!visible) return null;

  const saludo = es
    ? nombre
      ? `¡Feliz regreso, ${nombre}!`
      : '¡Feliz regreso a casa!'
    : nombre
      ? `Safe travels, ${nombre}!`
      : 'Safe travels!';

  // Curva de la Carretera Panamericana que cruza el 100% del ancho (-80 a 1520 en viewBox 1440)
  const PATH_CARRETERA = 'M -80 392 C 260 362, 560 326, 860 310 C 1120 296, 1320 278, 1520 262';

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-label={saludo}
      onClick={() => salirRef.current(true)}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* ── Escenario Crepuscular Andino (Atardecer sobre el Galeras) ── */}
      <div
        ref={cieloRef}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #030712 0%, #0a183d 34%, #1e1b4b 56%, #7c2d12 78%, #d97706 94%, #fbbf24 100%)',
        }}
      >
        {/* Estrellas nocturnas en la parte alta */}
        <div ref={estrellasRef} className="absolute inset-0 pointer-events-none">
          {ESTRELLAS.map((st, idx) => (
            <span
              key={idx}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                left: st.x,
                top: st.y,
                width: `${st.s * 2}px`,
                height: `${st.s * 2}px`,
                boxShadow: '0 0 10px 2px rgba(255,255,255,0.8)',
                animationDelay: `${st.d}s`,
              }}
            />
          ))}
        </div>

        {/* Sol poniente dorado tras el Volcán Galeras */}
        <div
          ref={solRef}
          className="absolute left-1/2 bottom-[25%] -translate-x-1/2 w-[min(68vw,400px)] aspect-square rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(254,240,138,0.95) 0%, rgba(245,158,11,0.68) 40%, rgba(220,38,38,0.28) 70%, transparent 84%)',
            filter: 'blur(2px)',
          }}
        />

        {/* Cordillera de Nariño + Volcán Galeras + Carretera Panamericana de extremo a extremo */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[48%]"
          viewBox="0 0 1440 420"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <linearGradient id="galeras-lejos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#31102f" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="galeras-cerca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#090d1f" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="carretera-asfalto" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="carretera-luz" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="logoutBusBodyWhite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="78%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="logoutBusGlass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="logoutBusBlueTail" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0e3a8c" />
            </linearGradient>
            <linearGradient id="logoutHeadlightBeam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#fde047" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>
            <clipPath id="logoutBusShellClip">
              <path d="M 24 134 L 24 54 Q 24 30 48 28 L 310 24 Q 338 24 344 52 L 355 108 Q 357 126 348 136 L 310 138 L 28 138 Z" />
            </clipPath>
          </defs>

          {/* Silueta lejana: Volcán Galeras y picos andinos */}
          <g ref={cordilleraLejosRef} fill="url(#galeras-lejos)">
            <path d="M-40 420 L-40 250 L140 190 L260 225 L420 130 L520 170 L680 72 L760 72 L900 185 L1050 135 L1210 195 L1340 150 L1480 190 L1480 420 Z" />
          </g>

          {/* Silueta cercana + valle */}
          <g ref={cordilleraCercaRef} fill="url(#galeras-cerca)">
            <path d="M-40 420 L-40 295 L180 245 L350 280 L540 215 L740 265 L940 210 L1140 260 L1310 225 L1480 255 L1480 420 Z" />
          </g>

          {/* Carretera Panamericana completa de borde izquierdo (-80) a borde derecho (1520) */}
          {/* Borde exterior reflectivo de la vía */}
          <path
            d={PATH_CARRETERA}
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="44"
            strokeLinecap="round"
          />
          {/* Calzada de asfalto */}
          <path
            ref={viaGuiaRef}
            d={PATH_CARRETERA}
            fill="none"
            stroke="url(#carretera-asfalto)"
            strokeWidth="38"
            strokeLinecap="round"
          />
          {/* Línea central amarilla discontinua en movimiento de principio a fin */}
          <path
            ref={lineaRutaRef}
            d={PATH_CARRETERA}
            fill="none"
            stroke="url(#carretera-luz)"
            strokeWidth="4"
            strokeDasharray="24 18"
            strokeLinecap="round"
          />

          {/* Bus caricatura Cootranar Marcopolo G7 Aerocondor 5775 (igual al de Buscar Viajes) */}
          <g ref={busGrupoRef}>
            <g transform="translate(-172, -138) scale(0.92)">
              <g className="bus-suspension">
                {/* Sombra en el asfalto */}
                <ellipse cx="188" cy="158" rx="158" ry="8" fill="rgba(2, 6, 23, 0.6)" />

                {/* Haz de luz largo de farola nocturna */}
                <polygon points="346,102 520,74 520,142 346,122" fill="url(#logoutHeadlightBeam)" />

                {/* Nubecitas cartoon del exhosto */}
                <g className="bus-exhaust-puff" style={{ transformOrigin: '20px 132px' }}>
                  <circle cx="14" cy="133" r="6" fill="rgba(255,255,255,0.7)" />
                  <circle cx="5" cy="128" r="4.5" fill="rgba(226,232,240,0.65)" />
                </g>

                {/* Carrocería principal blanca (Marcopolo G7 Aerocondor 5775) */}
                <g clipPath="url(#logoutBusShellClip)">
                  <rect x="20" y="20" width="340" height="125" fill="url(#logoutBusBodyWhite)" />

                  {/* Franja trasera azul Aerocondor */}
                  <polygon points="20,48 92,48 76,142 20,142" fill="url(#logoutBusBlueTail)" />

                  {/* Franja inferior gris/azul sutil */}
                  <rect x="20" y="132" width="340" height="8" fill="#cbd5e1" />
                  <rect x="240" y="131" width="118" height="7" fill="#0e3a8c" />

                  {/* Ventanas panorámicas de pasajeros */}
                  <path
                    d="M 32 42 L 268 38 Q 272 56 264 82 L 32 82 Z"
                    fill="url(#logoutBusGlass)"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* Reflejos brillantes en ventanas */}
                  <polygon points="56,42 74,42 62,82 44,82" fill="rgba(255,255,255,0.16)" />
                  <polygon points="145,40 165,40 153,82 133,82" fill="rgba(255,255,255,0.14)" />
                  <polygon points="222,39 236,39 224,82 210,82" fill="rgba(255,255,255,0.16)" />

                  {/* Divisores sutiles de ventanas */}
                  <line x1="94" y1="41" x2="94" y2="82" stroke="#0f172a" strokeWidth="2" />
                  <line x1="154" y1="40" x2="154" y2="82" stroke="#0f172a" strokeWidth="2" />
                  <line x1="214" y1="39" x2="214" y2="82" stroke="#0f172a" strokeWidth="2" />

                  {/* Ventana lateral de cabina del conductor */}
                  <path
                    d="M 276 38 L 310 38 Q 318 62 314 88 L 270 86 Q 278 60 276 38 Z"
                    fill="url(#logoutBusGlass)"
                  />

                  {/* Pilar cromado curvo característico del Marcopolo G7 */}
                  <path
                    d="M 268 36 Q 277 62 263 86 L 270 88 Q 284 62 276 36 Z"
                    fill="#e2e8f0"
                    stroke="#94a3b8"
                    strokeWidth="0.8"
                  />

                  {/* Parabrisas frontal inclinado */}
                  <path
                    d="M 318 36 L 338 36 L 350 96 L 320 96 Z"
                    fill="url(#logoutBusGlass)"
                  />
                  {/* Letrero azul COOTRANAR en el parabrisas */}
                  <text
                    x="321"
                    y="45"
                    fill="#38bdf8"
                    fontSize="5.5"
                    fontWeight="900"
                    fontStyle="italic"
                    fontFamily="sans-serif"
                  >
                    COOTRANAR
                  </text>
                  {/* Plumillas limpiaparabrisas */}
                  <line x1="332" y1="95" x2="326" y2="62" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="343" y1="95" x2="338" y2="62" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Detalle cinta naranja en esquina inferior */}
                  <path d="M 322 93 Q 326 88 330 94" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />

                  {/* Ala y silueta del cóndor naranja/roja icónica de AEROCONDOR sobre la cola y ventana */}
                  <g fill="#f97316">
                    <path d="M 68 88 Q 76 62 84 44 Q 80 65 73 88 Z" />
                    <path d="M 72 88 Q 82 65 92 48 Q 86 68 77 88 Z" />
                    <path d="M 76 89 Q 88 68 98 54 Q 91 72 81 89 Z" />
                    <path d="M 80 90 Q 92 74 102 63 Q 94 78 85 90 Z" />
                    <path d="M 68 88 Q 92 104 60 128 Q 78 106 64 92 Z" />
                    <path d="M 76 96 Q 98 110 72 132 Q 86 112 72 100 Z" fill="#fb923c" />
                  </g>

                  {/* Texto AEROCONDOR en la parte azul */}
                  <text
                    x="27"
                    y="113"
                    fill="#e2e8f0"
                    fontSize="8.5"
                    fontWeight="800"
                    fontStyle="italic"
                    letterSpacing="0.4"
                    fontFamily="sans-serif"
                  >
                    AEROCONDOR
                  </text>

                  {/* Logotipo principal Cootranar en el costado blanco */}
                  <text
                    x="114"
                    y="108"
                    fill="#0e3a8c"
                    fontSize="26"
                    fontWeight="900"
                    fontStyle="italic"
                    fontFamily="Georgia, serif"
                    letterSpacing="-0.5"
                  >
                    Cootranar
                  </text>

                  {/* Iconos redondos de servicios bajo el logo Cootranar */}
                  <circle cx="118" cy="114" r="2.2" fill="#0e3a8c" />
                  <circle cx="124" cy="114" r="2.2" fill="#0e3a8c" />
                  <circle cx="130" cy="114" r="2.2" fill="#0e3a8c" />
                  <circle cx="136" cy="114" r="2.2" fill="#0e3a8c" />
                  <circle cx="142" cy="114" r="2.2" fill="#0e3a8c" />

                  {/* Líneas de bodegas laterales */}
                  <line x1="132" y1="118" x2="132" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                  <line x1="176" y1="112" x2="176" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                  <line x1="220" y1="112" x2="220" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                  <circle cx="154" cy="120" r="1.6" fill="#0e3a8c" />
                  <circle cx="198" cy="120" r="1.6" fill="#0e3a8c" />

                  {/* Número interno 5775 */}
                  <text
                    x="232"
                    y="126"
                    fill="#0e3a8c"
                    fontSize="11"
                    fontWeight="900"
                    fontStyle="italic"
                    fontFamily="sans-serif"
                  >
                    5775
                  </text>

                  {/* Pequeña ala naranja delantera bajo el parabrisas */}
                  <path d="M 304 102 Q 316 97 322 94 Q 315 103 306 105 Z" fill="#f97316" />

                  {/* Farola delantera estilizada y parrilla cromada */}
                  <path
                    d="M 304 108 L 348 102 L 352 114 L 308 115 Z"
                    fill="#e2e8f0"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <circle cx="344" cy="108" r="3.5" fill="#fef08a" />
                  <circle cx="334" cy="109" r="2.8" fill="#ffffff" />

                  {/* Luz exploradora inferior */}
                  <polygon points="334,122 348,120 347,128 333,128" fill="#1e293b" />
                  <circle cx="341" cy="124" r="2" fill="#fef9c3" />
                </g>

                {/* Contorno exterior nítido estilo caricatura */}
                <path
                  d="M 24 134 L 24 54 Q 24 30 48 28 L 310 24 Q 338 24 344 52 L 355 108 Q 357 126 348 136 L 310 138 L 28 138 Z"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />

                {/* Retrovisor blanco aerodinámico característico ("oreja" hacia adelante) */}
                <path
                  d="M 326 36 Q 345 30 356 38 Q 360 44 358 58 L 349 59 Q 348 45 344 41 L 326 42 Z"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <circle cx="353" cy="52" r="2" fill="#0e3a8c" />

                {/* Huecos de ruedas oscuros */}
                <path d="M 68 138 A 24 24 0 0 1 116 138 Z" fill="#0f172a" />
                <path d="M 258 138 A 24 24 0 0 1 306 138 Z" fill="#0f172a" />

                {/* Rueda trasera girando */}
                <g className="bus-wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="92" cy="140" r="20" fill="#1e293b" stroke="#020617" strokeWidth="2.5" />
                  <circle cx="92" cy="140" r="13" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                  <circle cx="92" cy="140" r="7.5" fill="#0e3a8c" />
                  <circle cx="92" cy="130" r="1.4" fill="#334155" />
                  <circle cx="101.5" cy="136.5" r="1.4" fill="#334155" />
                  <circle cx="98" cy="148" r="1.4" fill="#334155" />
                  <circle cx="86" cy="148" r="1.4" fill="#334155" />
                  <circle cx="82.5" cy="136.5" r="1.4" fill="#334155" />
                  <circle cx="92" cy="140" r="2.2" fill="#ffffff" />
                </g>

                {/* Rueda delantera girando */}
                <g className="bus-wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="282" cy="140" r="20" fill="#1e293b" stroke="#020617" strokeWidth="2.5" />
                  <circle cx="282" cy="140" r="13" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                  <circle cx="282" cy="140" r="7.5" fill="#0e3a8c" />
                  <circle cx="282" cy="130" r="1.4" fill="#334155" />
                  <circle cx="291.5" cy="136.5" r="1.4" fill="#334155" />
                  <circle cx="288" cy="148" r="1.4" fill="#334155" />
                  <circle cx="276" cy="148" r="1.4" fill="#334155" />
                  <circle cx="272.5" cy="136.5" r="1.4" fill="#334155" />
                  <circle cx="282" cy="140" r="2.2" fill="#ffffff" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* ── Escenario de Vuelo del Cóndor (z-50, grande y pausado frente al sol) ── */}
      <div
        ref={vueloStageRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
      >
        <div className="relative w-[min(92vw,680px)] aspect-[1600/622]">
          <div ref={particulasRef} className="absolute inset-0 z-20" />
          <div ref={condorWrapRef} className="absolute inset-0 w-full h-full z-30 opacity-0">
            <img
              ref={alaInfRef}
              src={condorAlaInferior}
              alt=""
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_14px_30px_rgba(245,158,11,0.65)]"
            />
            <img
              ref={cuerpoRef}
              src={condorCuerpo}
              alt=""
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_14px_30px_rgba(220,38,38,0.65)]"
            />
            <img
              ref={alaSupRef}
              src={condorAlaSuperior}
              alt=""
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_16px_34px_rgba(251,191,36,0.75)]"
            />
          </div>
        </div>
      </div>

      {/* ── Centro: Pase de Viaje / Tiquete y Saludo Final ── */}
      <div className="relative z-40 flex flex-col items-center justify-center px-4 w-full max-w-md">
        {/* Tarjeta tipo Boarding Pass de Cootranar */}
        <div
          ref={tarjetaRef}
          className="relative w-full rounded-3xl border border-amber-300/30 bg-slate-950/75 backdrop-blur-xl shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden p-6 text-white"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#1d4ed8] via-[#f59e0b] to-[#dc2626]" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <img src={logoLetras} alt="Cootranar" className="h-7 object-contain" />
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/30">
              {es ? 'Fin de recorrido' : 'End of trip'}
            </span>
          </div>

          <div className="my-5 flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-blue-200/70 font-semibold">
                {es ? 'Pasajero' : 'Passenger'}
              </p>
              <p className="text-base sm:text-lg font-black tracking-tight text-white truncate max-w-[130px]">
                {nombre || (es ? 'Viajero VIP' : 'VIP Traveler')}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <div className="flex-1 h-0.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    ref={progresoRutaRef}
                    className="h-full w-full bg-gradient-to-r from-blue-400 via-amber-400 to-emerald-400"
                  />
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0" />
              </div>
              <span className="text-[10px] text-amber-300/90 font-bold tracking-widest uppercase mt-1.5">
                {es ? 'Destino alcanzado' : 'Destination reached'}
              </span>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-blue-200/70 font-semibold">
                {es ? 'Estado' : 'Status'}
              </p>
              <p className="text-sm sm:text-base font-extrabold text-emerald-400">
                {es ? 'Cerrada' : 'Closed'}
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-center pt-2 border-t border-dashed border-white/15">
            <div
              ref={ondaSelloRef}
              className="absolute w-16 h-16 rounded-full border-2 border-amber-300/80 pointer-events-none opacity-0"
            />
            <div
              ref={selloRef}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 border-amber-400 bg-amber-400/15 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.45)] opacity-0"
            >
              <span className="material-symbols-outlined text-amber-300 text-lg">verified_user</span>
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                {es ? 'Sesión Protegida' : 'Session Secured'}
              </span>
            </div>
          </div>
        </div>

        {/* Saludo final situado debajo del vuelo del cóndor para no tapar el sol ni las alas */}
        <div
          ref={mensajeFinalRef}
          className="absolute top-[64%] inset-x-0 flex flex-col items-center text-center pointer-events-none opacity-0"
        >
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.25em] bg-amber-400/20 text-amber-200 border border-amber-300/35 mb-2 backdrop-blur-md">
            Cootranar · Nariño
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
            {saludo}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-amber-100/95 mt-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {es
              ? 'Gracias por viajar con nosotros · Te esperamos pronto a bordo'
              : 'Thank you for traveling with us · See you on board soon'}
          </p>
        </div>
      </div>

      {/* Botón para saltar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          salirRef.current(true);
        }}
        className="absolute bottom-6 right-6 z-50 px-3.5 py-1.5 rounded-full text-xs font-bold text-white/80 hover:text-white bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
      >
        {es ? 'Saltar' : 'Skip'}
      </button>
    </div>
  );
}
