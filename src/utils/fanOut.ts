type Unsubscribe = () => void;
type OnError = (error: Error) => void;

/**
 * Escucha una lista de fuentes que cambia con el tiempo (p. ej. los proyectos del Invitado)
 * y, por cada una, sus elementos (p. ej. sus tareas). Entrega todo junto cuando cada fuente respondió.
 */
export function subscribeFanOut<T>(
  subscribeKeys: (onKeys: (keys: string[]) => void, onError: OnError) => Unsubscribe,
  subscribeOne: (key: string, onItems: (items: T[]) => void, onError: OnError) => Unsubscribe,
  onData: (items: T[]) => void,
  onError: OnError,
): Unsubscribe {
  const sources = new Map<string, { stop: Unsubscribe; items: T[] | null }>();

  function emit() {
    const all = [...sources.values()];
    if (all.some((s) => s.items === null)) return;
    onData(all.flatMap((s) => s.items as T[]));
  }

  const stopKeys = subscribeKeys((keys) => {
    for (const [key, source] of sources) {
      if (!keys.includes(key)) {
        source.stop();
        sources.delete(key);
      }
    }
    for (const key of keys) {
      if (sources.has(key)) continue;
      const source: { stop: Unsubscribe; items: T[] | null } = { stop: () => {}, items: null };
      sources.set(key, source);
      source.stop = subscribeOne(key, (items) => {
        source.items = items;
        emit();
      }, onError);
    }
    emit();
  }, onError);

  return () => {
    stopKeys();
    sources.forEach((s) => s.stop());
    sources.clear();
  };
}
