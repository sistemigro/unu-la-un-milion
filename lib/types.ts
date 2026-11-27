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
/** The window a prompt gets unless it asks for more. */
export const ANSWER_SECONDS = 20
export const ANSWER_MS = ANSWER_SECONDS * 1000
/** A prompt whose answers are whole sentences gets a longer window — typing
 *  speed is not the skill being measured. Set per prompt in the bank. */
export const MAX_ANSWER_SECONDS = 60
/** Slack over a prompt's own window, for the round trip. */
export const ELAPSED_GRACE_MS = 1_000

/** The answer window for one prompt, from its optional `seconds` override. */
export function answerMs(seconds?: number): number {
  if (!Number.isFinite(seconds) || seconds === undefined) return ANSWER_MS
  return Math.min(Math.max(Math.round(seconds), 1), MAX_ANSWER_SECONDS) * 1000
}

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
  /** Overrides the 20s default. Only for prompts answered in full sentences. */
  seconds?: number
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
  /** This prompt's answer window, already resolved against the default. */
  seconds: number
}

export type CheckResult = {
  matched: boolean
  tier: Tier
  points: number
  /** The canonical spelling of what the player typed, or null on a miss. */
  canonical: string | null
  regionId: RegionId
  fact?: string
  commonAnswer?: string
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
  'muzica-film': 'Muzică & film',
  sport: 'Sport',
  'mancare-traditii': 'Mâncare & tradiții',
  'limba-meme': 'Limbaj & meme-uri',
}

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value)
}
