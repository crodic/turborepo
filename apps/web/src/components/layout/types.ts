import { type LinkProps } from 'react-router'
import { type Subjects } from '@/lib/permissions'

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  permission?: Subjects
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & {
    url: LinkProps['to'] | (string & {})
    permission?: Subjects
  })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
  onlyDevMode?: boolean
}

type SidebarData = {
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
