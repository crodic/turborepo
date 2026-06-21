export enum AppSubjects {
  User = 'USER',
  Role = 'ROLE',
  Log = 'LOG',
  Admin = 'ADMIN',
  ImpersonateLog = 'IMPERSONATE_LOG',
  Email = 'EMAIL',
  EmailLog = 'EMAIL_LOG',
  Page = 'PAGE',

  All = 'all',
}

export enum AppActions {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Impersonate = 'impersonate',

  // ⚡ SUPER
  Manage = 'manage',
}

const permissionMeta = (
  action: AppActions,
  subject: AppSubjects,
  group: string,
  name: string,
  description: string,
) => ({
  key: `${action}:${subject}`,
  group,
  name,
  description,
});

export const ALL_PERMISSIONS = [
  // Admin
  permissionMeta(
    AppActions.Read,
    AppSubjects.Admin,
    'Admin Management',
    'View admins',
    'View administrator accounts and their assigned roles.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.Admin,
    'Admin Management',
    'Create admins',
    'Invite or create administrator accounts.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.Admin,
    'Admin Management',
    'Update admins',
    'Edit administrator profile details, status, and role assignments.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.Admin,
    'Admin Management',
    'Delete admins',
    'Remove administrator accounts from the system.',
  ),

  // User
  permissionMeta(
    AppActions.Read,
    AppSubjects.User,
    'User Management',
    'View users',
    'View customer or member user accounts.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.User,
    'User Management',
    'Create users',
    'Create customer or member user accounts.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.User,
    'User Management',
    'Update users',
    'Edit customer or member user account details.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.User,
    'User Management',
    'Delete users',
    'Remove customer or member user accounts.',
  ),
  permissionMeta(
    AppActions.Impersonate,
    AppSubjects.User,
    'User Management',
    'Impersonate users',
    'Start a temporary user session for support and troubleshooting.',
  ),

  // Role
  permissionMeta(
    AppActions.Read,
    AppSubjects.Role,
    'Role Management',
    'View roles',
    'View roles and their permission assignments.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.Role,
    'Role Management',
    'Create roles',
    'Create roles and assign allowed permissions.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.Role,
    'Role Management',
    'Update roles',
    'Edit role details and permission assignments.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.Role,
    'Role Management',
    'Delete roles',
    'Remove roles that are no longer used.',
  ),

  // Log
  permissionMeta(
    AppActions.Read,
    AppSubjects.Log,
    'Audit & Activity',
    'View activity logs',
    'Review audit trails and activity history.',
  ),
  permissionMeta(
    AppActions.Read,
    AppSubjects.ImpersonateLog,
    'Audit & Activity',
    'View impersonation logs',
    'Review admin impersonation sessions and actions.',
  ),

  // Email
  permissionMeta(
    AppActions.Read,
    AppSubjects.Email,
    'Email',
    'View own emails',
    'View emails sent or scheduled by the current admin.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.Email,
    'Email',
    'Send emails',
    'Send or schedule administrative emails.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.Email,
    'Email',
    'Edit scheduled emails',
    'Edit emails that have been scheduled but not sent yet.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.Email,
    'Email',
    'Cancel scheduled emails',
    'Cancel emails that have been scheduled but not sent yet.',
  ),
  permissionMeta(
    AppActions.Read,
    AppSubjects.EmailLog,
    'Email',
    'View email logs',
    'Review all email delivery logs and failures.',
  ),

  // CMS Pages
  permissionMeta(
    AppActions.Read,
    AppSubjects.Page,
    'Page Builder',
    'View pages',
    'View page builder pages and SEO settings.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.Page,
    'Page Builder',
    'Create pages',
    'Create page builder pages for the client website.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.Page,
    'Page Builder',
    'Update pages',
    'Edit page content, publication status, and SEO settings.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.Page,
    'Page Builder',
    'Delete pages',
    'Remove page builder pages from the client website.',
  ),

  // SUPER
  permissionMeta(
    AppActions.Manage,
    AppSubjects.All,
    'System',
    'Full system access',
    'Reserved system permission with unrestricted access. Not assignable in role forms.',
  ),
];

export const ADMIN_FULL_ACCESS = {
  action: AppActions.Manage,
  subject: AppSubjects.All,
};
