import { useQuery } from '@tanstack/react-query'
import {
  apiGetWebsiteSettings,
  getCachedWebsiteSettings,
  WEBSITE_SETTINGS_QUERY_KEY,
} from '@/pages/settings/queries'

export function VersionInfo() {
  const { data: websiteSettings } = useQuery({
    queryKey: WEBSITE_SETTINGS_QUERY_KEY,
    queryFn: apiGetWebsiteSettings,
    initialData: getCachedWebsiteSettings,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className='text-muted-foreground grid gap-1 px-2 py-1.5 text-[11px]'>
      <div className='flex items-center justify-between gap-3'>
        <span>Frontend</span>
        <span className='font-mono'>v{__APP_VERSION__}</span>
      </div>
      <div className='flex items-center justify-between gap-3'>
        <span>Backend</span>
        <span className='font-mono'>
          {websiteSettings?.backend_version
            ? `v${websiteSettings.backend_version}`
            : 'unknown'}
        </span>
      </div>
    </div>
  )
}
