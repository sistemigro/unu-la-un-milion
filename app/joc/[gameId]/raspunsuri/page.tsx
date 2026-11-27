import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RevealClient } from '@/components/RevealClient'
import { isPlayable, playableGameIds } from '@/lib/bank.server'
import { GAME_TITLES, isGameId, type GameId } from '@/lib/types'

/**
 * A thin server shell so the route can declare `noindex`; all the work happens
 * in the client leaf, which fetches `/api/reveal`.
 *
 * Absent from the sitemap and disallowed in robots.txt: the answer banks must
 * not become crawlable pages. The shell itself holds no answers.
 */
export const metadata: Metadata = {
  title: 'Răspunsuri',
  robots: { index: false, follow: false },
}

/**
 * Prerendered per game, like the game route.
 *
 * Without this, `await params` is uncached dynamic access, which
 * `cacheComponents: true` refuses to prerender. The shell is safe to
 * prerender: it holds only a title and a back link, and every answer arrives
 * later from `/api/reveal`. `noindex` keeps it out of search results
 * regardless of whether the HTML exists.
 */
export function generateStaticParams() {
  return playableGameIds().map((gameId) => ({ gameId }))
}

type Params = { params: Promise<{ gameId: string }> }

export default async function RevealPage({ params }: Params) {
  const { gameId } = await params
  if (!isGameId(gameId) || !isPlayable(gameId)) notFound()

  return <RevealClient gameId={gameId as GameId} title={GAME_TITLES[gameId as GameId]} />
}
