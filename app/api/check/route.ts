import { getClientPrompts, checkAnswer } from '@/lib/bank.server'
import { logAnswer } from '@/lib/log.server'
import { readSession, sessionCookie } from '@/lib/session.server'
import { MAX_ANSWER_LENGTH, isGameId, type CheckRequest } from '@/lib/types'

// Route handlers already run on Node unless they opt into edge, and declaring
// `runtime` explicitly is rejected outright alongside `cacheComponents: true`.
// `after()` needs Node, which it gets by default.

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    // A scored answer must never be cached — by the CDN or the browser.
    headers: { 'cache-control': 'no-store' },
  })

/**
 * Scores ONE submitted answer and returns only that answer's outcome.
 *
 * Never the accepted list, never how many players said it. Enumerating a bank
 * therefore costs one request per guess, which is the ceiling the plan accepts:
 * with no accounts and no leaderboard there is no score to defend, and the
 * answer log makes abuse visible after the fact.
 */
export async function POST(request: Request) {
  // Blocks a page on another origin from scoring answers in a fetch loop.
  // Browsers send this header; non-browser clients simply omit it.
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'cross-site' }, 403)
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ error: 'expected json' }, 415)
  }

  let body: Partial<CheckRequest>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'malformed json' }, 400)
  }

  const { gameId, promptId, answer, elapsedMs } = body

  if (typeof gameId !== 'string' || !isGameId(gameId)) {
    return json({ error: 'unknown game' }, 400)
  }
  if (typeof promptId !== 'string' || !promptId) {
    return json({ error: 'missing prompt' }, 400)
  }
  if (typeof answer !== 'string') {
    return json({ error: 'missing answer' }, 400)
  }
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    return json({ error: 'missing elapsed time' }, 400)
  }

  const session = readSession(request, gameId)
  if (!session || getClientPrompts(gameId)?.[session.index]?.id !== promptId) {
    return json({ error: 'question unavailable' }, 403)
  }

  // Truncate rather than reject: a long paste is a player being playful, not an
  // error worth showing them. Nothing downstream needs more than this.
  const submitted = answer.slice(0, MAX_ANSWER_LENGTH)

  const result = checkAnswer(gameId, promptId, submitted, elapsedMs)
  if (!result) return json({ error: 'unknown prompt' }, 404)

  // Fire-and-forget. The plan is explicit that the game must work when the log
  // does not, so this can neither delay nor fail the response.
  logAnswer({
    gameId,
    promptId,
    rawAnswer: submitted,
    matched: result.matched,
    points: result.points,
    elapsedMs: Math.round(elapsedMs),
  })

  return Response.json(result, { headers: {
    'cache-control': 'no-store',
    ...(result.matched ? { 'set-cookie': sessionCookie({ ...session, resolved: true }) } : {}),
  } })
}
