import { useEffect, useState } from 'react'
import { useLayout } from '@/context/layout-provider'
import { useSocket } from '@/context/socket-context'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { sidebarLink } from './data/sidebar-link'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const [_onlineUsers, setOnlineUsers] = useState(0)
  const socket = useSocket()

  useEffect(() => {
    const handleOnlineCount = (data: number) => {
      setOnlineUsers(data)
    }

    socket?.on('onlineCount', handleOnlineCount)

    return () => {
      socket?.off('onlineCount', handleOnlineCount)
    }
  }, [socket])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {sidebarLink.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
