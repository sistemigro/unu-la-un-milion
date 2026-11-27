import { describe, expect, it } from 'vitest'
import type { BankPrompt } from '@/lib/types'
import { buildPromptIndex, matchAnswer } from '@/lib/match'

const domnitori: BankPrompt = {
  id: 'domnitori-moldova',
  region: 'moldova',
  text: 'Un domnitor al Moldovei',
  accepts: 'Orice domnitor al Moldovei, 1359–1859',
  answers: [
    { name: 'Ștefan cel Mare', pop: 71, alias: ['ștefan iii'] },
    { name: 'Petru Rareș', pop: 9, alias: ['rareș'] },
    { name: 'Ieremia Movilă', pop: 1 },
  ],
}

const rauri: BankPrompt = {
  id: 'rauri',
  region: 'oltenia',
  text: 'Un râu din România',
  accepts: 'Orice râu din România',
  answers: [
    { name: 'Dunărea', pop: 80 },
    { name: 'Oltul', pop: 40 },
  ],
}

/** Two keys one substitution apart, so no input can pick a winner. */
const ambigue: BankPrompt = {
  id: 'ambigue',
  region: 'muntenia',
  text: 'Un nume',
  accepts: 'Oricare',
  answers: [
    { name: 'Marina', pop: 20 },
    { name: 'Marine', pop: 20 },
  ],
}

describe('matchAnswer', () => {
  it('matches an alias', () => {
    const index = buildPromptIndex(domnitori)
    expect(matchAnswer(index, 'rares')?.name).toBe('Petru Rareș')
    expect(matchAnswer(index, 'Rareș')?.name).toBe('Petru Rareș')
  })

  it('matches with and without the definite article, and with diacritics', () => {
    const index = buildPromptIndex(rauri)
    expect(matchAnswer(index, 'dunare')?.name).toBe('Dunărea')
    expect(matchAnswer(index, 'Dunarea')?.name).toBe('Dunărea')
    expect(matchAnswer(index, 'Dunărea')?.name).toBe('Dunărea')
    expect(matchAnswer(index, 'olt')?.name).toBe('Oltul')
  })

  it('ignores surrounding punctuation and case', () => {
    const index = buildPromptIndex(domnitori)
    expect(matchAnswer(index, '  ȘTEFAN CEL MARE!  ')?.name).toBe('Ștefan cel Mare')
  })

  it('rejects a cross-category answer', () => {
    const index = buildPromptIndex(domnitori)
    expect(matchAnswer(index, 'Mircea cel Bătrân')).toBeNull()
  })

  it('rejects an empty input', () => {
    expect(matchAnswer(buildPromptIndex(rauri), '   ')).toBeNull()
  })

  it('never fuzzy-matches Olt against Alt — under the 6-character floor', () => {
    const index = buildPromptIndex(rauri)
    expect(matchAnswer(index, 'Alt')).toBeNull()
    expect(matchAnswer(index, 'Olta')).toBeNull()
  })

  it('accepts a single typo at length >= 6', () => {
    const index = buildPromptIndex(rauri)
    expect(matchAnswer(index, 'Dunerea')?.name).toBe('Dunărea') // substitution
    expect(matchAnswer(index, 'Dunareaa')?.name).toBe('Dunărea') // insertion
    expect(matchAnswer(index, 'Dunara')?.name).toBe('Dunărea') // deletion
    expect(matchAnswer(index, 'Dunarae')?.name).toBe('Dunărea') // transposition
  })

  it('rejects an ambiguous distance-1 tie rather than guessing', () => {
    const index = buildPromptIndex(ambigue)
    expect(matchAnswer(index, 'marinx')).toBeNull()
    // An exact key still wins, ambiguity or not.
    expect(matchAnswer(index, 'marina')?.name).toBe('Marina')
  })

  it('rejects an input that differs only in its first letter', () => {
    const index = buildPromptIndex(rauri)
    expect(matchAnswer(index, 'xunarea')).toBeNull()
  })

  it('rejects anything more than one edit away', () => {
    const index = buildPromptIndex(domnitori)
    expect(matchAnswer(index, 'stefen cel mure')).toBeNull()
  })
})
