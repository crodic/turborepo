import type { WebsiteSettingsSchema } from '@/pages/settings/schema'

export const DEFAULT_WEBSITE_METADATA = {
  title: 'ADMIN DASHBOARD',
  metaTitle: 'Vite Admin Dashboard',
  description: 'Admin Dashboard UI built with Shadcn and Vite.',
  socialTitle: 'Shadcn Admin',
  favicon: '/images/favicon.png',
}

function upsertMeta(
  selector: string,
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string
) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector)

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attributeName, attributeValue)
    document.head.appendChild(meta)
  }

  meta.content = content
}

function setFavicon(href: string) {
  const icons = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  )
  const icon = icons[0] ?? document.createElement('link')

  icon.rel = 'icon'
  icon.href = href

  if (!icon.type) {
    icon.type = href.endsWith('.ico') ? 'image/x-icon' : 'image/png'
  }

  icons.slice(1).forEach((extraIcon) => extraIcon.remove())

  if (!icon.parentElement) {
    document.head.appendChild(icon)
  }
}

export function resolveWebsiteMetadata(
  settings?: WebsiteSettingsSchema | null
) {
  const title =
    settings?.site_title?.trim() ||
    settings?.site_brand?.trim() ||
    DEFAULT_WEBSITE_METADATA.title
  const description =
    settings?.site_tagline?.trim() || DEFAULT_WEBSITE_METADATA.description
  const favicon = settings?.site_favicon || DEFAULT_WEBSITE_METADATA.favicon

  return {
    title,
    description,
    favicon,
  }
}

export function applyWebsiteMetadata(settings?: WebsiteSettingsSchema | null) {
  const metadata = resolveWebsiteMetadata(settings)

  document.title = metadata.title

  upsertMeta('meta[name="title"]', 'name', 'title', metadata.title)
  upsertMeta(
    'meta[name="description"]',
    'name',
    'description',
    metadata.description
  )
  upsertMeta(
    'meta[property="og:title"]',
    'property',
    'og:title',
    metadata.title
  )
  upsertMeta(
    'meta[property="og:description"]',
    'property',
    'og:description',
    metadata.description
  )
  upsertMeta(
    'meta[property="twitter:title"]',
    'property',
    'twitter:title',
    metadata.title
  )
  upsertMeta(
    'meta[property="twitter:description"]',
    'property',
    'twitter:description',
    metadata.description
  )
  setFavicon(metadata.favicon)
}
