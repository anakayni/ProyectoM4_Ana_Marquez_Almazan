import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendSummaryButton } from '@/components/tasks/SendSummaryButton';
import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';

export function TasksPage() {
  const { profile } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <>
      <TaskWorkspace
        // RequireAccess garantiza que acá siempre hay un perfil activo.
        profile={profile as UserProfile}
        renderHeader={(newTaskButton) => (
          <PageHeader
            title="Mis tareas"
            description="Lo que tienes asignado y lo que mueve el equipo, en un solo tablero."
            actions={
              <>
                <SendSummaryButton onResult={setToast} />
                {newTaskButton}
              </>
            }
          />
        )}
      />
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
