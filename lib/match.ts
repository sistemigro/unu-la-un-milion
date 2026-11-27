import type { BankAnswer, BankPrompt } from '@/lib/types'
import { expandKeys, normalize, surnameKey } from '@/lib/normalize'

export type PromptIndex = {
  promptId: string
  byKey: Map<string, BankAnswer>
  /** Bare surnames, consulted only after an exact miss. */
  bySurname: Map<string, BankAnswer>
}

/** Build once per prompt and reuse across requests — never per keystroke. */
export function buildPromptIndex(prompt: BankPrompt): PromptIndex {
  const byKey = new Map<string, BankAnswer>()
  const bySurname = new Map<string, BankAnswer>()

  for (const answer of prompt.answers) {
    for (const key of expandKeys(answer)) {
      // First writer wins, so a derived key never shadows a canonical one.
      if (!byKey.has(key)) byKey.set(key, answer)
    }
  }

  // Players type surnames — the brief's own running joke is "the whole country
  // said Hagi". Without this, "Hagi", "Halep" and "Comăneci" are all rejected:
  // they sit below the fuzzy length floor and are nobody's full name.
  //
  // Where two people share a surname, the better-known one takes it, because
  // that is what a bare "Hagi" means. Kept in a separate map so it can never
  // shadow somebody else's exact full name.
  // Words that appear mid-name anywhere in this prompt — someone's first name,
  // or a shared dynastic name. "Ivan" is Patzaichin's forename as well as Paula
  // Ivan's surname, and three different Basarabs sit in one prompt, so a bare
  // input is genuinely ambiguous. Rejected rather than guessed, exactly as an
  // ambiguous fuzzy tie is.
  const ambiguous = new Set<string>()
  for (const answer of prompt.answers) {
    const words = normalize(answer.name).split(' ')
    for (const word of words.slice(0, -1)) ambiguous.add(word)
  }

  for (const answer of prompt.answers) {
    for (const source of [answer.name, ...(Array.isArray(answer.alias) ? answer.alias : [])]) {
      const surname = surnameKey(source)
      if (!surname || byKey.has(surname) || ambiguous.has(surname)) continue

      const held = bySurname.get(surname)
      if (!held || answer.pop > held.pop) bySurname.set(surname, answer)
    }
  }

  return { promptId: prompt.id, byKey, bySurname }
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

  // Surnames before fuzzy: "Hagi" is a deliberate, complete answer, not a typo
  // of a longer one, and most surnames fall under the fuzzy length floor.
  const bySurname = index.bySurname.get(input)
  if (bySurname) return bySurname

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
