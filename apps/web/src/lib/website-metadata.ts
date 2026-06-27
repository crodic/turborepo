import type { WebsiteSettingsSchema } from '@/pages/settings/schema'

export const DEFAULT_WEBSITE_METADATA = {
  title: 'ADMIN DASHBOARD',
  metaTitle: 'Vite Admin Dashboard',
  description: 'Admin Dashboard UI built with Shadcn and Vite.',
  socialTitle: 'Shadcn Admin',
  favicon: '/images/favicon.png',
}

function emptyToUndefined(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed || undefined
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

function upsertCanonical(href?: string) {
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  )

  if (!href) {
    existing?.remove()
    return
  }

  const link = existing ?? document.createElement('link')
  link.rel = 'canonical'
  link.href = href

  if (!link.parentElement) {
    document.head.appendChild(link)
  }
}

export function resolveWebsiteMetadata(
  settings?: WebsiteSettingsSchema | null
) {
  const title =
    emptyToUndefined(settings?.meta_title) ||
    emptyToUndefined(settings?.site_title) ||
    emptyToUndefined(settings?.site_brand) ||
    DEFAULT_WEBSITE_METADATA.title
  const description =
    emptyToUndefined(settings?.meta_description) ||
    emptyToUndefined(settings?.site_tagline) ||
    DEFAULT_WEBSITE_METADATA.description
  const ogTitle = emptyToUndefined(settings?.og_title) || title
  const ogDescription =
    emptyToUndefined(settings?.og_description) || description
  const twitterTitle = emptyToUndefined(settings?.twitter_title) || ogTitle
  const twitterDescription =
    emptyToUndefined(settings?.twitter_description) || ogDescription
  const favicon = settings?.site_favicon || DEFAULT_WEBSITE_METADATA.favicon
  const socialImage =
    settings?.og_image ||
    settings?.twitter_image ||
    settings?.site_logo ||
    settings?.site_favicon ||
    ''
  const twitterImage = settings?.twitter_image || socialImage
  const canonicalUrl = emptyToUndefined(settings?.canonical_url) || ''

  return {
    title,
    description,
    favicon,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage: socialImage,
    twitterTitle,
    twitterDescription,
    twitterImage,
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
    metadata.ogTitle
  )
  upsertMeta(
    'meta[property="og:description"]',
    'property',
    'og:description',
    metadata.ogDescription
  )
  upsertMeta(
    'meta[property="og:url"]',
    'property',
    'og:url',
    metadata.canonicalUrl
  )
  upsertMeta(
    'meta[property="og:image"]',
    'property',
    'og:image',
    metadata.ogImage
  )
  upsertMeta(
    'meta[property="twitter:title"]',
    'property',
    'twitter:title',
    metadata.twitterTitle
  )
  upsertMeta(
    'meta[property="twitter:description"]',
    'property',
    'twitter:description',
    metadata.twitterDescription
  )
  upsertMeta(
    'meta[property="twitter:url"]',
    'property',
    'twitter:url',
    metadata.canonicalUrl
  )
  upsertMeta(
    'meta[property="twitter:image"]',
    'property',
    'twitter:image',
    metadata.twitterImage
  )
  upsertCanonical(metadata.canonicalUrl)
  setFavicon(metadata.favicon)
}
