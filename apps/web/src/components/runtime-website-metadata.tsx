import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { applyWebsiteMetadata } from '@/lib/website-metadata'
import { useTheme } from '@/context/theme-provider'
import {
  apiGetWebsiteSettings,
  getCachedWebsiteSettings,
  WEBSITE_SETTINGS_QUERY_KEY,
} from '@/pages/settings/queries'
import { useDataActiveWhiteLabel } from '@/pages/white-labels/queries'

export function RuntimeWebsiteMetadata() {
  const { isWhiteLabelEnabled } = useTheme()
  const { data: whiteLabel } = useDataActiveWhiteLabel('admin')
  const { data: websiteSettings } = useQuery({
    queryKey: WEBSITE_SETTINGS_QUERY_KEY,
    queryFn: apiGetWebsiteSettings,
    initialData: getCachedWebsiteSettings,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (isWhiteLabelEnabled && whiteLabel) {
      applyWebsiteMetadata({
        site_brand: whiteLabel.brandName ?? undefined,
        site_title: whiteLabel.siteTitle ?? undefined,
        site_tagline: whiteLabel.siteTagline ?? undefined,
        meta_title: whiteLabel.metaTitle ?? undefined,
        meta_description: whiteLabel.metaDescription ?? undefined,
        canonical_url: whiteLabel.canonicalUrl ?? undefined,
        site_logo: whiteLabel.siteLogo ?? undefined,
        site_dark_logo: whiteLabel.siteDarkLogo ?? undefined,
        site_favicon: whiteLabel.siteFavicon ?? undefined,
        og_image: whiteLabel.ogImage ?? undefined,
        twitter_image: whiteLabel.twitterImage ?? undefined,
      })
      return
    }

    applyWebsiteMetadata(websiteSettings)
  }, [isWhiteLabelEnabled, whiteLabel, websiteSettings])

  return null
}
