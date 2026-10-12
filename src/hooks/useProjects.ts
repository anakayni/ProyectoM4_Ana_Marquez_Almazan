import { useEffect, useState } from 'react';
import { subscribeToProjects } from '@/services/projects.service';
import type { Project } from '@/types/project';

/** Proyectos del espacio en tiempo real. */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToProjects(
        (next) => {
          setProjects(next);
          setLoading(false);
        },
        (err) => {
          console.error('Error al leer proyectos:', err);
          setError('No pudimos cargar los proyectos.');
          setLoading(false);
        },
      ),
    [],
  );

  return { projects, loading, error };
}
