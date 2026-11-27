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
 * Place words that end a great many Romanian names without identifying one.
 * Six different champion clubs end in "București", so indexing that tail would
 * hand the bare city name to whichever happened to be most popular.
 */
const PLACE_TAILS = new Set([
  'bucuresti',
  'cluj',
  'timisoara',
  'iasi',
  'constanta',
  'craiova',
  'ploiesti',
  'arad',
  'oradea',
  'galati',
  'brasov',
  'sibiu',
  'pitesti',
  'bacau',
  'targoviste',
  'romania',
  'romanesc',
  'romaneasca',
  'arena',
  'stadionul',
])

/**
 * The bare surname a player is most likely to type — "Hagi" for Gheorghe Hagi.
 *
 * Returns null where the last word is not a surname:
 *  - Romanian epithets, which are built with "cel": "Ștefan cel Mare" would
 *    otherwise be indexed under "mare".
 *  - place names (above), and anything under 4 characters, which includes
 *    regnal numerals like "Radu I".
 */
export function surnameKey(name: string): string | null {
  const key = normalize(name)
  const words = key.split(' ')
  if (words.length < 2) return null
  if (key.includes(' cel ')) return null

  const last = words[words.length - 1]
  if (last.length < 4) return null
  if (PLACE_TAILS.has(last)) return null

  // The tail must be a proper noun in the original spelling. Romanian
  // capitalisation separates a surname from an ingredient cleanly: "Gheorghe
  // Hagi" ends in a name, "Ciorbă de fasole" and "Orez cu lapte" end in a
  // common noun that identifies no dish at all.
  const originalTail = name.trim().split(/\s+/).pop() ?? ''
  const firstLetter = originalTail[0] ?? ''
  if (firstLetter !== firstLetter.toLocaleUpperCase('ro')) return null

  return last
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
