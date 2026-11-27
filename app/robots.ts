import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/app/sitemap'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The reveal pages and the scoring endpoint hold the answer banks.
      // Keeping crawlers out is not a security measure — `/api/check` still
      // only ever discloses the one answer submitted — it just keeps the banks
      // out of search results, where they would spoil the game.
      disallow: ['/api/', '/joc/*/raspunsuri'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
