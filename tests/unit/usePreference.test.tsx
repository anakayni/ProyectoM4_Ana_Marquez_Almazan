import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePreference } from '@/hooks/usePreference';

const ALLOWED = ['mine', 'team'] as const;

describe('usePreference', () => {
  beforeEach(() => localStorage.clear());

  it('usa el valor inicial y recuerda el cambio', () => {
    const { result, unmount } = renderHook(() => usePreference('k', 'mine', ALLOWED));
    expect(result.current[0]).toBe('mine');
    act(() => result.current[1]('team'));
    unmount();
    const again = renderHook(() => usePreference('k', 'mine', ALLOWED));
    expect(again.result.current[0]).toBe('team');
  });

  it('ignora un valor guardado que ya no es válido', () => {
    localStorage.setItem('k', 'viejo');
    const { result } = renderHook(() => usePreference('k', 'mine', ALLOWED));
    expect(result.current[0]).toBe('mine');
  });
});
