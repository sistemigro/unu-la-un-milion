import { logEvent } from '@/lib/log.server'
import { GAME_EVENTS, type GameEvent } from '@/lib/types'

/**
 * Anonymous funnel events from the browser.
 *
 * Reached by `sendBeacon`, which sends `content-type: application/json` from a
 * Blob but cannot set other headers — so there is no `sec-fetch-site` check
 * here, unlike /api/check. Nothing is readable through this endpoint and a
 * forged event costs us one wrong row in an analytics table, so the trade is
 * worth the events actually arriving.
 */
export async function POST(request: Request) {
  let body: { event?: string; gameId?: string; meta?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  if (!GAME_EVENTS.includes(body.event as GameEvent)) {
    return new Response(null, { status: 400 })
  }

  logEvent(
    body.event as GameEvent,
    typeof body.gameId === 'string' ? body.gameId : undefined,
    // Only ever a small object of our own making; never echoed back to anyone.
    body.meta && typeof body.meta === 'object' ? body.meta : undefined,
  )

  // 204 so `sendBeacon` has nothing to parse.
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}
