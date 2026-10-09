import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { InvitePage } from '@/pages/InvitePage';
import { LoginPage } from '@/pages/LoginPage';
import { NoAccessPage } from '@/pages/NoAccessPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TasksPage } from '@/pages/TasksPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { AdminRoute } from './AdminRoute';
import { RequireAccess } from './RequireAccess';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireAccess allow={['signed-out']}><LoginPage /></RequireAccess>} />
        <Route path="/register" element={<RequireAccess allow={['signed-out']}><RegisterPage /></RequireAccess>} />
        <Route path="/verify-email" element={<RequireAccess allow={['unverified']}><VerifyEmailPage /></RequireAccess>} />
        <Route
          path="/no-access"
          element={<RequireAccess allow={['no-invitation', 'inactive']}><NoAccessPage /></RequireAccess>}
        />
        <Route path="/tasks" element={<RequireAccess allow={['active']}><TasksPage /></RequireAccess>} />
        <Route
          path="/team/invite"
          element={<RequireAccess allow={['active']}><AdminRoute><InvitePage /></AdminRoute></RequireAccess>}
        />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
