import 'server-only'

import { after } from 'next/server'
import { normalize } from '@/lib/normalize'

/**
 * Anonymous answer log. Best-effort by design.
 *
 * The plan is explicit: "if the answer log fails, the game still works." So
 * every write happens in `after()`, after the response has been sent, and the
 * try/catch wraps the CALLBACK BODY — an outer try around `after()` itself
 * catches nothing, since the callback runs later.
 *
 * Written over PostgREST with plain `fetch` rather than `@supabase/supabase-js`:
 * one insert needs no client, no dependency, and no background auth-refresh
 * timers to leak in a serverless invocation.
 *
 * Stores no IP address, no user agent and no identifier of any kind, which is
 * what the privacy page promises.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Unconfigured is a normal state, not an error — local dev runs without it. */
const enabled = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)

let warned = false
function warnOnce() {
  if (warned || process.env.NODE_ENV === 'production') return
  warned = true
  console.info('[log] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset — not logging')
}

async function insert(table: string, row: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
    // Never let a slow log hold an invocation open.
    signal: AbortSignal.timeout(4000),
  })

  if (!response.ok) {
    throw new Error(`${table} insert failed: ${response.status} ${await response.text()}`)
  }
}

type AnswerLogEntry = {
  gameId: string
  promptId: string
  rawAnswer: string
  matched: boolean
  points: number
  elapsedMs: number
}

export function logAnswer(entry: AnswerLogEntry) {
  if (!enabled) return warnOnce()

  after(async () => {
    try {
      await insert('answer_log', {
        game_id: entry.gameId,
        prompt_id: entry.promptId,
        raw_answer: entry.rawAnswer,
        normalized_answer: normalize(entry.rawAnswer),
        matched: entry.matched,
        points: entry.points,
        elapsed_ms: entry.elapsedMs,
      })
    } catch (error) {
      // Swallowed on purpose: a logging outage must never surface to a player.
      console.error('[log] answer_log write failed', error)
    }
  })
}

export type GameEvent =
  | 'game_start'
  | 'game_finish'
  | 'share_click'
  | 'sistemigro_click'

export function logEvent(event: GameEvent, gameId?: string, meta?: Record<string, unknown>) {
  if (!enabled) return warnOnce()

  after(async () => {
    try {
      await insert('game_events', { event, game_id: gameId ?? null, meta: meta ?? null })
    } catch (error) {
      console.error('[log] game_events write failed', error)
    }
  })
}
