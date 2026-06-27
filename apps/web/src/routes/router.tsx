import {
  createBrowserRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router'
import { PageActivityLogOverview } from '@/pages/activity-log'
import PageActivityLogShow from '@/pages/activity-log/show'
import { PageAdminOverview } from '@/pages/admins'
import { PageAdminCreate } from '@/pages/admins/create'
import { PageAdminEdit } from '@/pages/admins/edit'
import { PageAdminShow } from '@/pages/admins/show'
import { ForgotPassword } from '@/pages/auth/forgot-password'
import { ResetPassword } from '@/pages/auth/reset-password'
import { SignIn } from '@/pages/auth/sign-in'
import { SignUp } from '@/pages/auth/sign-up'
import { Dashboard } from '@/pages/dashboard'
import { PageEmailLogOverview } from '@/pages/email-logs'
import PageEmailLogShow from '@/pages/email-logs/show'
import { PageMyEmails } from '@/pages/emails'
import PageMyEmailShow from '@/pages/emails/show'
import { ForbiddenError } from '@/pages/errors/forbidden'
import { GeneralError } from '@/pages/errors/general-error'
import { MaintenanceError } from '@/pages/errors/maintenance-error'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { UnauthorizedError } from '@/pages/errors/unauthorized-error'
import { PageFileOverview } from '@/pages/files'
import { PageHelpCenter } from '@/pages/help-center'
import { PageImpersonationLogOverview } from '@/pages/impersonation-logs'
import PageImpersonationLogShow from '@/pages/impersonation-logs/show'
import { PagePermissionOverview } from '@/pages/permissions'
import { PagePermissionEdit } from '@/pages/permissions/edit'
import PagePermissionShow from '@/pages/permissions/show'
import { PageRoleOverview } from '@/pages/roles'
import PageRoleCreate from '@/pages/roles/create'
import { PageRoleEdit } from '@/pages/roles/edit'
import PageRoleShow from '@/pages/roles/show'
import { Settings } from '@/pages/settings'
import { SettingsAccount } from '@/pages/settings/account'
import { SettingsAppearance } from '@/pages/settings/appearance'
import { SettingsDisplay } from '@/pages/settings/display'
import { SettingsNotifications } from '@/pages/settings/notifications'
import { SettingsPassword } from '@/pages/settings/password'
import { SettingsProfile } from '@/pages/settings/profile'
import { SettingsSecurity } from '@/pages/settings/security'
import { SettingsWebsite } from '@/pages/settings/website'
import { PageThemeOverview } from '@/pages/themes'
import { PageThemeCreate } from '@/pages/themes/create'
import { PageThemeEdit } from '@/pages/themes/edit'
import PageThemeShow from '@/pages/themes/show'
import { PageUserOverview } from '@/pages/users'
import { PageUserCreate } from '@/pages/users/create'
import { PageUserEdit } from '@/pages/users/edit'
import { PageUserShow } from '@/pages/users/show'
import ProtectedRoutes from './protected-route'
import { RouteAuthorize } from './route-authorized'

const routes: RouteObject[] = [
  {
    path: '/sign-in',
    element: <SignIn />,
  },
  {
    path: '/sign-up',
    element: <SignUp />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/',
    element: <ProtectedRoutes />,
    errorElement: <GeneralError />,
    children: [
      {
        index: true,
        element: (
          <RouteAuthorize isAnyPermission>
            <Dashboard />
          </RouteAuthorize>
        ),
      },
      {
        path: '/admins',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='ADMIN'>
                <PageAdminOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: 'create',
            element: (
              <RouteAuthorize action='create' subject='ADMIN'>
                <PageAdminCreate />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <RouteAuthorize action='update' subject='ADMIN'>
                <PageAdminEdit />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='ADMIN'>
                <PageAdminShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/permissions',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='ROLE'>
                <PagePermissionOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='ROLE'>
                <PagePermissionShow />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <RouteAuthorize action='update' subject='ROLE'>
                <PagePermissionEdit />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/roles',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='ROLE'>
                <PageRoleOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='ROLE'>
                <PageRoleShow />
              </RouteAuthorize>
            ),
          },
          {
            path: 'create',
            element: (
              <RouteAuthorize action='create' subject='ROLE'>
                <PageRoleCreate />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <RouteAuthorize action='update' subject='ROLE'>
                <PageRoleEdit />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/settings',
        element: <Settings />,
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsProfile />
              </RouteAuthorize>
            ),
          },
          {
            path: 'account',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsAccount />
              </RouteAuthorize>
            ),
          },
          {
            path: 'password',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsPassword />
              </RouteAuthorize>
            ),
          },
          {
            path: 'security',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsSecurity />
              </RouteAuthorize>
            ),
          },
          {
            path: 'appearance',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsAppearance />
              </RouteAuthorize>
            ),
          },
          {
            path: 'notifications',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsNotifications />
              </RouteAuthorize>
            ),
          },
          {
            path: 'display',
            element: (
              <RouteAuthorize isAnyPermission>
                <SettingsDisplay />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/website-settings',
        element: (
          <RouteAuthorize isAnyPermission>
            <SettingsWebsite />
          </RouteAuthorize>
        ),
      },
      {
        path: '/themes',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='THEME'>
                <PageThemeOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: 'create',
            element: (
              <RouteAuthorize action='create' subject='THEME'>
                <PageThemeCreate />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <RouteAuthorize action='update' subject='THEME'>
                <PageThemeEdit />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='THEME'>
                <PageThemeShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/files',
        element: (
          <RouteAuthorize action='read' subject='FILE'>
            <PageFileOverview />
          </RouteAuthorize>
        ),
      },
      {
        path: '/users',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='USER'>
                <PageUserOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: 'create',
            element: (
              <RouteAuthorize action='create' subject='USER'>
                <PageUserCreate />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <RouteAuthorize action='update' subject='USER'>
                <PageUserEdit />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='USER'>
                <PageUserShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: 'logs',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='LOG'>
                <PageActivityLogOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='LOG'>
                <PageActivityLogShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: 'impersonation-logs',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='IMPERSONATE_LOG'>
                <PageImpersonationLogOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='IMPERSONATE_LOG'>
                <PageImpersonationLogShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: 'emails',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='EMAIL'>
                <PageMyEmails />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='EMAIL'>
                <PageMyEmailShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: 'email-logs',
        children: [
          {
            index: true,
            element: (
              <RouteAuthorize action='read' subject='EMAIL_LOG'>
                <PageEmailLogOverview />
              </RouteAuthorize>
            ),
          },
          {
            path: ':id/show',
            element: (
              <RouteAuthorize action='read' subject='EMAIL_LOG'>
                <PageEmailLogShow />
              </RouteAuthorize>
            ),
          },
        ],
      },
      {
        path: '/errors',
        children: [
          {
            path: 'not-found',
            element: <NotFoundError />,
          },
          {
            path: 'internal-server-error',
            element: <GeneralError />,
          },
          {
            path: 'unauthorized',
            element: <UnauthorizedError />,
          },
          {
            path: 'forbidden',
            element: <ForbiddenError />,
          },
          {
            path: 'maintenance-error',
            element: <MaintenanceError />,
          },
        ],
      },
      {
        path: 'help-center',
        element: <PageHelpCenter />,
      },
      {
        path: '*',
        element: <NotFoundError />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundError />,
  },
]

const router = createBrowserRouter(routes)

const AppRouter = () => {
  return <RouterProvider router={router} />
}

export default AppRouter
