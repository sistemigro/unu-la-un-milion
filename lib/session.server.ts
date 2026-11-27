import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { GameId } from '@/lib/types'

// Configure the same secret on every server instance. The fallback supports local development.
const secret = process.env.GAME_SESSION_SECRET || randomBytes(32).toString('hex')
export type Session = { gameId: GameId; index: number; startedAt: number; resolved: boolean }
const cookieName = (gameId: GameId) => `ulm_session_${gameId}`

export function readSession(request: Request, gameId: GameId): Session | null {
  const raw = request.headers.get('cookie')?.split('; ').find((part) => part.startsWith(`${cookieName(gameId)}=`))?.split('=')[1]
  if (!raw) return null
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(signature), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    return data.gameId === gameId && Number.isInteger(data.index) && data.index >= 0 && data.index <= 7 && Number.isFinite(data.startedAt) && typeof data.resolved === 'boolean' ? data : null
  } catch { return null }
}

export function sessionCookie(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${cookieName(session.gameId)}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
