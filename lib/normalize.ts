import type { BankAnswer } from '@/lib/types'

/**
 * Never `Intl.Collator`: Romanian collation treats `ș` as a distinct primary
 * letter, so even `sensitivity: 'base'` keeps `Mures` and `Mureș` apart. An
 * explicit NFD strip is the only thing that folds both `ș` U+0219 and the
 * cedilla `ş` U+015F onto `s`.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Definite articles, longest first so `-ul` wins over `-l`-like overlaps. */
const ARTICLES = ['ul', 'ua', 'le', 'a']

const MIN_KEY_LENGTH = 3

function stripArticle(key: string): string | null {
  for (const article of ARTICLES) {
    if (!key.endsWith(article)) continue
    const stripped = key.slice(0, -article.length)
    // A 2-letter key would fuzzy- and exact-match far too much.
    if (stripped.length < MIN_KEY_LENGTH) return null
    return stripped
  }
  return null
}

/**
 * Variants are expanded on the bank side only — user input gets `normalize`
 * and nothing else, so no rule here can maim what a player typed.
 */
export function expandKeys(answer: BankAnswer): string[] {
  const keys = new Set<string>()
  // A bare string where an array belongs would spread into single characters
  // ("chișcă" → c, h, i, ș, c, ă), quietly filling the index with one-letter
  // keys that match almost anything. Coerce instead; `tests/banks.test.ts`
  // still fails the bank loudly so the data gets fixed.
  const aliases =
    typeof answer.alias === 'string' ? [answer.alias] : (answer.alias ?? [])
  const base = [answer.name, ...aliases]

  for (const raw of base) {
    const key = normalize(raw)
    if (!key) continue
    // A short canonical name stays verbatim; only derived forms get the floor.
    keys.add(key)
    const stripped = stripArticle(key)
    if (stripped) keys.add(stripped)
  }

  return [...keys]
}
