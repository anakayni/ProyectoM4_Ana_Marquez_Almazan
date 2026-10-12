import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalendarPage } from '@/pages/CalendarPage';
import { LoginPage } from '@/pages/LoginPage';
import { NoAccessPage } from '@/pages/NoAccessPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TasksPage } from '@/pages/TasksPage';
import { TeamPage } from '@/pages/TeamPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { RequireAccess } from './RequireAccess';

/** Rutas de la app (sin el router, para poder testearlas con MemoryRouter). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RequireAccess allow={['signed-out']}><LoginPage /></RequireAccess>} />
      <Route path="/register" element={<RequireAccess allow={['signed-out']}><RegisterPage /></RequireAccess>} />
      <Route path="/verify-email" element={<RequireAccess allow={['unverified']}><VerifyEmailPage /></RequireAccess>} />
      <Route
        path="/no-access"
        element={<RequireAccess allow={['no-invitation', 'inactive']}><NoAccessPage /></RequireAccess>}
      />
      {/* Páginas internas: comparten el marco con el menú */}
      <Route element={<RequireAccess allow={['active']}><AppShell /></RequireAccess>}>
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/team" element={<TeamPage />} />
      </Route>
      <Route path="/team/invite" element={<Navigate to="/team" replace />} />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
