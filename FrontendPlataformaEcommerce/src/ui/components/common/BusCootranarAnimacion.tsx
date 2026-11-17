import { useEffect } from 'react';

interface BusCootranarAnimacionProps {
  visible: boolean;
  origen?: string;
  destino?: string;
  idioma?: 'es' | 'en';
  onFinish: () => void;
}

/**
 * Animación de transición con un bus Marcopolo Aerocondor de Cootranar estilo caricatura.
 * Se muestra al hacer clic en "Buscar viajes" antes de deslizar hacia la sección de resultados.
 */
export function BusCootranarAnimacion({
  visible,
  origen,
  destino,
  idioma = 'es',
  onFinish,
}: BusCootranarAnimacionProps) {
  useEffect(() => {
    if (!visible) return;

    // Respetar preferencia de movimiento reducido del sistema
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      onFinish();
      return;
    }

    const timer = window.setTimeout(() => {
      onFinish();
    }, 1250);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [visible, onFinish]);

  if (!visible) return null;

  const textoRuta =
    origen && destino
      ? `${origen} → ${destino}`
      : origen
      ? `${idioma === 'es' ? 'Saliendo desde' : 'Departing from'} ${origen}`
      : destino
      ? `${idioma === 'es' ? 'Rumbo a' : 'Heading to'} ${destino}`
      : idioma === 'es'
      ? 'Buscando los mejores viajes...'
      : 'Finding the best trips...';

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onFinish}
      title={idioma === 'es' ? 'Clic para ir directo a los viajes' : 'Click to jump to trips'}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-sm select-none cursor-pointer animate-[fadeIn_0.18s_ease-out]"
    >
      {/* Etiqueta de ruta */}
      <div className="mb-6 px-5 py-2 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-xl border border-blue-200/60 dark:border-slate-700 flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0e3a8c] dark:bg-blue-400 animate-ping" />
        <span className="text-sm sm:text-base font-extrabold text-[#0e3a8c] dark:text-blue-300 tracking-tight">
          {textoRuta}
        </span>
      </div>

      {/* Escena de carretera de ancho completo */}
      <div className="relative w-full h-44 sm:h-48 overflow-hidden flex items-end">
        {/* Cielo sutil / líneas de velocidad de fondo */}
        <div className="absolute inset-x-0 top-6 flex justify-around opacity-25 pointer-events-none">
          <div className="w-20 h-0.5 bg-white rounded-full animate-pulse" />
          <div className="w-32 h-0.5 bg-blue-300 rounded-full animate-pulse" />
          <div className="w-16 h-0.5 bg-white rounded-full animate-pulse" />
        </div>

        {/* Asfalto de carretera */}
        <div className="relative w-full h-14 bg-slate-800 border-t-4 border-slate-600 shadow-inner flex items-center">
          {/* Línea amarilla discontinua animada */}
          <div className="w-full h-1.5 bus-road-stripes opacity-90" />
        </div>

        {/* Bus caricatura Cootranar Aerocondor 5775 */}
        <div className="absolute bottom-7 left-0 bus-drive-across will-change-transform">
          <div className="bus-suspension relative">
            {/* Estelas de velocidad cartoon */}
            <div className="absolute -left-14 bottom-12 flex flex-col gap-2 pointer-events-none">
              <span className="block w-12 h-1 rounded-full bg-white/75 bus-speed-streak" />
              <span className="block w-8 h-1 rounded-full bg-blue-300/80 bus-speed-streak [animation-delay:120ms]" />
              <span className="block w-10 h-1 rounded-full bg-orange-400/75 bus-speed-streak [animation-delay:220ms]" />
            </div>

            <svg
              viewBox="0 0 380 175"
              className="w-[290px] sm:w-[370px] h-auto drop-shadow-[0_14px_22px_rgba(0,0,0,0.45)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="busBodyWhite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="78%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="busGlass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="60%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="busBlueTail" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#0e3a8c" />
                </linearGradient>
                <linearGradient id="headlightBeam" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                </linearGradient>
                <clipPath id="busShellClip">
                  <path d="M 24 134 L 24 54 Q 24 30 48 28 L 310 24 Q 338 24 344 52 L 355 108 Q 357 126 348 136 L 310 138 L 28 138 Z" />
                </clipPath>
              </defs>

              {/* Sombra en el asfalto */}
              <ellipse cx="188" cy="158" rx="158" ry="8" fill="rgba(2, 6, 23, 0.55)" />

              {/* Haz de luz de farola */}
              <polygon points="346,104 380,92 380,132 346,118" fill="url(#headlightBeam)" />

              {/* Nubecitas cartoon del exhosto */}
              <g className="bus-exhaust-puff" style={{ transformOrigin: '20px 132px' }}>
                <circle cx="14" cy="133" r="6" fill="rgba(255,255,255,0.7)" />
                <circle cx="5" cy="128" r="4.5" fill="rgba(226,232,240,0.65)" />
              </g>

              {/* Carrocería principal blanca (Marcopolo G7) */}
              <g clipPath="url(#busShellClip)">
                <rect x="20" y="20" width="340" height="125" fill="url(#busBodyWhite)" />

                {/* Franja trasera azul Aerocondor */}
                <polygon points="20,48 92,48 76,142 20,142" fill="url(#busBlueTail)" />

                {/* Franja inferior gris/azul sutil */}
                <rect x="20" y="132" width="340" height="8" fill="#cbd5e1" />
                <rect x="240" y="131" width="118" height="7" fill="#0e3a8c" />

                {/* Ventanas panorámicas de pasajeros */}
                <path
                  d="M 32 42 L 268 38 Q 272 56 264 82 L 32 82 Z"
                  fill="url(#busGlass)"
                  stroke="#334155"
                  strokeWidth="1.5"
                />

                {/* Reflejos brillantes en ventanas */}
                <polygon points="56,42 74,42 62,82 44,82" fill="rgba(255,255,255,0.14)" />
                <polygon points="145,40 165,40 153,82 133,82" fill="rgba(255,255,255,0.12)" />
                <polygon points="222,39 236,39 224,82 210,82" fill="rgba(255,255,255,0.14)" />

                {/* Divisores sutiles de ventanas */}
                <line x1="94" y1="41" x2="94" y2="82" stroke="#0f172a" strokeWidth="2" />
                <line x1="154" y1="40" x2="154" y2="82" stroke="#0f172a" strokeWidth="2" />
                <line x1="214" y1="39" x2="214" y2="82" stroke="#0f172a" strokeWidth="2" />

                {/* Ventana lateral de cabina del conductor */}
                <path
                  d="M 276 38 L 310 38 Q 318 62 314 88 L 270 86 Q 278 60 276 38 Z"
                  fill="url(#busGlass)"
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
                  fill="url(#busGlass)"
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

                {/* Ala naranja/roja icónica de AEROCONDOR sobre la cola y ventana */}
                <g fill="#f97316">
                  {/* Plumas superiores */}
                  <path d="M 68 88 Q 76 62 84 44 Q 80 65 73 88 Z" />
                  <path d="M 72 88 Q 82 65 92 48 Q 86 68 77 88 Z" />
                  <path d="M 76 89 Q 88 68 98 54 Q 91 72 81 89 Z" />
                  <path d="M 80 90 Q 92 74 102 63 Q 94 78 85 90 Z" />
                  {/* Trazo curvo hacia abajo en el costado azul */}
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

                {/* Líneas de bodegas laterales */}
                <line x1="132" y1="112" x2="132" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="176" y1="112" x2="176" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="220" y1="112" x2="220" y2="136" stroke="#cbd5e1" strokeWidth="1.2" />
                <circle cx="154" cy="118" r="1.6" fill="#0e3a8c" />
                <circle cx="198" cy="118" r="1.6" fill="#0e3a8c" />

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
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
