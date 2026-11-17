/**
 * Módulo de seguridad en cliente: Deshabilita la inspección y herramientas de desarrollo
 * 1. Bloqueo de menú contextual (clic derecho)
 * 2. Bloqueo de atajos de teclado (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S, Cmd+Opt+I/J/C)
 * 3. Trampa de depuración periódica (debugger) si se abre la consola desde el menú del navegador
 */
export function activarBloqueoInspeccion() {
  if (typeof window === 'undefined') return;

  // 1. Bloquear menú contextual (clic derecho)
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 2. Bloquear combinaciones de teclas usadas para inspección y ver código fuente
  window.addEventListener(
    'keydown',
    (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = (e.key || '').toUpperCase();

      // Ctrl + Shift + I/J/C/K (DevTools / Consola / Selector de elementos)
      if (isCtrlOrMeta && isShift && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Mac: Cmd + Option + I/J/C/U
      if (isCtrlOrMeta && isAlt && ['I', 'J', 'C', 'U'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U (Ver fuente) / Ctrl + S (Guardar página)
      if (isCtrlOrMeta && ['U', 'S'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 3. Trampa de depurador: si abren DevTools desde el menú de 3 puntos del navegador, se pausa la ejecución
  setInterval(() => {
    const start = performance.now();
    try {
      // constructor('debugger')() no genera errores en tiempo de compilación y se ejecuta solo si DevTools está abierto
      (function () {}).constructor('debugger')();
    } catch {
      /* noop */
    }
    const end = performance.now();
    if (end - start > 100) {
      try {
        console.clear();
      } catch {
        /* noop */
      }
    }
  }, 1000);
}
