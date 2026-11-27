import { getReveal } from '@/lib/bank.server'
import { isGameId } from '@/lib/types'

/**
 * Every accepted answer for a game, with its points.
 *
 * Deliberately unguarded, and the plan says so explicitly: with no accounts
 * there is nothing to authenticate against, and with no leaderboard a player
 * who fetches this early has only spoiled their own game. One bank being read
 * does not expose the other six. It is kept out of the sitemap and disallowed
 * in robots.txt so it never reaches search results.
 *
 * Aliases and reviewer notes are stripped by `getReveal` — the aliases would
 * hand out a normalisation cheat sheet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params

  if (!isGameId(gameId)) {
    return Response.json({ error: 'unknown game' }, { status: 404 })
  }

  const reveal = getReveal(gameId)
  if (!reveal) {
    return Response.json({ error: 'game not available yet' }, { status: 404 })
  }

  return Response.json(reveal, {
    headers: {
      'cache-control': 'no-store',
      // Belt and braces alongside robots.txt: this header also covers the
      // response itself, which robots.txt cannot.
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
