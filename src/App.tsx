import { AuthProvider } from '@/hooks/useAuth';
import { WorkspaceSettingsProvider } from '@/hooks/useWorkspaceSettings';
import { AppRouter } from '@/routes/AppRouter';

export default function App() {
  return (
    <WorkspaceSettingsProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </WorkspaceSettingsProvider>
  );
}
