import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferencias } from '../../context/PreferenciasContext';
import { ModalLogin, type ModoAuth } from '../auth/ModalLogin';
import { haySesionLocal } from '../../../infrastructure/api/httpClient';
import { millasApi, type ConfiguracionPublicaMillas } from '../../../infrastructure/api/millasApi';

/** Forma pública de un nivel (los rangos pueden no venir en versiones antiguas del backend). */
interface NivelPublico {
  id: string;
  nombre: string;
  minMillas?: number;
  maxMillas?: number | null;
  multiplicador: number;
  descuentoTiquetes: string;
  beneficios: string[];
}
import { ROUTES } from '../../../shared/constants';

/** Acabado "metálico" por nivel; si el nombre no coincide, se usa el del puesto. */
const ACABADOS: Record<string, string> = {
  bronce: 'linear-gradient(135deg,#b4743f 0%,#f1cfae 42%,#d29a68 70%,#b06d39 100%)',
  plata: 'linear-gradient(135deg,#9ea3aa 0%,#f4f5f7 42%,#c3c7cd 70%,#a2a7ae 100%)',
  oro: 'linear-gradient(135deg,#c8933a 0%,#fde9c4 42%,#e2b261 70%,#c8933a 100%)',
  platino: 'linear-gradient(135deg,#9c9cb3 0%,#f1f1f7 42%,#c1c1d3 70%,#9c9cb3 100%)',
};
const ORDEN_ACABADOS = ['bronce', 'plata', 'oro', 'platino'];

const acabadoDe = (nivel: NivelPublico, i: number) => {
  const clave = `${nivel.id} ${nivel.nombre}`.toLowerCase();
  const encontrado = ORDEN_ACABADOS.find((k) => clave.includes(k));
  return ACABADOS[encontrado ?? ORDEN_ACABADOS[Math.min(i, ORDEN_ACABADOS.length - 1)]];
};

const fmtNum = (n: number) => new Intl.NumberFormat('es-CO').format(n);
const fmtCop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * Sección del Inicio que explica el programa de millas y sus niveles.
 * Los datos salen de la configuración pública del programa (la misma que
 * administra el sistema interno), así que se actualiza sola.
 */
export function SeccionMillasHome() {
  const { idioma } = usePreferencias();
  const es = idioma === 'es';
  const navigate = useNavigate();
  const [niveles, setNiveles] = useState<NivelPublico[]>([]);
  const [config, setConfig] = useState<ConfiguracionPublicaMillas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [login, setLogin] = useState<ModoAuth | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([millasApi.obtenerNiveles(), millasApi.obtenerConfiguracionPublica()])
      .then(([n, c]) => {
        if (!activo) return;
        setNiveles(((n ?? []) as NivelPublico[]).toSorted((a, b) => (a.minMillas ?? 0) - (b.minMillas ?? 0)));
        setConfig(c ?? null);
      })
      .catch(() => { /* sin datos: la sección no se muestra */ })
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  if (!cargando && (niveles.length === 0 || config?.programaActivo === false)) return null;

  const pesosPorMilla = config?.pesosPorMilla ?? 100;
  const valorMilla = config?.valorMillaCop ?? 10;
  const bono = config?.bonoBienvenida ?? 0;
  const retornoBase = Math.round((valorMilla / pesosPorMilla) * 1000) / 10; // %

  const irAMillas = () => (haySesionLocal() ? navigate(ROUTES.MILLAS) : setLogin('registro'));

  const pasos = [
    { icono: 'confirmation_number', titulo: es ? 'Compra tu tiquete' : 'Buy your ticket', texto: es ? `Ganas 1 milla por cada ${fmtCop(pesosPorMilla)} que pagues.` : `Earn 1 mile for every ${fmtCop(pesosPorMilla)} you pay.` },
    { icono: 'trending_up', titulo: es ? 'Sube de nivel' : 'Level up', texto: es ? 'Entre más viajas, más beneficios y mejores multiplicadores.' : 'The more you travel, the more perks and multipliers.' },
    { icono: 'redeem', titulo: es ? 'Canjea tus millas' : 'Redeem your miles', texto: es ? `Cada milla vale ${fmtCop(valorMilla)} en pasajes y beneficios.` : `Each mile is worth ${fmtCop(valorMilla)} in tickets and perks.` },
  ];

  return (
    <section aria-labelledby="titulo-millas-home" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <h2 id="titulo-millas-home" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0e3a8c] dark:text-white">
            {es ? 'Conoce cómo ' : 'Learn how '}
            <span className="text-amber-500">{es ? 'se acumulan' : 'you earn'}</span>
            {es ? ' tus millas' : ' your miles'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            {config?.nombrePrograma ?? 'Millas Cootranar'}
            {niveles.length > 0 && (es ? ` · ${niveles.length} niveles para viajar con más beneficios` : ` · ${niveles.length} tiers with more perks`)}
          </p>
        </div>
        {retornoBase > 0 && (
          <div className="inline-flex items-center gap-2 self-start lg:self-auto rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-2.5">
            <span className="material-symbols-outlined text-amber-500">savings</span>
            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {es ? `Recupera hasta el ${retornoBase}% de cada compra en millas` : `Get back up to ${retornoBase}% of each purchase in miles`}
            </span>
          </div>
        )}
      </div>

      {/* Cómo funciona */}
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {pasos.map((p, i) => (
          <li key={p.titulo} className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-[#0e3a8c] dark:bg-blue-600 text-white flex items-center justify-center font-black">{i + 1}</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-amber-500">{p.icono}</span>
                {p.titulo}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Niveles */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${niveles.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
        {cargando
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-80 rounded-3xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />)
          : niveles.map((n, i) => {
              const rango = n.minMillas == null
                ? null
                : n.maxMillas != null && Number.isFinite(n.maxMillas)
                  ? `${fmtNum(n.minMillas)} – ${fmtNum(n.maxMillas)}`
                  : `${es ? 'Desde' : 'From'} ${fmtNum(n.minMillas)}`;
              return (
                <article
                  key={n.id}
                  className="relative overflow-hidden rounded-3xl p-6 shadow-[0_10px_30px_rgba(15,23,42,0.12)] text-[#0f2346] flex flex-col"
                  style={{ background: acabadoDe(n, i) }}
                >
                  <span className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/25 blur-2xl pointer-events-none" />
                  <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{es ? 'Nivel' : 'Tier'} {i + 1}</p>
                  <h3 className="text-3xl font-extrabold mt-1">{n.nombre}</h3>
                  {rango && <p className="text-sm font-semibold mt-1 opacity-80">{rango} {es ? 'millas' : 'miles'}</p>}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs font-bold bg-white/60 rounded-full px-2.5 py-1">x{Number(n.multiplicador).toFixed(2).replace(/\.?0+$/, '')} {es ? 'millas' : 'miles'}</span>
                    {n.descuentoTiquetes && n.descuentoTiquetes !== '0%' && (
                      <span className="text-xs font-bold bg-[#0f2346] text-white rounded-full px-2.5 py-1">
                        {n.descuentoTiquetes} {es ? 'dcto.' : 'off'}
                      </span>
                    )}
                  </div>

                  <p className="font-extrabold mt-5 mb-2">{es ? 'Beneficios' : 'Benefits'}</p>
                  <ul className="space-y-2.5">
                    {n.beneficios.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm leading-snug">
                        <span className="material-symbols-outlined shrink-0 text-[18px] text-amber-400 bg-[#0f2346] rounded-full p-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
      </div>

      {/* Llamado a la acción */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-amber-500">stars</span>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">
              {bono > 0
                ? (es ? `Regístrate y recibe ${fmtNum(bono)} millas de bienvenida` : `Sign up and get ${fmtNum(bono)} welcome miles`)
                : (es ? 'Empieza a acumular desde tu primer viaje' : 'Start earning from your first trip')}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {es ? 'Tus millas se suman automáticamente cada vez que compras con tu cuenta.' : 'Miles are added automatically every time you buy with your account.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={irAMillas}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[#0e3a8c] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/25 transition-all cursor-pointer shrink-0"
        >
          {haySesionLocal() ? (es ? 'Ver mis millas' : 'View my miles') : (es ? 'Unirme gratis' : 'Join for free')}
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>

      <ModalLogin
        abierto={login !== null}
        modoInicial={login ?? 'registro'}
        onCerrar={() => setLogin(null)}
        onExito={() => {
          setLogin(null);
          window.dispatchEvent(new Event('cootranar:sesion-iniciada'));
          navigate(ROUTES.MILLAS);
        }}
      />
    </section>
  );
}
