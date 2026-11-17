import { Link, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { usePreferencias } from '../../context/PreferenciasContext';
import { useContenidoWeb } from '../../context/ContenidoWebContext';
import { ROUTES } from '../../../shared/constants';
import busCootranar from '../../../assets/busCootranar.png';

export type SeccionQuienesSomos =
  | 'mision-vision'
  | 'sistema-calidad'
  | 'transporte-pasajeros'
  | 'transporte-encomiendas';

interface SubmenuItem {
  id: SeccionQuienesSomos;
  path: string;
  labelEs: string;
  labelEn: string;
  icon: string;
}

export const SUBMENUS_QUIENES_SOMOS: SubmenuItem[] = [
  {
    id: 'mision-vision',
    path: ROUTES.QUIENES_SOMOS_MISION_VISION,
    labelEs: 'Misión Visión',
    labelEn: 'Mission & Vision',
    icon: 'flag',
  },
  {
    id: 'sistema-calidad',
    path: ROUTES.QUIENES_SOMOS_CALIDAD,
    labelEs: 'Sistema de Calidad',
    labelEn: 'Quality System',
    icon: 'verified',
  },
  {
    id: 'transporte-pasajeros',
    path: ROUTES.QUIENES_SOMOS_PASAJEROS,
    labelEs: 'Transporte de Pasajeros',
    labelEn: 'Passenger Transport',
    icon: 'directions_bus',
  },
  {
    id: 'transporte-encomiendas',
    path: ROUTES.QUIENES_SOMOS_ENCOMIENDAS,
    labelEs: 'Transporte de Encomiendas',
    labelEn: 'Parcel Transport',
    icon: 'local_shipping',
  },
];

const COMPROMISOS_CALIDAD = [
  {
    icon: 'trending_up',
    textoEs: 'Mejora continua e innovación.',
    textoEn: 'Continuous improvement and innovation.',
  },
  {
    icon: 'favorite',
    textoEs: 'Empatía para satisfacer las necesidades de nuestros clientes.',
    textoEn: 'Empathy to meet the needs of our customers.',
  },
  {
    icon: 'fact_check',
    textoEs: 'Control de los procedimientos para conseguir el mejor rendimiento.',
    textoEn: 'Procedure control to achieve the best performance.',
  },
  {
    icon: 'groups',
    textoEs: 'Trabajo en equipo para conseguir nuestros objetivos.',
    textoEn: 'Teamwork to achieve our goals.',
  },
  {
    icon: 'school',
    textoEs: 'Formación continua y aprendizaje de nuestro equipo humano.',
    textoEn: 'Continuous training and learning of our human team.',
  },
  {
    icon: 'handshake',
    textoEs: 'Fomento del trabajo en equipo y trato respetuoso.',
    textoEn: 'Promoting teamwork and respectful treatment.',
  },
  {
    icon: 'balance',
    textoEs: 'Comportamiento ético.',
    textoEn: 'Ethical behavior.',
  },
  {
    icon: 'eco',
    textoEs: 'Minimizar el impacto con nuestro medio ambiente.',
    textoEn: 'Minimizing the impact on our environment.',
  },
];

const OBJETIVOS_CALIDAD = [
  {
    icon: 'sentiment_very_satisfied',
    textoEs: 'Incrementar el grado de satisfacción de los clientes de Cootranar Ltda.',
    textoEn: 'Increase the level of customer satisfaction at Cootranar Ltda.',
  },
  {
    icon: 'schedule',
    textoEs: 'Mantener el nivel de oportunidad de servicio.',
    textoEn: 'Maintain the level of service timeliness.',
  },
  {
    icon: 'airline_seat_recline_extra',
    textoEs: 'Incrementar el confort del servicio prestado.',
    textoEn: 'Increase the comfort of the service provided.',
  },
  {
    icon: 'workspace_premium',
    textoEs: 'Incrementar el grado de competencias del personal.',
    textoEn: 'Increase the competency level of staff.',
  },
  {
    icon: 'build_circle',
    textoEs: 'Ejecutar el plan de mantenimiento de infraestructura.',
    textoEn: 'Execute the infrastructure maintenance plan.',
  },
  {
    icon: 'autorenew',
    textoEs: 'Mejorar continuamente los procesos de Cootranar Ltda.',
    textoEn: 'Continuously improve the processes of Cootranar Ltda.',
  },
];

interface FlotaItem {
  nombre: string;
  subtituloEs: string;
  subtituloEn: string;
  icon: string;
  destacado?: boolean;
  caracteristicasEs: { icon: string; texto: string }[];
  caracteristicasEn: { icon: string; texto: string }[];
}

const FLOTA_PASAJEROS: FlotaItem[] = [
  {
    nombre: 'Aerocondor - Supercondor',
    subtituloEs: 'Bus de Lujo',
    subtituloEn: 'Luxury Bus',
    icon: 'directions_bus',
    destacado: true,
    caracteristicasEs: [
      { icon: 'groups', texto: 'Capacidad para 38 pasajeros' },
      { icon: 'ac_unit', texto: 'Aire acondicionado' },
      { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
      { icon: 'power', texto: 'Tomacorriente' },
      { icon: 'wifi', texto: 'GPS, WIFI' },
      { icon: 'wc', texto: '1 Baño' },
      { icon: 'route', texto: 'Origen - Destino (paradas en los Terminales de Transporte y agencias de la empresa)' },
      { icon: 'badge', texto: 'Dos conductores profesionales' },
    ],
    caracteristicasEn: [
      { icon: 'groups', texto: 'Capacity for 38 passengers' },
      { icon: 'ac_unit', texto: 'Air conditioning' },
      { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
      { icon: 'power', texto: 'Power outlets' },
      { icon: 'wifi', texto: 'GPS, WIFI' },
      { icon: 'wc', texto: '1 Restroom' },
      { icon: 'route', texto: 'Origin - Destination (stops at Transport Terminals and company agencies)' },
      { icon: 'badge', texto: 'Two professional drivers' },
    ],
  },
  {
    nombre: 'Busetas - Microbuses',
    subtituloEs: 'Servicio Intermunicipal y Regional',
    subtituloEn: 'Intermunicipal & Regional Service',
    icon: 'airport_shuttle',
    caracteristicasEs: [
      { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
      { icon: 'gps_fixed', texto: 'GPS' },
      { icon: 'wifi', texto: 'WIFI' },
      { icon: 'wc', texto: '1 Baño (únicamente en busetas)' },
      { icon: 'pin_drop', texto: 'Origen - Destino (realiza paradas en la vía)' },
      { icon: 'badge', texto: 'Dos conductores profesionales' },
    ],
    caracteristicasEn: [
      { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
      { icon: 'gps_fixed', texto: 'GPS' },
      { icon: 'wifi', texto: 'WIFI' },
      { icon: 'wc', texto: '1 Restroom (busetas only)' },
      { icon: 'pin_drop', texto: 'Origin - Destination (makes stops along the route)' },
      { icon: 'badge', texto: 'Two professional drivers' },
    ],
  },
  {
    nombre: 'Camionetas',
    subtituloEs: 'Servicio Ágil y Confiable',
    subtituloEn: 'Agile & Reliable Service',
    icon: 'local_taxi',
    caracteristicasEs: [
      { icon: 'gps_fixed', texto: 'GPS' },
      { icon: 'wifi', texto: 'WIFI' },
    ],
    caracteristicasEn: [
      { icon: 'gps_fixed', texto: 'GPS' },
      { icon: 'wifi', texto: 'WIFI' },
    ],
  },
  {
    nombre: 'Aerovans',
    subtituloEs: 'Confort Ejecutivo',
    subtituloEn: 'Executive Comfort',
    icon: 'rv_hookup',
    caracteristicasEs: [
      { icon: 'airline_seat_recline_extra', texto: 'Sillas reclinables' },
      { icon: 'wifi', texto: 'GPS, WIFI' },
    ],
    caracteristicasEn: [
      { icon: 'airline_seat_recline_extra', texto: 'Reclining seats' },
      { icon: 'wifi', texto: 'GPS, WIFI' },
    ],
  },
];

const OFICINAS_ENCOMIENDAS = [
  {
    ciudad: 'Pasto',
    sedeEs: 'Avenida Champagnat',
    sedeEn: 'Champagnat Avenue',
    direccion: 'Carrera 14 No. 13-26 Avenida Champagnat',
    celular: '314 814 1852',
    telHref: 'tel:+573148141852',
  },
  {
    ciudad: 'Pasto',
    sedeEs: 'Terminal de Transportes',
    sedeEn: 'Transport Terminal',
    direccion: 'Terminal de Transportes de Pasto',
    celular: '314 830 08 61',
    telHref: 'tel:+573148300861',
  },
  {
    ciudad: 'Cali',
    sedeEs: 'Terminal de Transportes',
    sedeEn: 'Transport Terminal',
    direccion: 'Terminal de Transportes de Cali',
    celular: '314 830 0863',
    telHref: 'tel:+573148300863',
  },
  {
    ciudad: 'Cali',
    sedeEs: 'C.C. Las Américas',
    sedeEn: 'Las Américas Mall',
    direccion: 'Carrera 5 No. 16-33 C.C. Las Américas',
    celular: '318 200 3495',
    telHref: 'tel:+573182003495',
  },
  {
    ciudad: 'Popayán',
    sedeEs: 'Barrio Santa Clara',
    sedeEn: 'Santa Clara Neighborhood',
    direccion: 'Calle 7N No. 9-46 Barrio Santa Clara',
    celular: '310 238 0733',
    telHref: 'tel:+573102380733',
  },
  {
    ciudad: 'Ipiales',
    sedeEs: 'Terminal de Transportes',
    sedeEn: 'Transport Terminal',
    direccion: 'Terminal de Transportes Nivel 2 Local 2',
    celular: '314 814 1846',
    telHref: 'tel:+573148141846',
  },
  {
    ciudad: 'Tumaco',
    sedeEs: 'Calle Las Mercedes',
    sedeEn: 'Las Mercedes Street',
    direccion: 'Calle Las Mercedes',
    celular: '314 814 1851',
    telHref: 'tel:+573148141851',
  },
];

const RUTAS_ENCOMIENDAS = [
  'Ipiales – Pasto y viceversa',
  'Ipiales – Cali y viceversa',
  'Pasto – La Unión y viceversa',
  'Pasto – Popayán y viceversa',
  'Pasto – Cali y viceversa',
  'Pasto – Tumaco y viceversa',
  'Tumaco - Pasto – Cali y viceversa',
];

export function QuienesSomosPage() {
  const { seccion } = useParams<{ seccion?: string }>();
  const navigate = useNavigate();
  const { idioma } = usePreferencias();
  const { contenido } = useContenidoWeb();
  const es = idioma === 'es';
  const qs = contenido.quienesSomos;
  const compromisosCalidad = qs?.misionVision?.compromisos?.length ? qs.misionVision.compromisos : COMPROMISOS_CALIDAD;
  const objetivosCalidad = qs?.sistemaCalidad?.objetivos?.length ? qs.sistemaCalidad.objetivos : OBJETIVOS_CALIDAD;
  const flotaPasajeros = qs?.transportePasajeros?.flota?.length ? qs.transportePasajeros.flota : FLOTA_PASAJEROS;
  const oficinasEncomiendas = qs?.transporteEncomiendas?.oficinas?.length
    ? qs.transporteEncomiendas.oficinas.map((o) => ({
        ...o,
        telHref: `tel:+57${o.celular.replace(/\D/g, '')}`,
      }))
    : OFICINAS_ENCOMIENDAS;
  const rutasEncomiendas = qs?.transporteEncomiendas?.rutas?.length
    ? qs.transporteEncomiendas.rutas
    : RUTAS_ENCOMIENDAS;

  const seccionActiva: SeccionQuienesSomos =
    SUBMENUS_QUIENES_SOMOS.find((s) => s.id === seccion)?.id ?? 'mision-vision';

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 transition-colors duration-200">
      <Navbar />

      {/* Encabezado institucional con el bus de Cootranar de fondo */}
      <section className="relative overflow-hidden bg-[#06183d] text-white">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={busCootranar}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[62%_42%]"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06183d]/92 via-[#06183d]/60 to-[#06183d]/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06183d]/80 via-transparent to-[#06183d]/30" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-extrabold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-base text-sky-300">corporate_fare</span>
            {es ? qs.encabezado.etiquetaEs : qs.encabezado.etiquetaEn}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight max-w-2xl leading-tight">
            {es ? qs.encabezado.tituloEs : qs.encabezado.tituloEn}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-100/90 max-w-2xl leading-relaxed">
            {es ? qs.encabezado.subtituloEs : qs.encabezado.subtituloEn}
          </p>
        </div>
      </section>

      {/* Barra de los 4 submenús de Quiénes Somos */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 -mt-7 relative z-20">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SUBMENUS_QUIENES_SOMOS.map((item) => {
            const activo = seccionActiva === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activo
                    ? 'bg-gradient-to-r from-[#0e3a8c] to-[#1d4ed8] text-white shadow-md shadow-blue-900/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-[#0e3a8c] dark:hover:text-white'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl shrink-0 ${
                    activo ? 'text-sky-300' : 'text-[#0e3a8c] dark:text-blue-400'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{es ? item.labelEs : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido dinámico según el submenú seleccionado */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* ===============================================================
            1. MISIÓN Y VISIÓN
           =============================================================== */}
        {seccionActiva === 'mision-vision' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#c62828] dark:text-red-400">
                  {es ? 'Nuestra Identidad Corporativa' : 'Our Corporate Identity'}
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1">
                  {es ? 'Misión y Visión' : 'Mission & Vision'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/50 text-xs font-bold text-[#0e3a8c] dark:text-blue-300 self-start sm:self-auto">
                <span className="material-symbols-outlined text-base">location_on</span>
                {es ? 'Orgullosamente Nariñenses' : 'Proudly from Nariño'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Misión */}
              <article className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-9 shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0e3a8c] via-[#1d4ed8] to-sky-400" />
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-[#0e3a8c] dark:text-blue-400 shadow-sm">
                      <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                      01 · {es ? 'Propósito' : 'Purpose'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                    {es ? 'Misión' : 'Mission'}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-300 text-base sm:text-[17px] leading-relaxed font-medium">
                    {es ? qs.misionVision.misionEs : qs.misionVision.misionEn}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2">
                  {[
                    es ? 'Servicio cómodo' : 'Comfortable service',
                    es ? 'Seguridad vial' : 'Road safety',
                    es ? 'Calidad humana' : 'Human warmth',
                    es ? 'Bienestar social' : 'Social well-being',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/80 dark:bg-slate-700 text-[#0e3a8c] dark:text-blue-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>

              {/* Visión */}
              <article className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-9 shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c62828] via-red-500 to-amber-500" />
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-[#c62828] dark:text-red-400 shadow-sm">
                      <span className="material-symbols-outlined text-3xl">visibility</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                      02 · {es ? 'Proyección Nacional' : 'National Projection'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                    {es ? 'Visión' : 'Vision'}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-300 text-base sm:text-[17px] leading-relaxed font-medium">
                    {es ? qs.misionVision.visionEs : qs.misionVision.visionEn}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2">
                  {[
                    es ? 'Liderazgo regional' : 'Regional leadership',
                    es ? 'Cobertura nacional' : 'National coverage',
                    es ? 'Excelencia en servicio' : 'Service excellence',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-red-50/80 dark:bg-slate-700 text-[#c62828] dark:text-red-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            </div>

            {/* Bloque de Compromiso y Principios */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-10 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
              <div className="max-w-3xl mb-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#0e3a8c] dark:text-blue-400 mb-2">
                  <span className="material-symbols-outlined text-base">verified</span>
                  {es ? 'Nuestro Compromiso' : 'Our Commitment'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {es ? qs.misionVision.compromisosTituloEs : qs.misionVision.compromisosTituloEn}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {compromisosCalidad.map((item, index) => (
                  <div
                    key={item.textoEs}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/70 p-5 flex flex-col gap-3 hover:border-[#0e3a8c]/40 dark:hover:border-blue-500/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#0e3a8c]/10 dark:bg-blue-500/15 text-[#0e3a8c] dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      </div>
                      <span className="text-xs font-black text-slate-300 dark:text-slate-600">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {es ? item.textoEs : item.textoEn}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ===============================================================
            2. SISTEMA DE CALIDAD
           =============================================================== */}
        {seccionActiva === 'sistema-calidad' && (
          <div className="space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0e3a8c] dark:text-blue-400">
                  {es ? 'Gestión y Mejoramiento Continuo' : 'Management & Continuous Improvement'}
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1">
                  {es ? 'Sistema de Calidad' : 'Quality System'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
                <span className="material-symbols-outlined text-base">verified</span>
                COOTRANAR LTDA.
              </div>
            </div>

            {/* POLÍTICA */}
            <article className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-10 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0e3a8c] via-[#1d4ed8] to-[#c62828]" />
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-[#0e3a8c] dark:text-blue-400 shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-3xl">policy</span>
                </div>
                <div className="space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-blue-50 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-300">
                    {es ? 'Política de Calidad' : 'Quality Policy'}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {es ? 'POLÍTICA' : 'POLICY'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed font-medium">
                    {es ? qs.sistemaCalidad.politicaEs : qs.sistemaCalidad.politicaEn}
                  </p>
                </div>
              </div>
            </article>

            {/* OBJETIVOS */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-10 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
              <div className="mb-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#c62828] dark:text-red-400 mb-1">
                  <span className="material-symbols-outlined text-base">track_changes</span>
                  {es ? 'Metas Institucionales' : 'Institutional Goals'}
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {es ? 'OBJETIVOS' : 'OBJECTIVES'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {objetivosCalidad.map((obj, index) => (
                  <div
                    key={obj.textoEs}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/70 p-6 flex flex-col justify-between gap-4 hover:border-[#0e3a8c]/40 dark:hover:border-blue-500/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#0e3a8c]/10 dark:bg-blue-500/15 text-[#0e3a8c] dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">{obj.icon}</span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      {es ? obj.textoEs : obj.textoEn}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ===============================================================
            3. TRANSPORTE DE PASAJEROS
           =============================================================== */}
        {seccionActiva === 'transporte-pasajeros' && (
          <div className="space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0e3a8c] dark:text-blue-400">
                  {es ? 'Parque Automotor y Servicio' : 'Fleet & Service'}
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1">
                  {es ? 'Transporte de Pasajeros' : 'Passenger Transport'}
                </h2>
              </div>
              <Link
                to={ROUTES.VIAJES}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0e3a8c] hover:bg-blue-900 text-white text-sm font-bold shadow-md shadow-blue-900/20 transition-all self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-lg">confirmation_number</span>
                {es ? 'Buscar viajes y comprar tiquetes' : 'Search trips & buy tickets'}
              </Link>
            </div>

            {/* Descripción del parque automotor y selección de personal */}
            <article className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-10 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0e3a8c] via-[#1d4ed8] to-sky-400" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-300">
                    <span className="material-symbols-outlined text-base">verified_user</span>
                    {es ? 'Revisión Técnico-Mecánica y Talento Humano' : 'Technical Inspection & Certified Staff'}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-base sm:text-[17px] leading-relaxed font-medium">
                    {es ? qs.transportePasajeros.parrafo1Es : qs.transportePasajeros.parrafo1En}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200 text-base sm:text-[17px] leading-relaxed font-bold">
                    {es ? qs.transportePasajeros.parrafo2Es : qs.transportePasajeros.parrafo2En}
                  </p>
                </div>

                <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                  {[
                    { icon: 'handyman', labelEs: 'Taller de Mantenimiento Propio', labelEn: 'In-house Maintenance Workshop' },
                    { icon: 'fact_check', labelEs: 'CDA Autorizados', labelEn: 'Authorized Diagnostic Centers' },
                    { icon: 'badge', labelEs: 'Conductores Certificados', labelEn: 'Certified Drivers' },
                    { icon: 'gps_fixed', labelEs: 'Monitoreo GPS y WIFI', labelEn: 'GPS Monitoring & WIFI' },
                  ].map((b) => (
                    <div
                      key={b.labelEs}
                      className="rounded-2xl bg-[#f8fafc] dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-700 p-4 flex flex-col items-center text-center gap-2"
                    >
                      <span className="material-symbols-outlined text-2xl text-[#0e3a8c] dark:text-blue-400">
                        {b.icon}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 leading-tight">
                        {es ? b.labelEs : b.labelEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Tarjetas de las 4 líneas de vehículos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flotaPasajeros.map((vehiculo) => {
                const items = es ? vehiculo.caracteristicasEs : vehiculo.caracteristicasEn;
                return (
                  <article
                    key={vehiculo.nombre}
                    className={`rounded-3xl p-7 sm:p-8 border transition-all flex flex-col justify-between ${
                      vehiculo.destacado
                        ? 'bg-gradient-to-br from-[#06183d] to-[#0e3a8c] text-white border-blue-800 shadow-xl'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-700/80 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2 ${
                              vehiculo.destacado
                                ? 'bg-white/15 text-sky-300 border border-white/20'
                                : 'bg-blue-50 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-300'
                            }`}
                          >
                            {es ? vehiculo.subtituloEs : vehiculo.subtituloEn}
                          </span>
                          <h3 className="text-2xl font-black tracking-tight">{vehiculo.nombre}</h3>
                        </div>
                        <div
                          className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${
                            vehiculo.destacado
                              ? 'bg-white/10 text-sky-300 border border-white/20'
                              : 'bg-blue-50 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-3xl">{vehiculo.icon}</span>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {items.map((car) => (
                          <li key={car.texto} className="flex items-start gap-3 text-sm sm:text-[15px] font-semibold">
                            <span
                              className={`material-symbols-outlined text-lg mt-0.5 shrink-0 ${
                                vehiculo.destacado ? 'text-sky-300' : 'text-[#0e3a8c] dark:text-blue-400'
                              }`}
                            >
                              {car.icon}
                            </span>
                            <span className={vehiculo.destacado ? 'text-blue-50' : 'text-slate-700 dark:text-slate-200'}>
                              {car.texto}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* ===============================================================
            4. TRANSPORTE DE ENCOMIENDAS Y CARGA
           =============================================================== */}
        {seccionActiva === 'transporte-encomiendas' && (
          <div className="space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#c62828] dark:text-red-400">
                  {es ? 'Logística Regional y Nacional' : 'Regional & National Logistics'}
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1">
                  {es ? 'Transporte de Encomiendas y Carga' : 'Parcel & Cargo Transport'}
                </h2>
              </div>
              <Link
                to={ROUTES.ENCOMIENDAS}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0e3a8c] hover:bg-blue-900 text-white text-sm font-bold shadow-md shadow-blue-900/20 transition-all self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                {es ? 'Ir al módulo de encomiendas' : 'Go to parcels module'}
              </Link>
            </div>

            {/* Presentación */}
            <article className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-9 shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c62828] via-[#0e3a8c] to-[#1d4ed8]" />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-[#0e3a8c] dark:text-blue-400 shrink-0">
                <span className="material-symbols-outlined text-3xl">inventory_2</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-base sm:text-lg leading-relaxed font-semibold">
                {es ? qs.transporteEncomiendas.descripcionEs : qs.transporteEncomiendas.descripcionEn}
              </p>
            </article>

            {/* Oficinas y Rutas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Oficinas (7 agencias) */}
              <section className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#0e3a8c] dark:text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">storefront</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {es ? 'Oficinas' : 'Offices'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {es ? 'Puntos de recepción y entrega de encomiendas' : 'Parcel reception and delivery points'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {oficinasEncomiendas.map((oficina) => (
                    <div
                      key={`${oficina.ciudad}-${oficina.direccion}`}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/70 p-4 flex flex-col justify-between gap-3 hover:border-[#0e3a8c]/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#0e3a8c] text-white">
                            {oficina.ciudad}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                            {es ? oficina.sedeEs : oficina.sedeEn}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 leading-snug">
                          {oficina.direccion}
                        </p>
                      </div>

                      <a
                        href={oficina.telHref}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0e3a8c] dark:text-blue-400 hover:underline pt-2 border-t border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                        Cel. {oficina.celular}
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              {/* Rutas */}
              <section className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-7 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#c62828] dark:text-red-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">alt_route</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {es ? 'Rutas' : 'Routes'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {es ? 'Cobertura permanente de ida y regreso' : 'Permanent round-trip coverage'}
                    </p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {rutasEncomiendas.map((ruta) => (
                    <li
                      key={ruta}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/70 px-4 py-3.5 flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-xl text-[#0e3a8c] dark:text-blue-400 shrink-0">
                        sync_alt
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {ruta}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </main>

      <CinematicFooter />
    </div>
  );
}
