/** Prefijo de los números de tarea (en la etapa 8 se podrá cambiar desde Ajustes). */
export const TASK_PREFIX = 'MC';

export function formatTaskNumber(n: number): string {
  return `${TASK_PREFIX}-${n}`;
}
