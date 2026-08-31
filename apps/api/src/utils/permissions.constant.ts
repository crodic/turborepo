export enum AppSubjects {
  User = 'USER',
  Role = 'ROLE',
  Log = 'LOG',
  Admin = 'ADMIN',
  EmailLog = 'EMAIL_LOG',
  WhiteLabel = 'WHITE_LABEL',
  File = 'FILE',
  Page = 'PAGE',

  All = 'all',
}

export enum AppActions {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Publish = 'publish',

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

  // Email
  permissionMeta(
    AppActions.Read,
    AppSubjects.EmailLog,
    'Email',
    'View email logs',
    'Review all email delivery logs and failures.',
  ),

  // White Label
  permissionMeta(
    AppActions.Read,
    AppSubjects.WhiteLabel,
    'White Label Management',
    'View white labels',
    'View portal and client white label profiles.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.WhiteLabel,
    'White Label Management',
    'Create white labels',
    'Create new white label profiles with custom branding and styles.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.WhiteLabel,
    'White Label Management',
    'Update white labels',
    'Edit white label branding, assets, and design tokens.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.WhiteLabel,
    'White Label Management',
    'Delete white labels',
    'Remove white label profiles that are no longer used.',
  ),
  permissionMeta(
    AppActions.Publish,
    AppSubjects.WhiteLabel,
    'White Label Management',
    'Activate white labels',
    'Activate a white label profile for the admin portal or client app.',
  ),

  // File
  permissionMeta(
    AppActions.Read,
    AppSubjects.File,
    'File Management',
    'View files',
    'View uploaded files and folder metadata.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.File,
    'File Management',
    'Upload files',
    'Upload files and create logical folders.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.File,
    'File Management',
    'Update files',
    'Move files between folders and update file metadata.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.File,
    'File Management',
    'Delete files',
    'Delete uploaded files and empty logical folders.',
  ),

  // Page
  permissionMeta(
    AppActions.Read,
    AppSubjects.Page,
    'CMS Pages Management',
    'View pages',
    'View CMS pages.',
  ),
  permissionMeta(
    AppActions.Create,
    AppSubjects.Page,
    'CMS Pages Management',
    'Create pages',
    'Create new CMS pages.',
  ),
  permissionMeta(
    AppActions.Update,
    AppSubjects.Page,
    'CMS Pages Management',
    'Update pages',
    'Edit CMS pages.',
  ),
  permissionMeta(
    AppActions.Delete,
    AppSubjects.Page,
    'CMS Pages Management',
    'Delete pages',
    'Delete CMS pages.',
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
