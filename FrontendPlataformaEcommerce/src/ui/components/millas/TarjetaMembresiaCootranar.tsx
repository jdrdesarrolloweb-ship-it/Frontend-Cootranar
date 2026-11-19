import logoImg from '../../../assets/Logo.png.png';

export interface TarjetaMembresiaProps {
  nivelId?: string;
  nivelNombre: string;
  saldoMillasFormateado: string;
  titular: string;
  numeroSocio: string;
  etiquetaMillas: string;
  etiquetaTitular: string;
  etiquetaSocio: string;
}

interface MetallicTheme {
  baseBg: string;
  sheenBg: string;
  textPrimary: string;
  textSecondary: string;
  contactlessColor: string;
  logoFilter: string;
  tierTopGradient: string;
  tierSubColor: string;
  borderClass: string;
}

const getMetallicTheme = (nivelId: string = 'BRONCE'): MetallicTheme => {
  switch (nivelId.toUpperCase()) {
    case 'PLATINO':
      return {
        baseBg: 'linear-gradient(135deg, #3b4252 0%, #525c6e 28%, #6b7688 50%, #434b5c 76%, #2c3340 100%)',
        sheenBg: 'radial-gradient(ellipse at 32% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 48%, rgba(0,0,0,0.25) 100%)',
        textPrimary: 'text-slate-100',
        textSecondary: 'text-slate-300/90',
        contactlessColor: '#e2e8f0',
        logoFilter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.45)) brightness(1.12)',
        tierTopGradient: 'from-white via-slate-200 to-slate-400',
        tierSubColor: 'text-slate-200',
        borderClass: 'border-slate-400/50',
      };
    case 'ORO':
      return {
        baseBg: 'linear-gradient(135deg, #b8a47c 0%, #d5c5a1 28%, #e4d7b7 52%, #bfa97e 78%, #9c8860 100%)',
        sheenBg: 'radial-gradient(ellipse at 30% 22%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.06) 50%, rgba(60,45,15,0.18) 100%)',
        textPrimary: 'text-neutral-900',
        textSecondary: 'text-neutral-800/80',
        contactlessColor: '#262626',
        logoFilter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.45))',
        tierTopGradient: 'from-neutral-900 via-neutral-700 to-neutral-900',
        tierSubColor: 'text-neutral-800',
        borderClass: 'border-amber-200/70',
      };
    default: // BRONCE y PLATA: Acabado metálico plata cepillado estilo tarjeta Platinum
      return {
        baseBg: 'linear-gradient(135deg, #8e9296 0%, #aeb3b8 25%, #cfd3d7 48%, #a6abb0 72%, #7f8489 100%)',
        sheenBg: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.08) 46%, rgba(15,23,42,0.16) 100%)',
        textPrimary: 'text-neutral-900',
        textSecondary: 'text-neutral-800/80',
        contactlessColor: '#1f2328',
        logoFilter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.55))',
        tierTopGradient: 'from-white via-slate-100 to-slate-300',
        tierSubColor: 'text-white/95',
        borderClass: 'border-white/60',
      };
  }
};

export function TarjetaMembresiaCootranar({
  nivelId = 'BRONCE',
  nivelNombre,
  saldoMillasFormateado,
  titular,
  numeroSocio,
  etiquetaMillas,
  etiquetaTitular,
  etiquetaSocio,
}: TarjetaMembresiaProps) {
  const theme = getMetallicTheme(nivelId);

  return (
    <div
      className={`group relative overflow-hidden rounded-[22px] p-5 sm:p-6 border ${theme.borderClass} shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] flex flex-col justify-between aspect-[1.586/1] min-h-[245px] sm:min-h-[268px] select-none transition-transform duration-300 hover:-translate-y-0.5`}
      style={{ background: theme.baseBg }}
    >
      {/* Textura metálica granulada / cepillada */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.26] mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <filter id="cootranar-metal-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cootranar-metal-grain)" />
      </svg>

      {/* Brillo especular metálico */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: theme.sheenBg }}
      />

      {/* Destello diagonal sutil al pasar el cursor */}
      <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/25 to-transparent -rotate-25 translate-x-[-35%] group-hover:translate-x-[35%] transition-transform duration-1000 pointer-events-none" />

      {/* Trazos curvos de acento en el costado izquierdo con colores institucionales Cootranar (Azul, Rojo y Blanco) */}
      <svg
        viewBox="0 0 420 265"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {/* Trazo superior Azul Institucional Cootranar */}
        <path
          d="M 160 -8 C 165 25, 152 58, 128 78"
          stroke="#0e3a8c"
          strokeWidth="9.5"
          strokeLinecap="round"
        />
        {/* Trazo Blanco brillante superior */}
        <path
          d="M 152 12 C 148 45, 134 68, 110 86"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        {/* Trazo Rojo Corporativo Cootranar superior */}
        <path
          d="M 135 66 C 122 80, 108 92, 92 100"
          stroke="#c62828"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        {/* Trazo Azul Institucional detrás del chip hacia abajo */}
        <path
          d="M 60 128 C 40 148, 30 172, 24 196"
          stroke="#0e3a8c"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Trazo Blanco brillante inferior izquierdo */}
        <path
          d="M 46 140 C 26 168, 15 204, 14 238"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Trazo Rojo Corporativo Cootranar hacia el borde inferior */}
        <path
          d="M 28 184 C 18 214, 18 242, 30 272"
          stroke="#c62828"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>

      {/* ── Fila Superior: Tipo de Tarjeta + Logo Oficial Cootranar ── */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <span className={`text-[13px] font-semibold tracking-tight ${theme.textPrimary}`}>
            Club VIP
          </span>
        </div>

        {/* Logo Cootranar prominente integrado directamente sobre el metal */}
        <div className="flex flex-col items-end">
          <img
            src={logoImg}
            alt="Cootranar"
            className="h-10 sm:h-12 w-auto object-contain"
            style={{ filter: theme.logoFilter }}
          />
          <span className={`text-[9px] font-extrabold uppercase tracking-[0.18em] mt-0.5 ${theme.textSecondary}`}>
            Frequent Traveler
          </span>
        </div>
      </div>

      {/* ── Fila Central: Chip EMV Plateado + Contactless + Millas Disponibles ── */}
      <div className="relative z-10 flex items-center justify-between my-2">
        <div className="flex items-center gap-2.5 ml-3 sm:ml-4">
          {/* Chip EMV Metálico Realista */}
          <svg
            width="48"
            height="37"
            viewBox="0 0 54 42"
            fill="none"
            className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.28)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="emv-chip-grad" x1="0" y1="0" x2="54" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="35%" stopColor="#d1d5db" />
                <stop offset="68%" stopColor="#e5e7eb" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>
            </defs>
            <rect
              x="1"
              y="1"
              width="52"
              height="40"
              rx="6.5"
              fill="url(#emv-chip-grad)"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Líneas de contacto del chip */}
            <path d="M 1 14 H 18 M 1 28 H 18 M 36 14 H 53 M 36 28 H 53" stroke="#334155" strokeWidth="1" />
            <path d="M 18 1 V 41 M 36 1 V 41" stroke="#334155" strokeWidth="1" />
            <path
              d="M 27 4 C 21 4, 18 11, 18 21 C 18 31, 21 38, 27 38 C 33 38, 36 31, 36 21 C 36 11, 33 4, 27 4 Z"
              fill="url(#emv-chip-grad)"
              stroke="#334155"
              strokeWidth="1"
            />
            <circle cx="27" cy="9" r="1.3" fill="#334155" />
          </svg>

          {/* Icono Contactless NFC */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="opacity-85"
            aria-hidden="true"
          >
            <path d="M6.5 9.5C7.8 10.9 7.8 13.1 6.5 14.5" stroke={theme.contactlessColor} strokeWidth="2.1" strokeLinecap="round" />
            <path d="M10.2 7.2C12.6 9.8 12.6 14.2 10.2 16.8" stroke={theme.contactlessColor} strokeWidth="2.1" strokeLinecap="round" />
            <path d="M14 4.8C17.5 8.8 17.5 15.2 14 19.2" stroke={theme.contactlessColor} strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </div>

        {/* Saldo de Millas Disponibles */}
        <div className="text-right">
          <span className={`text-[9px] font-extrabold uppercase tracking-[0.16em] block ${theme.textSecondary}`}>
            {etiquetaMillas}
          </span>
          <div className="flex items-baseline justify-end gap-1 mt-0.5">
            <span className={`text-3xl sm:text-[34px] font-black leading-none tracking-tight ${theme.textPrimary} drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]`}>
              {saldoMillasFormateado}
            </span>
            <span className={`text-sm font-black uppercase ${theme.textSecondary}`}>
              pts
            </span>
          </div>
        </div>
      </div>

      {/* ── Fila Inferior: Titular + Socio N° (izq) | Nivel Metálico (der) ── */}
      <div className="relative z-10 flex items-end justify-between gap-2 pt-2">
        <div className="flex items-end gap-5 sm:gap-7 min-w-0">
          <div className="min-w-0">
            <span className={`text-[8.5px] font-bold uppercase tracking-[0.12em] leading-tight block ${theme.textSecondary}`}>
              {etiquetaTitular}
            </span>
            <span className={`text-xs sm:text-[13px] font-black uppercase tracking-wider truncate block mt-0.5 ${theme.textPrimary}`}>
              {titular}
            </span>
          </div>

          <div className="shrink-0">
            <span className={`text-[8.5px] font-bold uppercase tracking-[0.12em] leading-tight block ${theme.textSecondary}`}>
              {etiquetaSocio}
            </span>
            <span className={`text-xs sm:text-[13px] font-mono font-extrabold tracking-widest block mt-0.5 ${theme.textPrimary}`}>
              {numeroSocio}
            </span>
          </div>
        </div>

        {/* Emblema metálico inferior derecho (estilo VISA Platinum) */}
        <div className="text-right shrink-0">
          <span
            className={`block text-lg sm:text-xl font-black italic tracking-tight leading-none bg-gradient-to-b ${theme.tierTopGradient} bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] uppercase`}
          >
            {nivelNombre}
          </span>
          <span className={`block text-[10px] font-semibold tracking-wider mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${theme.tierSubColor}`}>
            Club Pasajero
          </span>
        </div>
      </div>
    </div>
  );
}
