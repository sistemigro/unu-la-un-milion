'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadGame, type GameProgress } from '@/lib/progress'
import {
  MAX_SCORE,
  REGION_LABELS,
  TIER_FILL,
  TIER_LABELS,
  type GameId,
  type RegionId,
  type Tier,
} from '@/lib/types'
import { pointsToTier } from '@/lib/score'

type RevealAnswer = { name: string; points: number }
type RevealPrompt = { id: string; region: RegionId; text: string; answers: RevealAnswer[] }
type Reveal = { gameId: GameId; title: string; prompts: RevealPrompt[] }

/**
 * The answer reveal, fetched rather than server-rendered.
 *
 * This is the one deliberate exception to the server-rendering house rule:
 * publishing every accepted answer as crawlable HTML would defeat the game.
 * The route carries `robots: noindex`, is absent from the sitemap, and the
 * response sends `x-robots-tag`.
 */
export function RevealClient({ gameId, title }: { gameId: GameId; title: string }) {
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [saved, setSaved] = useState<GameProgress | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setSaved(loadGame(gameId))

    const controller = new AbortController()
    fetch(`/api/reveal/${gameId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setReveal)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true)
      })

    return () => controller.abort()
  }, [gameId])

  const mine = new Map(saved?.results.map((r) => [r.promptId, r]) ?? [])

  return (
    <div className="px-5 py-6">
      <div className="-mx-5 -mt-6 mb-4 flex items-center justify-between border-b-2 bg-card px-5 py-3">
        <Link href={`/joc/${gameId}`} className="text-sm font-bold no-underline">
          ‹ Înapoi
        </Link>
        <span className="font-display text-base font-semibold">Răspunsuri</span>
        <span className="font-display text-base font-bold text-brand">
          {saved ? `${saved.score} p` : '—'}
        </span>
      </div>

      <h1 className="font-display text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm leading-snug">
        Toate răspunsurile acceptate și punctele lor. Al tău e marcat cu chenar gros.
      </p>
      <p className="mt-1 text-xs text-muted">
        Atinge o întrebare ca să vezi toate răspunsurile acceptate.
      </p>

      {error && (
        <p role="status" className="card-flat mt-4 p-4 text-sm">
          Nu am putut încărca răspunsurile. Reîncarcă pagina.
        </p>
      )}

      {!reveal && !error && (
        <p role="status" className="mt-4 text-sm text-muted">
          Se încarcă răspunsurile…
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {reveal?.prompts.map((prompt, i) => {
          const result = mine.get(prompt.id)
          const missed = !result || result.points === 0

          return (
            <details key={prompt.id} className="card-flat p-3">
              {/* `display:flex` on a <summary> drops the default disclosure
                  marker, so the chevron is drawn explicitly — without it
                  nothing signals that these open. */}
              <summary className="flex cursor-pointer flex-col gap-1.5 [&::-webkit-details-marker]:hidden">
                <span className="font-display flex items-center gap-1.5 text-xs tracking-widest text-brand">
                  <span aria-hidden="true">▸</span>
                  {i + 1} · {REGION_LABELS[prompt.region].toUpperCase()}
                </span>
                <span className="text-[15px] font-bold">{prompt.text}</span>
                {result && !missed ? (
                  <span
                    className="self-start border-2 px-2 py-0.5 text-[13px]"
                    style={{
                      background: TIER_FILL[result.tier],
                      color: result.tier === 'bun' || result.tier === 'ulm' ? '#fff' : '#1E1A1A',
                    }}
                  >
                    Tu: <strong>{result.answer}</strong> · {TIER_LABELS[result.tier]} ·{' '}
                    {result.points} p
                  </span>
                ) : (
                  <span className="self-start border-2 bg-tier-ratat px-2 py-0.5 text-[13px] text-white">
                    {result ? 'Ratat · 0 p' : 'Nejucat'}
                  </span>
                )}
              </summary>

              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {prompt.answers.map((answer) => {
                  const isMine =
                    result?.answer?.toLocaleLowerCase('ro') === answer.name.toLocaleLowerCase('ro')
                  const tier: Tier = pointsToTier(answer.points)
                  return (
                    <span
                      key={answer.name}
                      className={
                        isMine
                          ? 'border-[3px] px-1.5 py-0.5 font-bold'
                          : 'border border-hairline px-1.5 py-0.5'
                      }
                      style={isMine ? { background: TIER_FILL[tier] } : undefined}
                    >
                      {answer.name} · {answer.points}
                    </span>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>

      {saved && (
        <p className="mt-5 text-center text-sm text-muted">
          {saved.score} / {MAX_SCORE} de puncte
        </p>
      )}

      <Link
        href={`/joc/${gameId}`}
        className="btn-thread mt-4 block bg-card px-3 py-2.5 text-center text-lg"
      >
        Înapoi la harta ta
      </Link>
    </div>
  )
}
