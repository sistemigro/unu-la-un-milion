import type { GameEvent } from '@/lib/types'

/**
 * Fire-and-forget event pings from the browser.
 *
 * `sendBeacon` because these fire on actions that often navigate away — a
 * share, or a click through to sistemigro.com — and a normal `fetch` gets
 * cancelled when the page unloads. Everything here is best-effort: a dropped
 * event is a missing data point, never a broken interaction, so nothing awaits
 * it and nothing surfaces a failure.
 *
 * Carries no identifier of any kind, matching what the privacy page promises.
 */
function send(event: GameEvent, gameId?: string, meta?: Record<string, unknown>) {
  if (typeof navigator === 'undefined') return

  const body = JSON.stringify({ event, gameId, meta })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Intentionally silent.
  }
}

export const logGameStart = (gameId: string) => send('game_start', gameId)

export const logGameFinish = (gameId: string, score: number) =>
  send('game_finish', gameId, { score })

export const logShare = (method: 'native' | 'copy') => send('share_click', undefined, { method })

export const logSistemigroClick = (from: string) =>
  send('sistemigro_click', undefined, { from })
