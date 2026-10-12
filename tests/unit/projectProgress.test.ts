import { describe, expect, it } from 'vitest';
import { projectProgress } from '@/features/projects/projectProgress';
import type { Task, TaskStatus } from '@/types/task';

const t = (status: TaskStatus): Task => ({
  id: Math.random().toString(), createdBy: 'x', updatedBy: 'x', rev: 1, title: 't', description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: 'p', priority: 'media', dueDate: null, createdAt: 1,
});
const tasks = [t('done'), t('done'), t('done'), t('done'), t('doing'), t('doing'), t('doing'), t('todo'), t('todo'), t('todo')];

describe('projectProgress', () => {
  it('porcentaje por tareas hechas y detalle por estado', () => {
    expect(projectProgress(tasks, '2026-12-01', '2026-10-12')).toEqual({ total: 10, todo: 3, doing: 3, done: 4, percent: 40, late: false });
  });
  it('atrasado si pasó la fecha de fin sin terminar', () => {
    expect(projectProgress(tasks, '2026-10-11', '2026-10-12').late).toBe(true);
  });
  it('no está atrasado si llegó al 100%', () => {
    expect(projectProgress([t('done')], '2026-10-01', '2026-10-12')).toMatchObject({ percent: 100, late: false });
  });
  it('sin tareas y con la fecha de fin pasada: 0% y atrasado', () => {
    expect(projectProgress([], '2026-10-01', '2026-10-12')).toEqual({ total: 0, todo: 0, doing: 0, done: 0, percent: 0, late: true });
  });
});
