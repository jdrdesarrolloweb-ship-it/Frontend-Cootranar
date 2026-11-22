export const mensajeError = (err: unknown, porDefecto: string) => {
  const e = err as { response?: { data?: { message?: string } }; code?: string };
  if (e?.code === 'ECONNABORTED') return 'La operación tardó demasiado. Revisa el resultado en la pestaña Backups antes de reintentar.';
  return e?.response?.data?.message || porDefecto;
};
