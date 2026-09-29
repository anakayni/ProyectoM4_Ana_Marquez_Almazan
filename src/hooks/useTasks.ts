import { useCallback, useEffect, useState } from 'react';
import { createTask, deleteTask, subscribeToTasks, updateTask } from '@/services/tasks.service';
import type { Task, TaskInput, TaskPatch } from '@/types/task';

export const LOAD_ERROR = 'No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Tareas del usuario en tiempo real + acciones CRUD.
 * No hace falta volver a pedir la lista tras crear/editar/borrar:
 * onSnapshot avisa cada cambio y la UI se actualiza sola.
 */
export function useTasks(uid: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    return subscribeToTasks(
      uid,
      (next) => {
        setTasks(next);
        setLoading(false);
      },
      () => {
        setError(LOAD_ERROR);
        setLoading(false);
      },
    );
  }, [uid, attempt]);

  // Reinicia el estado y fuerza una nueva suscripción (el efecto depende de `attempt`).
  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  const create = useCallback((input: TaskInput) => createTask(uid, input), [uid]);
  const update = useCallback((id: string, patch: TaskPatch) => updateTask(id, patch), []);
  const remove = useCallback((id: string) => deleteTask(id), []);
  const toggle = useCallback((id: string, completed: boolean) => updateTask(id, { completed }), []);

  return { tasks, loading, error, retry, create, update, remove, toggle };
}
