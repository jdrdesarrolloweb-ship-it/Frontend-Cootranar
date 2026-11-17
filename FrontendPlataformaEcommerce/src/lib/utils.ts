/**
 * Une clases condicionales (convención `cn` de shadcn/ui).
 *
 * Versión sin dependencias: no resuelve conflictos de Tailwind como lo haría
 * `tailwind-merge`. Si más adelante se adopta shadcn completo, reemplazar por:
 *   import { clsx, type ClassValue } from 'clsx';
 *   import { twMerge } from 'tailwind-merge';
 *   export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
 */
export type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const clases: string[] = [];
  const agregar = (valor: ClassValue) => {
    if (!valor) return;
    if (typeof valor === 'string' || typeof valor === 'number') clases.push(String(valor));
    else if (Array.isArray(valor)) valor.forEach(agregar);
    else Object.entries(valor).forEach(([clase, activa]) => { if (activa) clases.push(clase); });
  };
  inputs.forEach(agregar);
  return clases.join(' ');
}
