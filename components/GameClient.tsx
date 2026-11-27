'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { StitchDefs, StitchMap } from '@/components/StitchMap'
import { markInFlight, saveGame, takeInFlight, type PromptResult } from '@/lib/progress'
import { pointsToTier, totalToTitle } from '@/lib/score'
import {
  ANSWER_MS,
  MAX_ANSWER_LENGTH,
  MAX_SCORE,
  PREVIEW_MS,
  REGION_LABELS,
  TIER_FILL,
  TIER_LABELS,
  TIER_SQUARE,
  type CheckRequest,
  type CheckResult,
  type ClientPrompt,
  type GameId,
  type RegionId,
  type Tier,
} from '@/lib/types'

type Props = { gameId: GameId; title: string; prompts: ClientPrompt[] }

type Phase = 'idle' | 'preview' | 'answering' | 'submitting' | 'result' | 'finished'

type State = {
  phase: Phase
  index: number
  /** The single clock stamp for the current prompt. Everything derives from it. */
  promptStartedAt: number
  results: PromptResult[]
  /** The outcome shown on the result card. */
  last: PromptResult | null
  /** What the player typed and had rejected, for the role="status" message. */
  rejected: string | null
  offline: boolean
}

type Action =
  | { type: 'begin'; at: number }
  | { type: 'resume'; results: PromptResult[]; index: number; at: number }
  | { type: 'answer' }
  | { type: 'submit' }
  | { type: 'miss'; answer: string }
  | { type: 'score'; result: PromptResult; offline?: boolean }
  | { type: 'next'; at: number; total: number }

const SEGMENTS = Math.round(ANSWER_MS / 1000)

const previewEndsAt = (startedAt: number) => startedAt + PREVIEW_MS
const answerEndsAt = (startedAt: number) => startedAt + PREVIEW_MS + ANSWER_MS

function ratat(prompt: ClientPrompt, answer = ''): PromptResult {
  return { promptId: prompt.id, region: prompt.region, answer, tier: 'ratat', points: 0 }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'begin':
      return { ...state, phase: 'preview', index: 0, promptStartedAt: action.at }
    case 'resume':
      return {
        ...state,
        phase: 'preview',
        index: action.index,
        promptStartedAt: action.at,
        results: action.results,
        last: null,
      }
    case 'answer':
      return state.phase === 'preview' ? { ...state, phase: 'answering' } : state
    case 'submit':
      return { ...state, phase: 'submitting', rejected: null, offline: false }
    case 'miss':
      return { ...state, phase: 'answering', rejected: action.answer }
    case 'score':
      return {
        ...state,
        phase: 'result',
        rejected: null,
        offline: action.offline ?? false,
        last: action.result,
        results: [...state.results, action.result],
      }
    case 'next': {
      const next = { ...state, last: null, rejected: null, offline: false }
      if (state.index + 1 >= action.total) return { ...next, phase: 'finished' }
      return { ...next, phase: 'preview', index: state.index + 1, promptStartedAt: action.at }
    }
  }
}

async function postCheck(body: CheckRequest): Promise<CheckResult> {
  const response = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  // A non-2xx is a failure, not a miss: a miss is a scored answer.
  if (!response.ok) throw new Error(`check failed: ${response.status}`)
  return (await response.json()) as CheckResult
}

export function GameClient({ gameId, title, prompts }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    phase: 'idle',
    index: 0,
    promptStartedAt: 0,
    results: [],
    last: null,
    rejected: null,
    offline: false,
  })
  const [draft, setDraft] = useState('')
  const [segmentsLeft, setSegmentsLeft] = useState(SEGMENTS)
  const inputRef = useRef<HTMLInputElement>(null)

  const prompt = prompts[state.index]
  const { phase, promptStartedAt } = state
  const finished = phase === 'finished'

  const tiers: Partial<Record<RegionId, Tier>> = {}
  for (const r of state.results) tiers[r.region] = r.tier

  const score = state.results.reduce((total, r) => total + r.points, 0)

  // Mid-prompt reload: the marker this session never cleared. The prompts up to
  // and including it are lost, so they score Ratat — reloading must never be
  // worth more than playing on.
  useEffect(() => {
    const interrupted = takeInFlight(gameId)
    if (!interrupted) return

    const at = prompts.findIndex((p) => p.id === interrupted)
    if (at < 0) return

    const lost = prompts.slice(0, at + 1).map((p) => ratat(p))
    if (at + 1 >= prompts.length) {
      dispatch({ type: 'resume', results: lost.slice(0, -1), index: at, at: Date.now() })
      dispatch({ type: 'score', result: lost[at] })
      return
    }
    dispatch({ type: 'resume', results: lost, index: at + 1, at: Date.now() })
  }, [gameId, prompts])

  // The in-flight marker is written the moment the window opens, not when it
  // closes, which is what makes the reload above detectable.
  useEffect(() => {
    if (phase === 'answering' && prompt) markInFlight(gameId, prompt.id)
  }, [phase, prompt, gameId])

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus()
  }, [phase, state.index])

  /**
   * The timer is DERIVED, never accumulated: each frame recomputes the deadline
   * against `Date.now()`. `setInterval` is throttled in background tabs, which
   * would pause the clock; this way a tab that comes back late sees the real
   * remaining time — often already past, which times out at once.
   */
  useEffect(() => {
    if (phase !== 'preview' && phase !== 'answering') return

    let frame = 0
    const evaluate = () => {
      const now = Date.now()
      if (phase === 'preview') {
        if (now >= previewEndsAt(promptStartedAt)) dispatch({ type: 'answer' })
        setSegmentsLeft(SEGMENTS)
      } else {
        const remaining = answerEndsAt(promptStartedAt) - now
        setSegmentsLeft(Math.max(0, Math.ceil(remaining / 1000)))
        if (remaining <= 0 && prompt) dispatch({ type: 'score', result: ratat(prompt) })
      }
    }

    const loop = () => {
      evaluate()
      frame = requestAnimationFrame(loop)
    }
    loop()

    // rAF does not fire in a hidden tab, so re-evaluate the instant it returns.
    document.addEventListener('visibilitychange', evaluate)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', evaluate)
    }
  }, [phase, promptStartedAt, prompt])

  useEffect(() => {
    if (phase === 'result' || phase === 'finished') takeInFlight(gameId)
  }, [phase, gameId])

  useEffect(() => {
    if (!finished) return
    saveGame(gameId, {
      score: state.results.reduce((total, r) => total + r.points, 0),
      results: state.results,
      finishedAt: new Date().toISOString(),
    })
  }, [finished, gameId, state.results])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const answer = draft.trim().slice(0, MAX_ANSWER_LENGTH)
    if (!answer || phase !== 'answering' || !prompt) return

    // Stamped before the fetch: the round trip is not on the player's clock.
    const submittedAt = Date.now()
    const elapsedMs = Math.max(0, submittedAt - previewEndsAt(promptStartedAt))
    dispatch({ type: 'submit' })

    const body: CheckRequest = { gameId, promptId: prompt.id, answer, elapsedMs }
    let result: CheckResult
    try {
      result = await postCheck(body)
    } catch {
      try {
        result = await postCheck(body)
      } catch {
        // Never trap the player in a dead prompt.
        dispatch({ type: 'score', result: ratat(prompt, answer), offline: true })
        setDraft('')
        return
      }
    }

    if (!result.matched) {
      if (Date.now() < answerEndsAt(promptStartedAt)) {
        dispatch({ type: 'miss', answer })
      } else {
        dispatch({ type: 'score', result: ratat(prompt, answer) })
      }
      setDraft('')
      return
    }

    setDraft('')
    dispatch({
      type: 'score',
      result: {
        promptId: prompt.id,
        region: prompt.region,
        answer: result.canonical ?? answer,
        tier: result.tier,
        points: result.points,
      },
    })
  }

  function advance() {
    dispatch({ type: 'next', at: Date.now(), total: prompts.length })
  }

  const done = state.results.length >= prompts.length

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 pb-10">
      <StitchDefs />

      <header className="flex items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <a href="/" className="font-display text-xs">
          ‹ Pachete
        </a>
        <h2 className="font-display text-sm font-bold tracking-wide">{title}</h2>
        <p className="font-display text-sm text-brand">
          <span className="sr-only">Scor </span>
          {score}
        </p>
      </header>

      <ol
        className="mt-3 flex items-center justify-center gap-2"
        aria-label={`Progres: ${state.results.length} din ${prompts.length} întrebări`}
      >
        {prompts.map((p, i) => {
          const result = state.results[i]
          const current = i === state.index && !done
          return (
            <li
              key={p.id}
              className="size-4 rotate-45 border-2"
              style={{
                backgroundColor: result ? TIER_FILL[result.tier] : '#E6D9C3',
                borderColor: current ? '#CE1126' : '#1E1A1A',
              }}
            >
              <span className="sr-only">
                {i + 1}. {result ? TIER_LABELS[result.tier] : 'nejucat'}
              </span>
            </li>
          )
        })}
      </ol>

      <StitchMap
        className="mt-3 w-full"
        tiers={tiers}
        highlight={done ? undefined : prompt?.region}
      />

      {phase === 'idle' && (
        <section className="card mt-4 p-4">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted">
            7 întrebări · 20 de secunde fiecare · un scor oficial
          </p>
          <button
            type="button"
            className="btn-thread mt-4 w-full bg-action px-4 py-3 text-base text-white"
            onClick={() => dispatch({ type: 'begin', at: Date.now() })}
          >
            Începe
          </button>
        </section>
      )}

      {(phase === 'preview' || phase === 'answering' || phase === 'submitting') && prompt && (
        <section className="mt-4">
          <div className="card p-4">
            <p className="font-display text-xs text-muted">
              {state.index + 1}/{prompts.length} · {REGION_LABELS[prompt.region]}
            </p>
            <p className="mt-2 text-lg leading-snug">{prompt.text}</p>
            <p className="mt-2 text-xs text-muted">{prompt.answerCount} răspunsuri acceptate</p>
          </div>

          <div
            className="mt-3 flex gap-[2px]"
            role="timer"
            aria-label={`${segmentsLeft} secunde rămase`}
          >
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="h-3 flex-1 border border-ink"
                style={{ backgroundColor: i < segmentsLeft ? '#CE1126' : 'transparent' }}
              />
            ))}
          </div>

          <form onSubmit={submit} className="mt-3">
            <label htmlFor="ulm-answer" className="block text-xs text-muted">
              Răspunsul tău
            </label>
            <input
              id="ulm-answer"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={phase !== 'answering'}
              maxLength={MAX_ANSWER_LENGTH}
              autoComplete="off"
              className="card-flat mt-1 w-full px-3 py-3 text-base disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={phase !== 'answering' || !draft.trim()}
              className="btn-thread mt-3 w-full bg-action px-4 py-3 text-base text-white disabled:opacity-60"
            >
              Trimite
            </button>
          </form>

          <div role="status" className="mt-2 min-h-5 text-sm text-brand">
            {phase === 'submitting' && 'Se verifică…'}
            {phase === 'answering' &&
              state.rejected &&
              `«${state.rejected}» nu e pe listă încă. Mai încearcă!`}
          </div>
        </section>
      )}

      {phase === 'result' && state.last && (
        <section className="card mt-4 p-4">
          <p className="font-display text-xs text-muted">{TIER_LABELS[state.last.tier]}</p>
          <p className="mt-1 text-lg leading-snug">
            {state.last.answer || 'Fără răspuns'}
          </p>
          <p className="font-display mt-2 text-2xl text-brand">
            +{state.last.points}
            <span className="sr-only"> puncte</span>
          </p>
          {state.last.tier === 'ratat' && !state.offline && (
            <p className="mt-1 text-sm text-muted">Timpul a expirat.</p>
          )}
          {state.offline && (
            <p role="status" className="mt-1 text-sm text-muted">
              Conexiune pierdută.
            </p>
          )}
          <button
            type="button"
            className="btn-thread mt-4 w-full bg-action px-4 py-3 text-base text-white"
            onClick={advance}
          >
            Continuă
          </button>
        </section>
      )}

      {finished && (
        <section className="card mt-4 p-4 text-center">
          <h3 className="font-display text-lg font-bold">Marea Unire</h3>
          <p className="font-display mt-2 text-3xl text-brand">
            {score}
            <span className="text-base text-muted">/{MAX_SCORE}</span>
          </p>
          <p className="font-display mt-1 text-base">{totalToTitle(score)}</p>
          <p className="mt-3 text-xl tracking-widest" aria-hidden="true">
            {state.results.map((r) => TIER_SQUARE[pointsToTier(r.points)]).join('')}
          </p>
          {/* TODO Phase 2: ShareButton (navigator.share + clipboard fallback) goes here. */}
          <p className="mt-3 text-xs text-muted">
            Scorul oficial e salvat. Poți rejuca pentru distracție.
          </p>
        </section>
      )}
    </div>
  )
}
