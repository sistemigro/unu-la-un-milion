import type { Tier } from '@/lib/types'

/**
 * Banks author `pop` — "how many in 100 Romanians would name this" — and points
 * are derived here, so retuning all seven games is an edit to this table.
 * Highest `minPop` first.
 */
export const POP_THRESHOLDS = [
  { minPop: 50, points: 10 },
  { minPop: 25, points: 15 },
  { minPop: 10, points: 30 },
  { minPop: 4, points: 60 },
  { minPop: 2, points: 85 },
  { minPop: 0, points: 100 },
] as const

export function popToPoints(pop: number): number {
  // An out-of-range or non-numeric `pop` scores as the commonest answer rather
  // than throwing mid-request.
  const value = Number.isFinite(pop) ? Math.min(100, Math.max(0, pop)) : 100
  const band = POP_THRESHOLDS.find((t) => value >= t.minPop)
  return band ? band.points : 100
}

/** Six point values, five visual tiers: the card shows the nearest tier. */
export function pointsToTier(points: number): Tier {
  if (points >= 85) return 'ulm'
  if (points >= 60) return 'rar'
  if (points >= 30) return 'bun'
  if (points > 0) return 'cliseu'
  return 'ratat'
}

/** Highest `minTotal` first. */
export const TITLES = [
  { minTotal: 600, title: 'Domnitor' },
  { minTotal: 450, title: 'Patriot' },
  { minTotal: 300, title: 'Boier' },
  { minTotal: 150, title: 'Cetățean' },
  { minTotal: 0, title: 'Turist' },
] as const

export function totalToTitle(total: number): string {
  const value = Number.isFinite(total) ? Math.max(0, total) : 0
  const band = TITLES.find((t) => value >= t.minTotal)
  return band ? band.title : 'Turist'
}
