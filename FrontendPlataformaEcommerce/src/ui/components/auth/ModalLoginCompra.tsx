import { usePreferencias } from '../../context/PreferenciasContext';
import { ModalLogin } from './ModalLogin';

export interface ResumenViajeLogin {
  origen?: string;
  destino?: string;
  fecha?: string;
  hora?: string;
  asiento?: number | string;
}

interface ModalLoginCompraProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama tras iniciar sesión con éxito; quien abre el modal retoma la compra. */
  onExito: () => void;
  resumen?: ResumenViajeLogin;
}

/**
 * Login dentro del flujo de compra: el mismo modal general, con textos de
 * reserva y el resumen del viaje, para no sacar al cliente de la vista del bus.
 */
export function ModalLoginCompra({ abierto, onCerrar, onExito, resumen }: ModalLoginCompraProps) {
  const { esDark, idioma } = usePreferencias();
  const es = idioma === 'es';
  const tieneResumen = resumen && (resumen.origen || resumen.destino);

  return (
    <ModalLogin
      abierto={abierto}
      onCerrar={onCerrar}
      onExito={onExito}
      titulo={es ? 'Inicia sesión para reservar' : 'Sign in to book'}
      subtitulo={es
        ? 'Tu asiento te espera. Ingresa a tu cuenta para apartarlo y completar la compra.'
        : 'Your seat is waiting. Sign in to hold it and complete your purchase.'}
      textoBoton={es ? 'Iniciar sesión y continuar' : 'Sign in and continue'}
      encabezado={tieneResumen ? (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 mb-4 ${esDark ? 'bg-white/5 border-white/10' : 'bg-[#e8f0fe] border-blue-100'}`}>
          <span className="material-symbols-outlined text-[#0e3a8c] dark:text-blue-300 text-2xl">directions_bus</span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold truncate">
              {resumen?.origen} <span className="mx-1">→</span> {resumen?.destino}
            </p>
            <p className={`text-xs ${esDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {[resumen?.fecha, resumen?.hora].filter(Boolean).join(' · ')}
              {resumen?.asiento != null && <> · {es ? 'Asiento' : 'Seat'} {resumen.asiento}</>}
            </p>
          </div>
        </div>
      ) : undefined}
    />
  );
}
