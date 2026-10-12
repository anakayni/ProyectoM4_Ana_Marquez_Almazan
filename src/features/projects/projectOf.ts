import type { Project } from '@/types/project';

export type ProjectOf = (id: string | null) => Project | null;

export function makeProjectOf(projects: readonly Project[]): ProjectOf {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return (id) => (id ? byId.get(id) ?? null : null);
}
