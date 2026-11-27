import { getReveal } from '@/lib/bank.server'
import { readSession } from '@/lib/session.server'
import { isGameId } from '@/lib/types'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params

  if (!isGameId(gameId)) {
    return Response.json({ error: 'unknown game' }, { status: 404 })
  }

  if (readSession(request, gameId)?.index !== 7) {
    return Response.json({ error: 'finish game first' }, { status: 403 })
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
