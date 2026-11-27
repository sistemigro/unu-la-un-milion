import type { BankAnswer, BankPrompt } from '@/lib/types'
import { expandKeys, normalize } from '@/lib/normalize'

export type PromptIndex = {
  promptId: string
  byKey: Map<string, BankAnswer>
}

/** Build once per prompt and reuse across requests — never per keystroke. */
export function buildPromptIndex(prompt: BankPrompt): PromptIndex {
  const byKey = new Map<string, BankAnswer>()
  for (const answer of prompt.answers) {
    for (const key of expandKeys(answer)) {
      // First writer wins, so a derived key never shadows a canonical one.
      if (!byKey.has(key)) byKey.set(key, answer)
    }
  }
  return { promptId: prompt.id, byKey }
}

/** Below this, a one-edit neighbourhood is full of unrelated real words. */
const FUZZY_MIN_LENGTH = 6

/**
 * True when `a` and `b` are at most one edit apart — substitution, insertion,
 * deletion, or one transposition of adjacent characters (the commonest typing
 * slip). Bails as soon as a second edit is needed, so this stays O(n) per key.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false

  const [short, long] = a.length <= b.length ? [a, b] : [b, a]

  let i = 0
  while (i < short.length && short[i] === long[i]) i++

  if (short.length === long.length) {
    // One substitution: the tails must match from the next character on.
    if (short.slice(i + 1) === long.slice(i + 1)) return true
    // One transposition of adjacent characters.
    return (
      short[i] === long[i + 1] &&
      short[i + 1] === long[i] &&
      short.slice(i + 2) === long.slice(i + 2)
    )
  }

  // One insertion into `short` (equivalently, one deletion from `long`).
  return short.slice(i) === long.slice(i + 1)
}

export function matchAnswer(index: PromptIndex, rawInput: string): BankAnswer | null {
  const input = normalize(rawInput)
  if (!input) return null

  const exact = index.byKey.get(input)
  if (exact) return exact

  if (input.length < FUZZY_MIN_LENGTH) return null

  let found: BankAnswer | null = null
  for (const [key, answer] of index.byKey) {
    // A wrong first letter is a different word far more often than a typo.
    if (key[0] !== input[0]) continue
    if (!withinOneEdit(key, input)) continue
    if (found && found !== answer) return null // ambiguous: reject, never guess
    found = answer
  }
  return found
}
