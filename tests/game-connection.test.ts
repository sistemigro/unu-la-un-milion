import { describe, expect, it } from 'vitest'
import { reducer } from '../components/GameClient'

describe('answer connection failure', () => {
  it('keeps the current question and score intact so the answer can be retried', () => {
    const state = {
      phase: 'submitting' as const,
      index: 0,
      promptStartedAt: 1000,
      results: [],
      last: null,
      rejected: null,
      offline: false,
      skipped: false,
    }

    const failed = reducer(state, { type: 'check-error' })
    expect(failed.phase).toBe('check-error')
    expect(failed.results).toEqual([])
    expect(failed.last).toBeNull()
    expect(reducer(failed, { type: 'submit' }).phase).toBe('submitting')
  })
})
