import { describe, expect, it } from 'vitest'
import { expandKeys, normalize } from '@/lib/normalize'

describe('normalize', () => {
  it('folds comma-below, cedilla and plain letters onto one key', () => {
    expect(normalize('Mureș')).toBe('mures')
    expect(normalize('Mureş')).toBe('mures')
    expect(normalize('Mures')).toBe('mures')

    expect(normalize('țara')).toBe('tara')
    expect(normalize('ţara')).toBe('tara')
    expect(normalize('tara')).toBe('tara')
  })

  it('strips the remaining Romanian diacritics', () => {
    expect(normalize('ă â î')).toBe('a a i')
    expect(normalize('Ștefan cel Mare')).toBe('stefan cel mare')
  })

  it('gives NFD and NFC spellings the same key', () => {
    const word = 'Dunărea'
    expect(normalize(word.normalize('NFD'))).toBe(normalize(word.normalize('NFC')))
  })

  it('turns punctuation and hyphens into separators', () => {
    expect(normalize('Târgu-Mureș')).toBe('targu mures')
    expect(normalize('  Ștefan,  cel   Mare! ')).toBe('stefan cel mare')
  })
})

describe('expandKeys', () => {
  it('strips the definite article', () => {
    expect(expandKeys({ name: 'Dunărea', pop: 50 })).toContain('dunare')
    expect(expandKeys({ name: 'Oltul', pop: 50 })).toContain('olt')
    expect(expandKeys({ name: 'Siretul', pop: 50 })).toContain('siret')
  })

  it('keeps the canonical name and every alias', () => {
    const keys = expandKeys({ name: 'Petru Rareș', pop: 9, alias: ['Rareș'] })
    expect(keys).toContain('petru rares')
    expect(keys).toContain('rares')
  })

  it('never derives a key under 3 characters', () => {
    expect(expandKeys({ name: 'Ziua', pop: 50 })).not.toContain('zi')
    for (const name of ['Dunărea', 'Oltul', 'Alba', 'Olanda', 'Ziua']) {
      const derived = expandKeys({ name, pop: 50 }).filter((k) => k !== normalize(name))
      for (const key of derived) expect(key.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('de-duplicates', () => {
    const keys = expandKeys({ name: 'Olt', pop: 50, alias: ['olt', 'OLT'] })
    expect(keys).toEqual(['olt'])
  })
})
