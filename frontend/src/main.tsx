import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';

import BaseLayout from '@app/layout/base-layout';
import { ROUTES } from '@shared/config';
import { LanguageProvider } from '@shared/i18n';

import HomePage from '@pages/home/ui/page';
import ConnectionsPage from '@pages/connections/ui/page';
import ConnectionDetailPage from '@pages/connections/ui/detail-page';
import UsersPage from '@pages/users/ui/page';
import ProfilePage from '@pages/profile/ui/page';
import SettingsPage from '@pages/settings/ui/page';
import LoginPage from '@pages/auth/ui/login-page';
import NotFoundPage from '@app/routes/not-found';

function RootProviders() {
  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <RootProviders />,
    children: [
      {
        path: ROUTES.HOME,
        element: <BaseLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: ROUTES.CONNECTIONS, element: <ConnectionsPage /> },
          { path: `${ROUTES.CONNECTIONS}/:id`, element: <ConnectionDetailPage /> },
          { path: ROUTES.USERS, element: <UsersPage /> },
          { path: ROUTES.PROFILE, element: <ProfilePage /> },
          { path: ROUTES.SETTINGS, element: <SettingsPage /> },
        ],
      },
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
