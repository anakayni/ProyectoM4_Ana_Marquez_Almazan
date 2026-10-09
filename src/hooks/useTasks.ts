import { useCallback, useEffect, useState } from 'react';
import { createTask, deleteTask, subscribeToTasks, updateTask } from '@/services/tasks.service';
import type { Task, TaskInput, TaskPatch, TaskStatus } from '@/types/task';

export const LOAD_ERROR = 'No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Tareas de todo el equipo en tiempo real + acciones CRUD.
 * `actorId` es quien hace los cambios: queda registrado en la auditoría.
 * No hace falta volver a pedir la lista tras crear/editar/borrar:
 * onSnapshot avisa cada cambio y la UI se actualiza sola.
 */
export function useTasks(actorId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    return subscribeToTasks(
      (next) => {
        setTasks(next);
        setLoading(false);
      },
      (err) => {
        // El usuario ve un mensaje amigable; en consola queda el error real para depurar.
        console.error('Error al escuchar tareas de Firestore:', err);
        setError(LOAD_ERROR);
        setLoading(false);
      },
    );
  }, [attempt]);

  // Reinicia el estado y fuerza una nueva suscripción (el efecto depende de `attempt`).
  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  const create = useCallback((input: TaskInput) => createTask(actorId, input), [actorId]);
  const update = useCallback((id: string, patch: TaskPatch) => updateTask(actorId, id, patch), [actorId]);
  const remove = useCallback((id: string) => deleteTask(actorId, id), [actorId]);
  const setStatus = useCallback((id: string, status: TaskStatus) => updateTask(actorId, id, { status }), [actorId]);

  return { tasks, loading, error, retry, create, update, remove, setStatus };
}
