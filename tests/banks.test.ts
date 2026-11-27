import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { withinOneEdit } from '@/lib/match'
import { expandKeys, normalize } from '@/lib/normalize'
import { popToPoints } from '@/lib/score'
import {
  GAME_IDS,
  PROMPTS_PER_GAME,
  REGION_IDS,
  isGameId,
  type Bank,
  type GameId,
} from '@/lib/types'

/**
 * This file IS the content review tool.
 *
 * Everything structural is asserted here so the human reviewer spends their
 * time only on facts — is this answer true, and is `pop` plausible — rather
 * than on shape, duplicates or matcher ambiguity.
 */

const GAMES_DIR = join(import.meta.dirname, '../content/games')
const CANARY = 'ZZ-BANK-CANARY-ZZ'
const FUZZY_MIN_LENGTH = 6

const files = readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json'))

const banks = new Map<GameId, Bank>()
for (const file of files) {
  const bank = JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf8')) as Bank
  banks.set(bank.id, bank)
}

const present = [...banks.keys()].sort()
const missing = GAME_IDS.filter((id) => !banks.has(id))

describe('bank inventory', () => {
  it('file name matches the id inside', () => {
    for (const file of files) {
      const bank = JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf8')) as Bank
      expect(`${bank.id}.json`, `${file} declares id "${bank.id}"`).toBe(file)
    }
  })

  it('every bank id is a known game', () => {
    for (const id of present) {
      expect(isGameId(id), `"${id}" is not in GAME_IDS`).toBe(true)
    }
  })

  // Enable before launch: all seven must ship. Until then this would make the
  // suite permanently red, which trains everyone to ignore it.
  it.skip('all seven games have a bank', () => {
    expect(missing, `still to draft: ${missing.join(', ')}`).toEqual([])
  })
})

describe.each(present)('%s', (gameId) => {
  const bank = banks.get(gameId)!

  it('carries the leak canary', () => {
    expect(bank.canary).toBe(CANARY)
  })

  it(`has exactly ${PROMPTS_PER_GAME} prompts`, () => {
    expect(bank.prompts).toHaveLength(PROMPTS_PER_GAME)
  })

  it('maps prompts onto the seven regions in order', () => {
    expect(bank.prompts.map((p) => p.region)).toEqual([...REGION_IDS])
  })

  it('has unique prompt ids', () => {
    const ids = bank.prompts.map((p) => p.id)
    expect(new Set(ids).size, `duplicate prompt id in ${ids.join(', ')}`).toBe(ids.length)
  })

  it('states an acceptance boundary for every prompt', () => {
    for (const prompt of bank.prompts) {
      expect(prompt.accepts?.trim(), `${prompt.id} has no "accepts"`).toBeTruthy()
      expect(prompt.text?.trim(), `${prompt.id} has no text`).toBeTruthy()
    }
  })

  describe.each(bank.prompts.map((p) => [p.id, p] as const))('%s', (_id, prompt) => {
    it('has 15-30 answers', () => {
      expect(prompt.answers.length).toBeGreaterThanOrEqual(15)
      expect(prompt.answers.length).toBeLessThanOrEqual(30)
    })

    it('declares alias as an array of lowercase strings', () => {
      // A bare string here spreads into single characters downstream, which
      // poisons the match index with one-letter keys. Caught explicitly so the
      // failure names the real cause.
      for (const answer of prompt.answers) {
        if (answer.alias === undefined) continue
        expect(
          Array.isArray(answer.alias),
          `${answer.name}: alias must be an array, got ${typeof answer.alias}`,
        ).toBe(true)
        for (const alias of answer.alias) {
          expect(typeof alias, `${answer.name}: alias entries must be strings`).toBe('string')
        }
      }
    })

    it('has pop in 1..100 and a fact-check note on every answer', () => {
      for (const answer of prompt.answers) {
        expect(Number.isInteger(answer.pop), `${answer.name}: pop must be an integer`).toBe(
          true,
        )
        expect(answer.pop, `${answer.name}: pop out of range`).toBeGreaterThanOrEqual(1)
        expect(answer.pop, `${answer.name}: pop out of range`).toBeLessThanOrEqual(100)
        expect(answer.note?.trim(), `${answer.name} has no note`).toBeTruthy()
      }
    })

    it('spans the score range', () => {
      const points = prompt.answers.map((a) => popToPoints(a.pop))
      // Without a cliché the prompt feels unfair; without a rare answer there
      // is no payoff. Both ends have to exist.
      expect(points.filter((p) => p === 10).length, 'no cliché answer').toBeGreaterThan(0)
      expect(points.filter((p) => p >= 85).length, 'no rare answer').toBeGreaterThan(0)
    })

    it('is NFC-normalised', () => {
      // An LLM or a macOS round-trip can emit NFD, and then an exact match
      // silently fails against a visually identical string.
      for (const answer of prompt.answers) {
        expect(answer.name.normalize('NFC'), `${answer.name} is not NFC`).toBe(answer.name)
        for (const alias of answer.alias ?? []) {
          expect(alias.normalize('NFC'), `${alias} is not NFC`).toBe(alias)
        }
      }
      expect(prompt.text.normalize('NFC')).toBe(prompt.text)
    })

    it('has no two answers sharing a normalised key', () => {
      // The likeliest authoring bug: a collision makes one answer unreachable,
      // because the index keeps the first writer.
      const owner = new Map<string, string>()
      for (const answer of prompt.answers) {
        for (const key of expandKeys(answer)) {
          const existing = owner.get(key)
          expect(
            existing,
            `"${key}" is claimed by both "${existing}" and "${answer.name}"`,
          ).toBeUndefined()
          owner.set(key, answer.name)
        }
      }
    })

    it('reports answers within one edit of each other', () => {
      // NOT a failure. Exact keys are matched before fuzzy, so near-twin
      // answers still resolve correctly when spelled right — and Romanian
      // history supplies genuine ones (Vlad II Dracul and Vlad III Țepeș are
      // father and son, one edit apart in every naming scheme).
      //
      // What such a pair does mean: a typo landing one edit from BOTH is
      // rejected rather than guessed, which is the behaviour we want. This
      // prints the pairs so a reviewer knows where that applies.
      const entries: [string, string][] = []
      for (const answer of prompt.answers) {
        for (const key of expandKeys(answer)) entries.push([key, answer.name])
      }

      const pairs: string[] = []
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [keyA, nameA] = entries[i]
          const [keyB, nameB] = entries[j]
          if (nameA === nameB) continue
          if (keyA.length < FUZZY_MIN_LENGTH || keyB.length < FUZZY_MIN_LENGTH) continue
          if (keyA[0] !== keyB[0]) continue
          if (withinOneEdit(keyA, keyB)) {
            pairs.push(`"${keyA}" (${nameA}) ~ "${keyB}" (${nameB})`)
          }
        }
      }

      if (pairs.length) {
        console.warn(`  near-twin answers in ${prompt.id}:\n    ${pairs.join('\n    ')}`)
      }
      expect(true).toBe(true)
    })

    it('normalises every answer to something non-empty', () => {
      for (const answer of prompt.answers) {
        expect(normalize(answer.name), `${answer.name} normalises to nothing`).toBeTruthy()
      }
    })
  })
})
