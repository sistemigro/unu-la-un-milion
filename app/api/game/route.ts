import { getClientPrompts } from '@/lib/bank.server'
import { readSession, sessionCookie } from '@/lib/session.server'
import { ANSWER_MS, isGameId } from '@/lib/types'

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: 'cross-site' }, { status: 403 })
  let body: { gameId?: unknown; action?: unknown; promptId?: unknown }
  try { body = await request.json() } catch { return Response.json({ error: 'invalid request' }, { status: 400 }) }
  if (typeof body.gameId !== 'string' || !isGameId(body.gameId)) return Response.json({ error: 'unknown game' }, { status: 400 })
  const gameId = body.gameId
  const prompts = getClientPrompts(gameId)
  if (!prompts) return Response.json({ error: 'unknown game' }, { status: 404 })
  let session = readSession(request, gameId)
  if (body.action === 'start') session = { gameId, index: 0, startedAt: Date.now(), resolved: false }
  else if (body.action === 'skip' && session && !session.resolved && prompts[session.index]?.id === body.promptId) {
    session = { ...session, resolved: true }
  }
  else if (body.action === 'next' && session && session.index < prompts.length) {
    if (!session.resolved && Date.now() - session.startedAt < ANSWER_MS) return Response.json({ error: 'question still active' }, { status: 403 })
    session = { gameId, index: session.index + 1, startedAt: Date.now(), resolved: false }
  } else if (body.action !== 'current' || !session) return Response.json({ error: 'session required' }, { status: 403 })
  return Response.json({ index: session.index, prompt: prompts[session.index] ?? null }, { headers: { 'cache-control': 'no-store', 'set-cookie': sessionCookie(session) } })
}
