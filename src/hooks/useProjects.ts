import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToProjects } from '@/services/projects.service';
import type { Project } from '@/types/project';

/** Proyectos que la persona puede ver, en tiempo real (el Invitado, solo los suyos). */
export function useProjects() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? '';
  const role = profile?.role ?? 'viewer';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToProjects(
        { uid, role },
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
    [uid, role],
  );

  return { projects, loading, error };
}
