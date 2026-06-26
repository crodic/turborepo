import {
  LayoutDashboard,
  HelpCircle,
  Palette,
  Settings,
  Wrench,
  UserCog,
  UserCog2,
  Group,
  UserLock,
  FileClock,
  HistoryIcon,
  ShieldCheck,
  Globe,
  Mail,
  MailSearch,
  PaintbrushIcon,
  Files,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarLink: SidebarData = {
  navGroups: [
    {
      title: 'navigation.general.title',
      items: [
        {
          title: 'navigation.general.dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'navigation.general.activityLogs',
          url: '/logs',
          icon: FileClock,
          permission: 'LOG',
        },
        {
          title: 'navigation.general.impersonationLogs',
          url: '/impersonation-logs',
          icon: HistoryIcon,
          permission: 'IMPERSONATE_LOG',
        },
        {
          title: 'navigation.general.emailLogs',
          url: '/email-logs',
          icon: MailSearch,
          permission: 'EMAIL_LOG',
        },
        {
          title: 'navigation.general.website',
          url: '/website-settings',
          icon: Globe,
        },
      ],
    },
    {
      title: 'navigation.management.title',
      items: [
        {
          title: 'navigation.management.admins',
          url: '/admins',
          icon: UserCog2,
          permission: 'ADMIN',
        },
        {
          title: 'navigation.management.roles',
          icon: Group,
          url: '/roles',
          permission: 'ROLE',
        },
        {
          title: 'navigation.management.permissions',
          icon: ShieldCheck,
          url: '/permissions',
          permission: 'ROLE',
        },
        {
          title: 'navigation.management.users',
          url: '/users',
          icon: UserLock,
          permission: 'USER',
        },
        {
          title: 'navigation.management.themes',
          url: '/themes',
          icon: PaintbrushIcon,
          permission: 'THEME',
        },
        {
          title: 'navigation.management.files',
          url: '/files',
          icon: Files,
          permission: 'FILE',
        },
      ],
    },
    {
      title: 'navigation.other.title',
      items: [
        {
          title: 'navigation.other.settings',
          icon: Settings,
          items: [
            {
              title: 'navigation.other.profiles',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'navigation.other.account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'navigation.other.appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
          ],
        },
        {
          title: 'navigation.orders.myEmails',
          url: '/emails',
          icon: Mail,
          permission: 'EMAIL',
        },
        {
          title: 'navigation.other.helpCenter',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
