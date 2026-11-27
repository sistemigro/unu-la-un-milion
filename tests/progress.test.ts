import { beforeEach, describe, expect, it } from 'vitest'
import { loadGame, saveGame, saveResultDetails, type GameProgress } from '@/lib/progress'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} })

const first: GameProgress = { score: 100, finishedAt: 'first', results: [{ promptId: 'p', region: 'banat-crisana', answer: 'a', tier: 'bun', points: 100 }] }
const replay: GameProgress = { score: 0, finishedAt: 'second', results: [{ ...first.results[0], tier: 'ratat', points: 0 }] }

describe('game progress', () => {
  beforeEach(() => storage.clear())
  it('preserves the official score but stores the latest replay map', () => {
    saveGame('1-decembrie', first)
    saveGame('1-decembrie', replay)
    expect(loadGame('1-decembrie')).toMatchObject({ score: 100, finishedAt: 'first', results: first.results, latestResults: replay.results })
  })
  it('keeps player details for the latest run and clears them on replay', () => {
    saveGame('1-decembrie', first)
    saveResultDetails('1-decembrie', first.results, [{ promptId: 'p', text: 'Question', fact: 'Fact' }])
    expect(loadGame('1-decembrie')?.details).toEqual([{ promptId: 'p', text: 'Question', fact: 'Fact' }])
    saveGame('1-decembrie', replay)
    saveResultDetails('1-decembrie', first.results, [{ promptId: 'p', text: 'Old question' }])
    expect(loadGame('1-decembrie')?.details).toBeUndefined()
    expect(loadGame('1-decembrie')?.score).toBe(100)
  })
})
