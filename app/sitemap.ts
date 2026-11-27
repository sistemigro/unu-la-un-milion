import type { MetadataRoute } from 'next'
import { playableGameIds } from '@/lib/bank.server'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Generated from the real route list, never hand-maintained.
 *
 * The answer-reveal routes are deliberately absent: publishing the banks as
 * crawlable pages would defeat the game. They also carry `robots: noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes = ['', '/cum-se-joaca', '/despre', '/confidentialitate'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.5,
  }))

  const gameRoutes = playableGameIds().map((gameId) => ({
    url: `${SITE_URL}/joc/${gameId}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...gameRoutes]
}
