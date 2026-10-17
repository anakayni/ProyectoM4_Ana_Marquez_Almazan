import { describe, expect, it } from 'vitest';
import { filterByPriority, filterByProject, searchTasks } from '@/features/tasks/searchTasks';
import type { Task } from '@/types/task';

const task = (number: number, title: string, extra: Partial<Task> = {}): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title, description: '', status: 'todo', assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
  ...extra,
});
const tasks = [
  task(108, 'Revisión de seguridad', { description: 'Cabeceras del login', priority: 'alta', projectId: 'p1' }),
  task(109, 'Plantilla de bienvenida', { priority: 'baja' }),
];
const ids = (list: Task[]) => list.map((t) => t.number);

describe('searchTasks', () => {
  it('sin texto devuelve todas', () => {
    expect(ids(searchTasks(tasks, '  '))).toEqual([108, 109]);
  });
  it('por título sin mayúsculas ni tildes', () => {
    expect(ids(searchTasks(tasks, 'REVISION'))).toEqual([108]);
  });
  it('por descripción', () => {
    expect(ids(searchTasks(tasks, 'login'))).toEqual([108]);
  });
  it('entiende el prefijo vigente', () => {
    expect(ids(searchTasks(tasks, 'fl-109', 'FL'))).toEqual([109]);
  });
  it('por número con o sin prefijo', () => {
    expect(ids(searchTasks(tasks, 'mc-109'))).toEqual([109]);
    expect(ids(searchTasks(tasks, '108'))).toEqual([108]);
  });
});

describe('filtros', () => {
  it('por prioridad', () => {
    expect(ids(filterByPriority(tasks, 'alta'))).toEqual([108]);
    expect(ids(filterByPriority(tasks, 'all'))).toEqual([108, 109]);
  });
  it('por proyecto, incluido "sin proyecto"', () => {
    expect(ids(filterByProject(tasks, 'p1'))).toEqual([108]);
    expect(ids(filterByProject(tasks, 'none'))).toEqual([109]);
    expect(ids(filterByProject(tasks, 'all'))).toEqual([108, 109]);
  });
});
