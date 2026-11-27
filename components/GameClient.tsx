'use client'

import Link from 'next/link'
import { useEffect, useReducer, useRef, useState } from 'react'
import { RevealClient } from '@/components/RevealClient'
import { ShareButton } from '@/components/ShareButton'
import { StitchDefs, StitchMap } from '@/components/StitchMap'
import { countFinished, loadGame, markInFlight, saveGame, takeInFlight, type PromptResult } from '@/lib/progress'
import { logGameFinish, logGameStart } from '@/lib/client-events'
import { pointsToTier, totalToTitle } from '@/lib/score'
import {
  ANSWER_MS,
  MAX_ANSWER_LENGTH,
  MAX_SCORE,
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

type Props = { gameId: GameId; title: string; prompts: Pick<ClientPrompt, 'id' | 'region'>[]; nextGameId?: GameId }

type Phase = 'idle' | 'loading' | 'answering' | 'submitting' | 'check-error' | 'result' | 'finished'

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
  skipped: boolean
}

type Action =
  | { type: 'begin'; at: number }
  | { type: 'resume'; results: PromptResult[]; index: number; at: number }
  | { type: 'loaded'; at: number }
  | { type: 'loading' }
  | { type: 'submit' }
  | { type: 'check-error' }
  | { type: 'miss'; answer: string }
  | { type: 'score'; result: PromptResult; offline?: boolean; skipped?: boolean }
  | { type: 'next'; at: number; total: number }

const SEGMENTS = Math.round(ANSWER_MS / 1000)

const answerEndsAt = (startedAt: number) => startedAt + ANSWER_MS

function ratat(prompt: Pick<ClientPrompt, 'id' | 'region'>, answer = ''): PromptResult {
  return { promptId: prompt.id, region: prompt.region, answer, tier: 'ratat', points: 0 }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'begin':
      return { ...state, phase: 'loading', index: 0, promptStartedAt: action.at }
    case 'resume':
      return {
        ...state,
        phase: 'loading',
        index: action.index,
        promptStartedAt: action.at,
        results: action.results,
        last: null,
      }
    case 'loaded':
      return { ...state, phase: 'answering', promptStartedAt: action.at }
    case 'loading':
      return { ...state, phase: 'loading' }
    case 'submit':
      return { ...state, phase: 'submitting', rejected: null, offline: false }
    case 'check-error':
      return { ...state, phase: 'check-error' }
    case 'miss':
      return { ...state, phase: 'answering', rejected: action.answer }
    case 'score':
      return {
        ...state,
        phase: 'result',
        rejected: null,
        offline: action.offline ?? false,
        skipped: action.skipped ?? false,
        last: action.result,
        results: [...state.results, action.result],
      }
    case 'next': {
      const next = { ...state, last: null, rejected: null, offline: false }
      if (state.index + 1 >= action.total) return { ...next, phase: 'finished' }
      return { ...next, phase: 'loading', index: state.index + 1, promptStartedAt: action.at }
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

export function GameClient({ gameId, title, prompts, nextGameId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    phase: 'idle',
    index: 0,
    promptStartedAt: 0,
    results: [],
    last: null,
    rejected: null,
    offline: false,
    skipped: false,
  })
  const [activePrompt, setActivePrompt] = useState<ClientPrompt | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [draft, setDraft] = useState('')
  const [segmentsLeft, setSegmentsLeft] = useState(SEGMENTS)
  const [packsDone, setPacksDone] = useState(0)
  const [officialScore, setOfficialScore] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef(false)
  const checkRef = useRef<CheckRequest | null>(null)
  const [skipError, setSkipError] = useState(false)

  const prompt = activePrompt
  const { phase, promptStartedAt } = state
  const finished = phase === 'finished'

  const tiers: Partial<Record<RegionId, Tier>> = {}
  for (const r of state.results) tiers[r.region] = r.tier

  const score = state.results.reduce((total, r) => total + r.points, 0)

  useEffect(() => {
    const interrupted = takeInFlight(gameId)
    if (!interrupted) return
    const at = prompts.findIndex((p) => p.id === interrupted)
    if (at < 0) return
    const lost = prompts.slice(0, at + 1).map((p) => ratat(p))
    dispatch({ type: 'resume', results: lost, index: at + 1, at: Date.now() })
    void loadPrompt('next')
  // The recovery is only attempted on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

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
    if (phase !== 'answering') return

    let frame = 0
    const evaluate = () => {
      const remaining = answerEndsAt(promptStartedAt) - Date.now()
      setSegmentsLeft(Math.max(0, Math.ceil(remaining / 1000)))
      if (remaining <= 0 && prompt && !pendingRef.current) {
        pendingRef.current = true
        setDraft('')
        dispatch({ type: 'score', result: ratat(prompt) })
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
    const total = state.results.reduce((sum, r) => sum + r.points, 0)
    saveGame(gameId, {
      score: total,
      results: state.results,
      finishedAt: new Date().toISOString(),
    })
    // Counted after the save, so this game counts itself in "Pachete: N/7".
    setOfficialScore(loadGame(gameId)?.score ?? total)
    setPacksDone(countFinished())
    logGameFinish(gameId, total)
  }, [finished, gameId, state.results])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const answer = draft.trim().slice(0, MAX_ANSWER_LENGTH)
    if (!answer || phase !== 'answering' || !prompt || pendingRef.current) return
    // Stamped before the fetch: the round trip is not on the player's clock.
    const submittedAt = Date.now()
    const elapsedMs = Math.max(0, submittedAt - promptStartedAt)
    const body: CheckRequest = { gameId, promptId: prompt.id, answer, elapsedMs }
    checkRef.current = body
    await checkSubmittedAnswer(body, prompt)
  }

  async function checkSubmittedAnswer(body: CheckRequest, currentPrompt: ClientPrompt) {
    if (pendingRef.current) return
    pendingRef.current = true
    setSkipError(false)
    dispatch({ type: 'submit' })
    const { answer } = body
    let result: CheckResult
    try {
      result = await postCheck(body)
    } catch {
      try {
        result = await postCheck(body)
      } catch {
        pendingRef.current = false
        dispatch({ type: 'check-error' })
        return
      }
    }

    if (!result.matched) {
      if (Date.now() < answerEndsAt(promptStartedAt)) {
        pendingRef.current = false
        dispatch({ type: 'miss', answer })
      } else {
        dispatch({ type: 'score', result: ratat(currentPrompt, answer) })
      }
      setDraft('')
      return
    }

    setDraft('')
    dispatch({
      type: 'score',
      result: {
        promptId: currentPrompt.id,
        region: currentPrompt.region,
        answer: result.canonical ?? answer,
        tier: result.tier,
        points: result.points,
        fact: result.fact,
        commonAnswer: result.commonAnswer,
      },
    })
  }

  async function loadPrompt(action: 'start' | 'next') {
    setLoadError(false)
    try {
      const response = await fetch('/api/game', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId, action }),
      })
      if (!response.ok) throw new Error('Could not load question')
      const data = await response.json() as { prompt: ClientPrompt | null }
      if (data.prompt) {
        pendingRef.current = false
        setSkipError(false)
        setDraft('')
        setActivePrompt(data.prompt)
        setSegmentsLeft(SEGMENTS)
        dispatch({ type: 'loaded', at: Date.now() })
      } else {
        dispatch({ type: 'next', at: Date.now(), total: prompts.length })
      }
    } catch { setLoadError(true) }
  }

  async function skip() {
    if (phase !== 'answering' || !prompt || pendingRef.current) return
    pendingRef.current = true
    setSkipError(false)
    dispatch({ type: 'submit' })
    try {
      const response = await fetch('/api/game', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId, action: 'skip', promptId: prompt.id }),
      })
      if (!response.ok) throw new Error('Could not skip question')
      setDraft('')
      dispatch({ type: 'score', result: ratat(prompt), skipped: true })
    } catch {
      pendingRef.current = false
      setSkipError(true)
      dispatch({ type: 'miss', answer: '' })
    }
  }

  function advance() {
    dispatch({ type: 'next', at: Date.now(), total: prompts.length + 1 })
    void loadPrompt('next')
  }

  const done = state.results.length >= prompts.length

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 pb-10">
      <StitchDefs />

      <header className="flex items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <a href="/" className="font-display text-xs" onClick={() => takeInFlight(gameId)}>
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
        highlight={
          phase === 'result' ? state.last?.region : done ? undefined : prompt?.region
        }
      />

      {phase === 'idle' && (
        <section className="card mt-4 p-4">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted">
            7 întrebări · 20 de secunde fiecare · un scor
          </p>
          <button
            type="button"
            className="btn-thread mt-4 w-full bg-action px-4 py-3 text-base text-white"
            onClick={() => {
              logGameStart(gameId)
              dispatch({ type: 'begin', at: Date.now() })
              void loadPrompt('start')
            }}
          >
            Începe
          </button>
        </section>
      )}

      {phase === 'loading' && (
        <div role="status" className="card mt-4 p-4 text-sm">
          {loadError ? <><p>Nu am putut încărca întrebarea. Încearcă din nou.</p><button type="button" className="btn-thread mt-3 bg-action px-3 py-2 text-white" onClick={() => void loadPrompt(state.index === 0 && state.results.length === 0 ? 'start' : 'next')}>Reîncearcă</button></> : 'Se încarcă întrebarea…'}
        </div>
      )}

      {(phase === 'answering' || phase === 'submitting' || phase === 'check-error') && prompt && (
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

          <button type="button" disabled={phase !== 'answering'} onClick={() => void skip()} className="mt-3 w-full border-2 px-4 py-3 text-base font-bold disabled:opacity-60">Sari peste</button>

          {phase === 'check-error' && <div role="alert" className="mt-3 text-sm">Nu am putut verifica răspunsul. <button type="button" className="font-bold underline" onClick={() => { if (checkRef.current) void checkSubmittedAnswer(checkRef.current, prompt) }}>Reîncearcă</button></div>}

          <div role="status" className="mt-2 min-h-5 text-sm text-brand">
            {phase === 'submitting' && 'Se verifică…'}
            {skipError && 'Nu am putut sări peste întrebare. Încearcă din nou.'}
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
          {state.last.commonAnswer && <p className="mt-3 text-sm text-muted">Răspunsul-clișeu: {state.last.commonAnswer}</p>}
          {state.last.fact && <div className="mt-4 border-2 border-dashed p-3 text-sm"><p className="font-display font-bold text-blue">Știai că…?</p><p className="mt-1 leading-snug">{state.last.fact}</p></div>}
          {state.last.tier === 'ratat' && !state.offline && !state.skipped && (
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
          <p className="mt-2 text-xs text-muted">Scorul acestei runde</p>
          <p className="font-display mt-2 text-3xl text-brand">
            {score}
            <span className="text-base text-muted">/{MAX_SCORE}</span>
          </p>
          <p className="font-display mt-1 text-base">{totalToTitle(score)}</p>
          <p className="mt-3 text-xl tracking-widest" aria-hidden="true">
            {state.results.map((r) => TIER_SQUARE[pointsToTier(r.points)]).join('')}
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            <ShareButton
              gameTitle={title}
              score={score}
              tiers={state.results.map((r) => pointsToTier(r.points))}
              packsDone={packsDone}
            />
            {nextGameId && <Link
              href={`/joc/${nextGameId}`}
              className="btn-thread bg-blue px-3 py-3 text-xl text-white no-underline"
            >
              Următorul pachet
            </Link>}
            <Link href="/" className="btn-thread bg-action px-3 py-3 text-xl text-white no-underline">Înapoi la pachete</Link>
          </div>

          <p className="mt-3 text-xs text-muted">
            Scor: {officialScore ?? score} / {MAX_SCORE}. Poți rejuca pentru distracție.
          </p>

          <RevealClient gameId={gameId} title={title} embedded results={state.results} />
        </section>
      )}
    </div>
  )
}
