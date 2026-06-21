import { Outlet } from 'react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { NotificationSocketProvider } from '@/context/notification-socket-context'
import { SearchProvider } from '@/context/search-provider'
import { SocketProvider } from '@/context/socket-context'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { NavigationProgress } from '../navigation-progress'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  // const userId = useAuthStore((state) => state.id)
  return (
    <SearchProvider>
      <LayoutProvider>
        <SocketProvider>
          <NotificationSocketProvider>
            <NavigationProgress />
            <SidebarProvider defaultOpen={defaultOpen}>
              <SkipToMain />
              <AppSidebar />
              <SidebarInset
                className={cn(
                  // Set content container, so we can use container queries
                  // '@container/content',

                  // If layout is fixed, set the height
                  // to 100svh to prevent overflow
                  'has-[[data-layout=fixed]]:h-svh',

                  // If layout is fixed and sidebar is inset,
                  // set the height to 100svh - spacing (total margins) to prevent overflow
                  'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]'
                )}
              >
                {children ?? <Outlet />}
              </SidebarInset>
            </SidebarProvider>
          </NotificationSocketProvider>
        </SocketProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
