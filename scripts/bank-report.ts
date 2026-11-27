/**
 * Prints a bank as markdown tables for fact review.
 *
 *   npm run bank:report -- istorie          one game
 *   npm run bank:report                     every drafted game
 *   npm run bank:report -- istorie --rare   only pop <= 3, the riskiest claims
 *
 * The reviewer reads this in the terminal, corrects the one JSON line that is
 * wrong, and re-runs. There is deliberately no admin UI: `npx vitest run banks`
 * already catches everything structural, so the only thing left for a human is
 * "is this true, and is `pop` plausible".
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pointsToTier, popToPoints } from '../lib/score'
import { REGION_LABELS, TIER_LABELS, type Bank } from '../lib/types'

const GAMES_DIR = join(import.meta.dirname, '../content/games')

const args = process.argv.slice(2)
const rareOnly = args.includes('--rare')
const wanted = args.filter((a) => !a.startsWith('--'))

const files = readdirSync(GAMES_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => wanted.length === 0 || wanted.includes(f.replace(/\.json$/, '')))

if (files.length === 0) {
  console.error(
    wanted.length ? `No bank for: ${wanted.join(', ')}` : 'No banks in content/games',
  )
  process.exit(1)
}

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length))

for (const file of files) {
  const bank = JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf8')) as Bank

  console.log(`\n# ${bank.title}  (${bank.id})\n`)

  for (const [i, prompt] of bank.prompts.entries()) {
    const answers = [...prompt.answers]
      .filter((a) => !rareOnly || a.pop <= 3)
      .sort((a, b) => b.pop - a.pop)

    if (answers.length === 0) continue

    console.log(`## ${i + 1}. ${prompt.text}`)
    console.log(`*${REGION_LABELS[prompt.region]} · ${prompt.id}*`)
    console.log(`**Acceptă:** ${prompt.accepts}\n`)

    const nameWidth = Math.max(8, ...answers.map((a) => [...a.name].length))
    console.log(`| ${pad('Răspuns', nameWidth)} | pop | pct | ${pad('Nivel', 17)} | Notă`)
    console.log(`|${'-'.repeat(nameWidth + 2)}|-----|-----|${'-'.repeat(19)}|------`)

    for (const answer of answers) {
      const points = popToPoints(answer.pop)
      console.log(
        `| ${pad(answer.name, nameWidth)} | ${pad(String(answer.pop), 3)} | ${pad(String(points), 3)} | ${pad(TIER_LABELS[pointsToTier(points)], 17)} | ${answer.note ?? ''}`,
      )
    }

    // The shape of the distribution is as reviewable as the facts: a prompt
    // with no cliché feels unfair, one with no rare answer has no payoff.
    const spread = answers.reduce<Record<number, number>>((acc, a) => {
      const p = popToPoints(a.pop)
      acc[p] = (acc[p] ?? 0) + 1
      return acc
    }, {})
    const summary = [10, 15, 30, 60, 85, 100]
      .map((p) => `${p}p×${spread[p] ?? 0}`)
      .join('  ')
    console.log(`\n${answers.length} răspunsuri · ${summary}\n`)
  }
}
