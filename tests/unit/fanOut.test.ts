import { describe, expect, it, vi } from 'vitest';
import { subscribeFanOut } from '@/utils/fanOut';

describe('subscribeFanOut', () => {
  it('une los resultados de cada fuente y sigue los cambios de la lista', () => {
    let emitKeys: (keys: string[]) => void = () => {};
    const emitters = new Map<string, (items: string[]) => void>();
    const unsubs = new Map<string, ReturnType<typeof vi.fn>>();
    const onData = vi.fn();
    subscribeFanOut<string>(
      (onKeys) => {
        emitKeys = onKeys;
        return () => {};
      },
      (key, onItems) => {
        emitters.set(key, onItems);
        const unsub = vi.fn();
        unsubs.set(key, unsub);
        return unsub;
      },
      onData,
      vi.fn(),
    );

    emitKeys(['a', 'b']);
    emitters.get('a')!(['a1']);
    expect(onData).not.toHaveBeenCalled(); // falta "b"
    emitters.get('b')!(['b1', 'b2']);
    expect(onData).toHaveBeenLastCalledWith(['a1', 'b1', 'b2']);

    emitKeys(['b']);
    expect(unsubs.get('a')).toHaveBeenCalled();
    expect(onData).toHaveBeenLastCalledWith(['b1', 'b2']);
  });

  it('sin fuentes entrega una lista vacía', () => {
    const onData = vi.fn();
    subscribeFanOut<string>((onKeys) => (onKeys([]), () => {}), () => () => {}, onData, vi.fn());
    expect(onData).toHaveBeenCalledWith([]);
  });

  it('al cancelar, cancela todo', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const stop = subscribeFanOut<string>((onKeys) => (onKeys(['a']), outer), () => inner, vi.fn(), vi.fn());
    stop();
    expect(outer).toHaveBeenCalled();
    expect(inner).toHaveBeenCalled();
  });
});
