import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type WorkspaceSettings } from '@/features/settings/defaults';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { subscribeToSettings } from '@/services/settings.service';

const SettingsContext = createContext<WorkspaceSettings>(DEFAULT_SETTINGS);

/** Escribe la paleta en las variables --brand-1…5: todo el CSS depende de ellas. */
// eslint-disable-next-line react/only-export-components
export function applyPalette(palette: readonly string[], root: HTMLElement = document.documentElement): void {
  palette.forEach((color, i) => root.style.setProperty(`--brand-${i + 1}`, color));
}

/** Ajustes del espacio en tiempo real (también sin sesión, para el login). */
export function WorkspaceSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);

  useEffect(
    () =>
      subscribeToSettings(
        (next) => {
          setSettings(next);
          applyPalette(next.palette);
        },
        (err) => console.error('Error al leer los ajustes:', err),
      ),
    [],
  );

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useWorkspaceSettings(): WorkspaceSettings {
  return useContext(SettingsContext);
}

/** "MC-12" con el prefijo vigente. */
// eslint-disable-next-line react/only-export-components
export function useTaskNumberFormat(): (n: number) => string {
  const { taskPrefix } = useWorkspaceSettings();
  return useCallback((n: number) => formatTaskNumber(n, taskPrefix), [taskPrefix]);
}
