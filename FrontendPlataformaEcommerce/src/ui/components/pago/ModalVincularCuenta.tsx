import { useState } from 'react';
import { httpClient } from '../../../infrastructure/api/httpClient';

export interface DatosVinculacion {
  documento: string;
  correoEnmascarado?: string | null;
  vinculable?: boolean;
}

interface Props {
  datos: DatosVinculacion;
  onCerrar: () => void;
  /** Se llama cuando las cuentas quedaron unidas y la sesión ya es la de la cuenta unificada. */
  onVinculado: () => void;
}

/**
 * La cédula ingresada ya pertenece a otra cuenta. Si es del mismo usuario, se le envía un
 * código al correo de esa cuenta y, al confirmarlo, ambas cuentas se unen en una sola.
 */
export function ModalVincularCuenta({ datos, onCerrar, onVinculado }: Props) {
  const [paso, setPaso] = useState<'preguntar' | 'codigo'>('preguntar');
  const [correo, setCorreo] = useState(datos.correoEnmascarado ?? '');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensajeError = (err: any, def: string) => err?.response?.data?.message || def;

  const enviarCodigo = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await httpClient.post('/auth/vincular-cuenta/solicitar', { documento: datos.documento });
      setCorreo(res.data?.data?.correoEnmascarado ?? correo);
      setPaso('codigo');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo enviar el código.'));
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!/^\d{6}$/.test(codigo.trim())) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await httpClient.post('/auth/vincular-cuenta/confirmar', { documento: datos.documento, codigo: codigo.trim() });
      const usuario = res.data?.data?.usuario;
      const token = res.data?.data?.token ?? res.data?.token;
      if (usuario) localStorage.setItem('usuario', JSON.stringify(usuario));
      if (token) localStorage.setItem('authToken', token);
      onVinculado();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo vincular la cuenta.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-transparent dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-blue-700 dark:text-blue-400">link</span>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Esta cédula ya tiene una cuenta</h2>
        </div>

        {datos.vinculable === false ? (
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
            La cédula <strong>{datos.documento}</strong> ya está registrada, pero esa cuenta no tiene correo para verificar
            que es tuya. Acércate a una taquilla Cootranar con tu documento para unificar tus cuentas.
          </p>
        ) : paso === 'preguntar' ? (
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
            La cédula <strong>{datos.documento}</strong> ya está registrada
            {correo ? <> con el correo <strong>{correo}</strong></> : null}. Si es tuya, te enviamos un código a ese correo para
            unir ambas cuentas en una sola: conservas tus viajes, millas y el inicio de sesión que usas ahora.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
              Escribe el código de 6 dígitos que enviamos a <strong>{correo}</strong>. Vence en 15 minutos.
            </p>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Código de verificación"
              className="w-full text-center tracking-[0.5em] text-2xl font-bold bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
            {datos.vinculable === false ? 'Entendido' : 'No es mía'}
          </button>
          {datos.vinculable !== false && (paso === 'preguntar' ? (
            <button type="button" onClick={enviarCodigo} disabled={cargando} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60">
              {cargando ? 'Enviando...' : 'Sí, es mía: enviar código'}
            </button>
          ) : (
            <>
              <button type="button" onClick={enviarCodigo} disabled={cargando} className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-400 disabled:opacity-60">
                Reenviar
              </button>
              <button type="button" onClick={confirmar} disabled={cargando || codigo.length !== 6} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60">
                {cargando ? 'Vinculando...' : 'Vincular cuentas'}
              </button>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
