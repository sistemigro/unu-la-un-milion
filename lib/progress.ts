import { GAME_IDS, type GameId, type RegionId, type Tier } from '@/lib/types'

/**
 * Browser-only progress. No accounts, no server copy.
 *
 * Every key lives under `ulm:v1` and every record carries `v`, so a later
 * shape change can be migrated instead of being read as garbage.
 */

const PREFIX = 'ulm:v1'
const VERSION = 1

export type PromptResult = {
  promptId: string
  region: RegionId
  answer: string
  tier: Tier
  points: number
}

export type GameProgress = {
  score: number
  results: PromptResult[]
  finishedAt: string
  latestResults?: PromptResult[]
  details?: ResultDetail[]
}

export type ResultDetail = { promptId: string; text: string; fact?: string }

const gameKey = (gameId: GameId) => `${PREFIX}:game:${gameId}`
const inFlightKey = (gameId: GameId) => `${PREFIX}:inflight:${gameId}`

/**
 * Mirror of everything written. Safari in private mode throws on any
 * `localStorage` access, and an uncaught throw there takes the game down —
 * so reads and writes degrade to this instead.
 */
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) return stored
  } catch {
    // storage unavailable — fall through to memory
  }
  return memory.get(key) ?? null
}

function write(key: string, value: string): void {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable — the memory copy is all we get this session
  }
}

function remove(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // storage unavailable — nothing to clear
  }
}

export function loadGame(gameId: GameId): GameProgress | null {
  const raw = read(gameKey(gameId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<GameProgress> & { v?: number }
    if (parsed.v !== VERSION) return null
    if (typeof parsed.score !== 'number' || typeof parsed.finishedAt !== 'string') return null
    if (!Array.isArray(parsed.results)) return null
    return { score: parsed.score, results: parsed.results, finishedAt: parsed.finishedAt, latestResults: Array.isArray(parsed.latestResults) ? parsed.latestResults : parsed.results, details: Array.isArray(parsed.details) ? parsed.details : undefined }
  } catch {
    return null
  }
}

/** A finished game's score is official and immutable: replay does not rescore. */
export function saveGame(gameId: GameId, progress: GameProgress): void {
  const existing = loadGame(gameId)
  if (existing?.finishedAt) {
    write(gameKey(gameId), JSON.stringify({ v: VERSION, ...existing, latestResults: progress.results, details: undefined }))
    return
  }

  write(gameKey(gameId), JSON.stringify({ v: VERSION, ...progress, latestResults: progress.results }))
}

export function saveResultDetails(gameId: GameId, results: PromptResult[], details: ResultDetail[]): void {
  const progress = loadGame(gameId)
  if (!progress || JSON.stringify(progress.latestResults) !== JSON.stringify(results)) return
  write(gameKey(gameId), JSON.stringify({ v: VERSION, ...progress, details }))
}

/**
 * Written when a prompt STARTS, cleared when it resolves. A mid-prompt reload
 * therefore finds its own marker still there and scores Ratat, rather than
 * being handed a fresh 20 seconds — the one cheat anyone would actually try.
 */
export function markInFlight(gameId: GameId, promptId: string): void {
  write(inFlightKey(gameId), JSON.stringify({ v: VERSION, promptId }))
}

export function takeInFlight(gameId: GameId): string | null {
  const raw = read(inFlightKey(gameId))
  remove(inFlightKey(gameId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { v?: number; promptId?: unknown }
    if (parsed.v !== VERSION || typeof parsed.promptId !== 'string') return null
    return parsed.promptId
  } catch {
    return null
  }
}

/** How many of the seven packs have an official score — the "Pachete: N/7" figure. */
export function countFinished(): number {
  return GAME_IDS.filter((id) => loadGame(id) !== null).length
}

