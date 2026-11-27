'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StitchMap } from '@/components/StitchMap'
import { ProgressDiamonds } from '@/components/ProgressDiamonds'
import { loadGame, type GameProgress } from '@/lib/progress'
import { totalToTitle } from '@/lib/score'
import { MAX_SCORE, PROMPTS_PER_GAME, type GameId, type RegionId, type Tier } from '@/lib/types'

export type PackMeta = { id: GameId; title: string; playable: boolean }

/**
 * Renders the empty 0/7 state on the first pass, then fills in from browser
 * storage after mount.
 *
 * The `mounted` guard is load-bearing: reading `localStorage` during render
 * produces markup that differs from the server's, which React reports as a
 * hydration mismatch — and that only shows up in a production build. It also
 * means the server-rendered HTML a crawler sees is the honest first-time view,
 * which is what most of launch day will be anyway.
 */
export function PackList({ main, packs }: { main: PackMeta; packs: PackMeta[] }) {
  const [progress, setProgress] = useState<Partial<Record<GameId, GameProgress>>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const all: Partial<Record<GameId, GameProgress>> = {}
    for (const pack of [main, ...packs]) {
      const saved = loadGame(pack.id)
      if (saved) all[pack.id] = saved
    }
    setProgress(all)
    setMounted(true)
  }, [main, packs])

  const get = (id: GameId) => (mounted ? progress[id] : undefined)
  const done = mounted ? Object.keys(progress).length : 0

  const tiersOf = (saved?: GameProgress): Partial<Record<RegionId, Tier>> =>
    Object.fromEntries((saved?.results ?? []).map((r) => [r.region, r.tier]))

  const mainSaved = get(main.id)

  return (
    <>
      <section
        aria-label="Progres"
        className="card-flat mt-4 flex flex-col gap-2 px-3.5 py-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-lg font-semibold">
            Pachete: {done}/{PROMPTS_PER_GAME}
          </span>
          <span className="text-xs text-muted">Toate 7 = Marea Unire completă</span>
        </div>
        <ProgressDiamonds done={done} />
      </section>

      {/* The main edition is the hero: on 1 December most arrivals should start here. */}
      <section className="card mt-5">
        <div className="font-display bg-brand px-3 py-1.5 text-[13px] tracking-widest text-white">
          JOCUL PRINCIPAL · 1 DECEMBRIE
        </div>
        <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4">
          <h2 className="font-display text-[26px] font-bold">{main.title}</h2>
          <StitchMap className="w-full" tiers={tiersOf(mainSaved)} />
          {mainSaved ? (
            <p className="text-sm">
              <strong>{mainSaved.score}</strong> / {MAX_SCORE} ·{' '}
              {totalToTitle(mainSaved.score)}
            </p>
          ) : (
            <p className="text-sm">7 întrebări · 20 de secunde fiecare · un scor oficial</p>
          )}
          <Link
            href={`/joc/${main.id}`}
            className="btn-thread bg-action px-3 py-3 text-center text-xl text-white"
          >
            {mainSaved ? 'Rejoacă' : 'Începe'}
          </Link>
          <p className="text-xs leading-snug text-muted">
            Aceleași întrebări pentru toată lumea, ca să vă puteți compara scorurile.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display mb-3 text-xl font-bold">Pachete tematice</h2>
        <div className="grid grid-cols-2 gap-3">
          {packs.map((pack) => {
            const saved = get(pack.id)
            return (
              <article key={pack.id} className="card-flat flex flex-col gap-1.5 p-2.5">
                {/* Two lines' worth of room: "Mâncare & tradiții" wraps and would
                    otherwise push its card's map out of line with its neighbour. */}
                <h3 className="font-display min-h-11 text-base leading-snug font-semibold">
                  {pack.title}
                </h3>
                <StitchMap className="w-full" tiers={tiersOf(saved)} />
                {!pack.playable ? (
                  <p className="text-xs text-muted">În curând</p>
                ) : saved ? (
                  <p className="text-xs">
                    <strong>{saved.score}</strong> / {MAX_SCORE} · {totalToTitle(saved.score)}
                  </p>
                ) : (
                  <p className="text-xs">Nou · 7 întrebări</p>
                )}
                {pack.playable ? (
                  <Link
                    href={`/joc/${pack.id}`}
                    className={`border-2 px-2 py-2 text-center text-[13px] font-bold ${
                      saved ? 'bg-card text-ink' : 'bg-action text-white'
                    }`}
                  >
                    {saved ? 'Rejoacă' : 'Joacă'}
                  </Link>
                ) : (
                  <span className="border-2 border-dashed border-placeholder px-2 py-2 text-center text-[13px] font-bold text-muted">
                    Curând
                  </span>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
