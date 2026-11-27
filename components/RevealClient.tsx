'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StitchDefs, StitchMap } from '@/components/StitchMap'
import { loadGame, saveResultDetails, type GameProgress, type PromptResult, type ResultDetail } from '@/lib/progress'
import { MAX_SCORE, REGION_LABELS, TIER_FILL, TIER_LABELS, type GameId, type RegionId, type Tier } from '@/lib/types'

type RevealAnswer = { name: string; points: number; fact?: string }
type RevealPrompt = { id: string; region: RegionId; text: string; answers: RevealAnswer[] }
type Reveal = { prompts: RevealPrompt[] }

/** Answer data is fetched only after the server confirms completion. */
export function RevealClient({ gameId, title, embedded = false, results }: {
  gameId: GameId; title: string; embedded?: boolean; results?: PromptResult[]
}) {
  const [details, setDetails] = useState<ResultDetail[] | null>(null)
  const [saved, setSaved] = useState<GameProgress | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const progress = loadGame(gameId)
    setSaved(progress)
    const currentResults = results ?? progress?.latestResults ?? []
    if (!results && progress?.details) { setDetails(progress.details); return }
    setError(false)
    const controller = new AbortController()
    fetch(`/api/reveal/${gameId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Reveal) => {
        const selected = data.prompts.flatMap((prompt) => {
          const result = currentResults.find((item) => item.promptId === prompt.id && item.answer)
          if (!result) return []
          const answer = prompt.answers.find((item) => item.name.toLocaleLowerCase('ro') === result.answer.toLocaleLowerCase('ro'))
          return [{ promptId: prompt.id, text: prompt.text, fact: answer?.fact }]
        })
        setDetails(selected)
        saveResultDetails(gameId, currentResults, selected)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [gameId, attempt, results])

  const mine = results ?? saved?.latestResults ?? []
  const tiers = Object.fromEntries(mine.map((r) => [r.region, r.tier])) as Partial<Record<RegionId, Tier>>
  return (
    <div className={embedded ? 'mt-6 text-left' : 'px-5 py-6'}>
      {!embedded && <><Link href="/" className="text-sm font-bold">‹ Înapoi la pachete</Link><h1 className="font-display mt-4 text-xl font-bold">{title}</h1>{saved && <><StitchDefs /><StitchMap className="mt-3 w-full" tiers={tiers} outlines /><p className="mt-2 text-sm">Scorul acestei runde: {mine.reduce((sum, result) => sum + result.points, 0)} / {MAX_SCORE}</p><p className="text-sm">Scor: {saved.score} / {MAX_SCORE}</p></>}</>}
      <h2 className="font-display mt-4 text-xl font-bold">Răspunsuri</h2>
      <p className="mt-2 text-sm leading-snug">Răspunsurile tale și explicațiile lor.</p>
      {error && <div role="status" className="card-flat mt-4 p-4 text-sm">Explicațiile nu sunt disponibile pentru această rundă. <button type="button" className="underline" onClick={() => setAttempt((n) => n + 1)}>Reîncearcă</button></div>}
      {!details && !error && <p role="status" className="mt-4 text-sm text-muted">Se încarcă răspunsurile…</p>}
      <div className="mt-4 flex flex-col gap-2.5">
        {mine.map((result, i) => {
          if (!result.answer) return null
          const detail = details?.find((item) => item.promptId === result.promptId)
          return (
            <section key={result.promptId} className="card-flat p-3">
              <p className="font-display text-xs tracking-widest text-brand">{i + 1} · {REGION_LABELS[result.region].toUpperCase()}</p>
              {detail && <h3 className="mt-1 text-[15px] font-bold">{detail.text}</h3>}
              <p className="mt-2 self-start border-2 px-2 py-0.5 text-[13px]" style={{ background: TIER_FILL[result.tier], color: result.tier === 'bun' || result.tier === 'ulm' || result.tier === 'ratat' ? '#fff' : '#1E1A1A' }}>Tu: {result.answer} · {TIER_LABELS[result.tier]} · {result.points} p</p>
              {detail?.fact && <p className="mt-3 text-xs leading-snug">{detail.fact}</p>}
            </section>
          )
        })}
      </div>
    </div>
  )
}
