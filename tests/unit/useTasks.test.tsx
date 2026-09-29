import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/types/task';

let emitData: (tasks: Task[]) => void = () => {};
let emitError: (error: Error) => void = () => {};
const unsubscribe = vi.fn();

vi.mock('@/services/tasks.service', () => ({
  subscribeToTasks: vi.fn((_uid: string, onData: typeof emitData, onError: typeof emitError) => {
    emitData = onData;
    emitError = onError;
    return unsubscribe;
  }),
  createTask: vi.fn().mockResolvedValue(undefined),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));

import * as service from '@/services/tasks.service';
import { useTasks } from '@/hooks/useTasks';

const task: Task = { id: 't1', userId: 'u1', title: 'Comprar yerba', description: '', completed: false, createdAt: 1 };

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('se suscribe con el uid y expone las tareas', () => {
    const { result } = renderHook(() => useTasks('u1'));
    expect(result.current.loading).toBe(true);
    expect(service.subscribeToTasks).toHaveBeenCalledWith('u1', expect.any(Function), expect.any(Function));

    act(() => emitData([task]));
    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toEqual([task]);
  });

  it('expone un mensaje de error si la suscripción falla', () => {
    const { result } = renderHook(() => useTasks('u1'));
    act(() => emitError(new Error('permission-denied')));
    expect(result.current.error).toBe('No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.');
    expect(result.current.loading).toBe(false);
  });

  it('delega las acciones CRUD al servicio', async () => {
    const { result } = renderHook(() => useTasks('u1'));
    await result.current.create({ title: 'Nueva', description: '' });
    await result.current.toggle('t1', true);
    await result.current.remove('t1');
    expect(service.createTask).toHaveBeenCalledWith('u1', { title: 'Nueva', description: '' });
    expect(service.updateTask).toHaveBeenCalledWith('t1', { completed: true });
    expect(service.deleteTask).toHaveBeenCalledWith('t1');
  });

  it('se desuscribe al desmontar', () => {
    const { unmount } = renderHook(() => useTasks('u1'));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
