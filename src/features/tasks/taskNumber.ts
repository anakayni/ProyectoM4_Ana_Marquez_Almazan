/** Prefijo por defecto de los números de tarea (el admin lo cambia en Ajustes). */
export const TASK_PREFIX = 'MC';

export function formatTaskNumber(n: number, prefix = TASK_PREFIX): string {
  return `${prefix}-${n}`;
}
