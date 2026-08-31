import { useQuery } from '@tanstack/react-query'
import Logo from '@/assets/images/logo.png'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import {
  apiGetWebsiteSettings,
  getCachedWebsiteSettings,
  WEBSITE_SETTINGS_QUERY_KEY,
} from '@/pages/settings/queries'
import { useDataActiveWhiteLabel } from '@/pages/white-labels/queries'

type RuntimeLogoProps = {
  className?: string
  placeholderClassName?: string
}

export function RuntimeLogo({
  className,
  placeholderClassName,
}: RuntimeLogoProps) {
  const { resolvedTheme } = useTheme()
  const { data: whiteLabel } = useDataActiveWhiteLabel('admin')
  const { data: websiteSettings, isFetched } = useQuery({
    queryKey: WEBSITE_SETTINGS_QUERY_KEY,
    queryFn: apiGetWebsiteSettings,
    initialData: getCachedWebsiteSettings,
    staleTime: 5 * 60 * 1000,
  })

  const whiteLabelLogo =
    resolvedTheme === 'dark'
      ? whiteLabel?.siteDarkLogo || whiteLabel?.siteLogo
      : whiteLabel?.siteLogo

  const websiteSettingsLogo =
    resolvedTheme === 'dark'
      ? websiteSettings?.site_dark_logo || websiteSettings?.site_logo
      : websiteSettings?.site_logo

  const configuredLogoSrc = whiteLabelLogo || websiteSettingsLogo
  const hasConfiguredBrand = Boolean(whiteLabel || websiteSettings)
  const logoSrc =
    configuredLogoSrc || (hasConfiguredBrand || isFetched ? Logo : null)

  if (!logoSrc) {
    return <div className={placeholderClassName} aria-hidden='true' />
  }

  return (
    <img
      className={cn('h-auto w-auto object-contain', className)}
      src={logoSrc}
      alt={whiteLabel?.brandName || websiteSettings?.site_brand || 'Logo'}
    />
  )
}
