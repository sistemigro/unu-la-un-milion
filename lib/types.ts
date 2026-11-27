/**
 * The only module imported by BOTH server and client code.
 *
 * It must never import an answer bank, nor anything that does. The whole
 * game rests on answers not reaching the browser, and the guard is the
 * `ClientPrompt` type below: it structurally cannot carry one.
 */

export const GAME_IDS = [
  '1-decembrie',
  'istorie',
  'geografie',
  'muzica-film',
  'sport',
  'mancare-traditii',
  'limba-meme',
] as const

export type GameId = (typeof GAME_IDS)[number]

/** Stitched in this order, prompts 1-7, in every game. */
export const REGION_IDS = [
  'oltenia',
  'muntenia',
  'dobrogea',
  'moldova',
  'banat-crisana',
  'maramures-bucovina',
  'transilvania',
] as const

export type RegionId = (typeof REGION_IDS)[number]

export const REGION_LABELS: Record<RegionId, string> = {
  oltenia: 'Oltenia',
  muntenia: 'Muntenia',
  dobrogea: 'Dobrogea',
  moldova: 'Moldova',
  'banat-crisana': 'Banat & Crișana',
  'maramures-bucovina': 'Maramureș & Bucovina',
  transilvania: 'Transilvania',
}

export type Tier = 'ratat' | 'cliseu' | 'bun' | 'rar' | 'ulm'

export const TIER_LABELS: Record<Tier, string> = {
  ratat: 'Ratat',
  cliseu: 'Clișeu',
  bun: 'Bun',
  rar: 'Rar',
  ulm: 'Unu’ la un milion',
}

/** Canvas colours. ULM is red by decision — the doc's gold #D4A017 is dropped. */
export const TIER_FILL: Record<Tier, string> = {
  ratat: '#1E1A1A',
  cliseu: '#FFFFFF',
  bun: '#002B7F',
  rar: '#FCD116',
  ulm: '#CE1126',
}

/** The emoji square per tier, for the shared result grid. */
export const TIER_SQUARE: Record<Tier, string> = {
  ratat: '⬛',
  cliseu: '⬜',
  bun: '🟦',
  rar: '🟨',
  ulm: '🟥',
}

export const PROMPTS_PER_GAME = 7
export const MAX_SCORE = 700
export const ANSWER_MS = 20_000
/** Server-side clamp: anything slower than this scores nothing. */
export const MAX_ACCEPTED_ELAPSED_MS = 21_000

// ---------------------------------------------------------------------------
// Bank shapes — SERVER ONLY. Never let a value of these types cross to the
// client; project it through `getClientPrompts` first.
// ---------------------------------------------------------------------------

export type BankAnswer = {
  name: string
  /** Out of 100 Romanians asked, how many name this. Drives the score band. */
  pop: number
  alias?: string[]
  /** Fact-check evidence for the human reviewer. Stripped before the client. */
  note?: string
}

export type BankPrompt = {
  id: string
  region: RegionId
  text: string
  /** The acceptance boundary, for the reviewer. Not shown to players. */
  accepts: string
  answers: BankAnswer[]
}

export type Bank = {
  id: GameId
  /** Leak sentinel — must not appear in any client bundle or served HTML. */
  canary: string
  title: string
  prompts: BankPrompt[]
}

// ---------------------------------------------------------------------------
// Wire shapes — safe to send to the browser.
// ---------------------------------------------------------------------------

export type ClientPrompt = {
  id: string
  region: RegionId
  text: string
  /** How many answers are accepted, so the UI can hint at breadth. */
  answerCount: number
}

export type CheckResult = {
  matched: boolean
  tier: Tier
  points: number
  /** The canonical spelling of what the player typed, or null on a miss. */
  canonical: string | null
  regionId: RegionId
}

/** POST body for /api/check. The client owns the clock; the server clamps it. */
export type CheckRequest = {
  gameId: GameId
  promptId: string
  answer: string
  elapsedMs: number
}

/** Longest answer we will even look at — a guard, not a game rule. */
export const MAX_ANSWER_LENGTH = 120

/**
 * Funnel events. Declared here rather than in `log.server.ts` so the browser
 * helper can name the type without importing a `server-only` module at all —
 * a type-only import would be erased, but the boundary is clearer this way.
 */
export type GameEvent = 'game_start' | 'game_finish' | 'share_click' | 'sistemigro_click'

export const GAME_EVENTS: GameEvent[] = [
  'game_start',
  'game_finish',
  'share_click',
  'sistemigro_click',
]

export const GAME_TITLES: Record<GameId, string> = {
  '1-decembrie': 'Ediția 1 Decembrie',
  istorie: 'Istorie',
  geografie: 'Geografie',
  'muzica-film': 'Muzică & Film',
  sport: 'Sport',
  'mancare-traditii': 'Mâncare & tradiții',
  'limba-meme': 'Limbă & meme',
}

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value)
}
