import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { applyWebsiteMetadata } from '@/lib/website-metadata'
import {
  apiGetWebsiteSettings,
  getCachedWebsiteSettings,
  WEBSITE_SETTINGS_QUERY_KEY,
} from '@/pages/settings/queries'

export function RuntimeWebsiteMetadata() {
  const { data: websiteSettings } = useQuery({
    queryKey: WEBSITE_SETTINGS_QUERY_KEY,
    queryFn: apiGetWebsiteSettings,
    initialData: getCachedWebsiteSettings,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    applyWebsiteMetadata(websiteSettings)
  }, [websiteSettings])

  return null
}
