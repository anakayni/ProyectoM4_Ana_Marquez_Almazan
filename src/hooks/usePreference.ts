import { useCallback, useState } from 'react';

/** Valor recordado en este navegador. Si el almacenamiento no está disponible, funciona igual sin recordar. */
export function usePreference<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null && (allowed as readonly string[]).includes(stored) ? (stored as T) : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Sin almacenamiento (modo privado estricto): solo se pierde el recuerdo.
      }
    },
    [key],
  );

  return [value, update];
}
