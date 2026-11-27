import 'server-only'

import oneDecembrie from '@/content/games/1-decembrie.json'
import geografie from '@/content/games/geografie.json'
import istorie from '@/content/games/istorie.json'
import limbaMeme from '@/content/games/limba-meme.json'
import mancareTraditii from '@/content/games/mancare-traditii.json'
import muzicaFilm from '@/content/games/muzica-film.json'
import sport from '@/content/games/sport.json'
import { buildPromptIndex, matchAnswer, type PromptIndex } from '@/lib/match'
import { popToPoints, pointsToTier } from '@/lib/score'
import {
  MAX_ACCEPTED_ELAPSED_MS,
  type Bank,
  type ClientPrompt,
  type GameId,
  type CheckResult,
} from '@/lib/types'

/**
 * The ONLY module that reads an answer bank.
 *
 * `import 'server-only'` throws if this is ever pulled into a client component's
 * module graph — but that is a backstop, not the mechanism. It does nothing to
 * stop a bank being handed to a client component as props, where it would
 * serialise straight into the RSC payload in the served HTML. The actual guard
 * is `getClientPrompts`, which projects onto `ClientPrompt` — a type that
 * structurally cannot carry an answer.
 *
 * Banks are imported statically, one line each. Deliberately not
 * `import(\`../content/games/${id}.json\`)`, whose Turbopack context map is
 * fragile, and not `fs.readFile`, which fails on Vercel unless the files are
 * named in `outputFileTracingIncludes`.
 */
const BANKS: Partial<Record<GameId, Bank>> = {
  '1-decembrie': oneDecembrie as Bank,
  istorie: istorie as Bank,
  geografie: geografie as Bank,
  'muzica-film': muzicaFilm as Bank,
  'mancare-traditii': mancareTraditii as Bank,
  sport: sport as Bank,
  'limba-meme': limbaMeme as Bank,
  // All seven drafted. A game with no bank would show as "în curând" rather
  // than 404ing, which is how the packs appeared while they were being written.
}

/** Indices are built once per process, never per request or keystroke. */
const INDICES = new Map<string, PromptIndex>()

function indexFor(gameId: GameId, prompt: Bank['prompts'][number]): PromptIndex {
  const key = `${gameId}/${prompt.id}`
  let index = INDICES.get(key)
  if (!index) {
    index = buildPromptIndex(prompt)
    INDICES.set(key, index)
  }
  return index
}

export function isPlayable(gameId: GameId): boolean {
  return BANKS[gameId] !== undefined
}

export function playableGameIds(): GameId[] {
  return Object.keys(BANKS) as GameId[]
}

/**
 * Everything the browser is allowed to know about a game: the prompts, and how
 * many answers each accepts. No names, no aliases, no notes, no `pop`.
 */
export function getClientPrompts(gameId: GameId): ClientPrompt[] | null {
  const bank = BANKS[gameId]
  if (!bank) return null

  return bank.prompts.map((prompt) => ({
    id: prompt.id,
    region: prompt.region,
    text: prompt.text,
    answerCount: prompt.answers.length,
  }))
}

/** The region a prompt stitches — needed to score a timeout, which sends no answer. */
export function regionForPrompt(gameId: GameId, promptId: string) {
  return BANKS[gameId]?.prompts.find((p) => p.id === promptId)?.region ?? null
}

/**
 * Scores one submitted answer. A pure function of its arguments — there is no
 * per-player server state, by design: no accounts, no sessions, no leaderboard.
 */
export function checkAnswer(
  gameId: GameId,
  promptId: string,
  rawAnswer: string,
  elapsedMs?: number,
): CheckResult | null {
  const bank = BANKS[gameId]
  if (!bank) return null

  const prompt = bank.prompts.find((p) => p.id === promptId)
  if (!prompt) return null

  const miss: CheckResult = {
    matched: false,
    tier: 'ratat',
    points: 0,
    canonical: null,
    regionId: prompt.region,
  }

  // The client owns the clock — nothing else can, without sessions. This only
  // rejects the lazy cheat of replaying a prompt long after it closed.
  if (elapsedMs !== undefined && (elapsedMs < 0 || elapsedMs > MAX_ACCEPTED_ELAPSED_MS)) {
    return miss
  }

  const answer = matchAnswer(indexFor(gameId, prompt), rawAnswer)
  if (!answer) return miss

  const points = popToPoints(answer.pop)
  return {
    matched: true,
    tier: pointsToTier(points),
    points,
    canonical: answer.name,
    regionId: prompt.region,
  }
}

/** Every accepted answer with its points. Only ever served after the 7th answer. */
export function getReveal(gameId: GameId) {
  const bank = BANKS[gameId]
  if (!bank) return null

  return {
    gameId: bank.id,
    title: bank.title,
    prompts: bank.prompts.map((prompt) => ({
      id: prompt.id,
      region: prompt.region,
      text: prompt.text,
      // `note` and `alias` stay server-side: the notes are reviewer evidence,
      // and the aliases would hand out a normalisation cheat sheet.
      answers: prompt.answers
        .map((a) => ({ name: a.name, points: popToPoints(a.pop) }))
        .sort((a, b) => a.points - b.points || a.name.localeCompare(b.name, 'ro')),
    })),
  }
}
