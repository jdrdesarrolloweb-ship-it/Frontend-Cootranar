import type { ReactNode } from 'react';
import { C, FONT, botonIcono } from '../../components/millas/estilosMillas';

export const Modal = ({ titulo, icono, peligro, onCerrar, children, ancho = 640 }: {
  titulo: string; icono: string; peligro?: boolean; onCerrar: () => void; children: ReactNode; ancho?: number;
}) => (
  <div role="dialog" aria-modal="true" style={{
    position: 'fixed', inset: 0, background: 'rgba(11,28,48,0.55)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  }}>
    <div style={{
      background: '#fff', borderRadius: '14px', width: '100%', maxWidth: ancho, maxHeight: '90vh',
      overflow: 'auto', padding: '22px', fontFamily: FONT, border: `1px solid ${C.outlineVariant}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: peligro ? C.error : C.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined">{icono}</span>{titulo}
        </h2>
        <button onClick={onCerrar} aria-label="Cerrar" style={{ ...botonIcono, background: 'transparent' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const Aviso = ({ tipo, children }: { tipo: 'error' | 'ok' | 'warning' | 'info'; children: ReactNode }) => {
  const color = tipo === 'ok' ? C.success : tipo === 'warning' ? C.warning : tipo === 'info' ? C.secondary : C.error;
  const fondo = tipo === 'ok' ? C.successBg : tipo === 'warning' ? C.warningBg : tipo === 'info' ? C.surfaceContainerLow : C.errorBg;
  const icono = tipo === 'ok' ? 'check_circle' : tipo === 'warning' ? 'warning' : tipo === 'info' ? 'info' : 'error';
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '9px', background: fondo, color, fontSize: '13px',
      fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icono}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
