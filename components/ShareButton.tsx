'use client'

import { useState } from 'react'
import { logShare } from '@/lib/client-events'
import { totalToTitle } from '@/lib/score'
import { MAX_SCORE, PROMPTS_PER_GAME, TIER_SQUARE, type Tier } from '@/lib/types'

/**
 * Builds the shared result exactly as the brief specifies: title line, the
 * seven tier squares, packs progress, then the link.
 *
 * The squares are what travels — a WhatsApp group sees the tricolour of
 * someone's good round without needing the site to render anything.
 */
export function buildShareText({
  gameTitle,
  score,
  tiers,
  packsDone,
  url,
}: {
  gameTitle: string
  score: number
  tiers: Tier[]
  packsDone: number
  url: string
}): string {
  const squares = tiers.map((t) => TIER_SQUARE[t]).join('')
  return [
    `Unul la un milion · ${gameTitle} · ${score}/${MAX_SCORE} · ${totalToTitle(score)}`,
    squares,
    `Pachete: ${packsDone}/${PROMPTS_PER_GAME}`,
    url,
  ].join('\n')
}

type Props = {
  gameTitle: string
  score: number
  tiers: Tier[]
  packsDone: number
}

export function ShareButton({ gameTitle, score, tiers, packsDone }: Props) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  async function share() {
    const url = window.location.origin
    const text = buildShareText({ gameTitle, score, tiers, packsDone, url })

    // The native sheet is the whole point on a phone: it reaches WhatsApp,
    // which is where this game actually spreads.
    if (navigator.share) {
      try {
        await navigator.share({ text })
        logShare('native')
        return
      } catch (error) {
        // A user who dismisses the sheet throws AbortError — not a failure,
        // and must not fall through to copying something they declined.
        if ((error as Error)?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setFailed(false)
      logShare('copy')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={share}
        className="btn-thread bg-action px-3 py-3 text-xl text-white"
      >
        Distribuie rezultatul
      </button>
      <span role="status" className="min-h-4 text-center text-xs text-muted">
        {copied && 'Copiat! Lipește-l unde vrei.'}
        {failed && 'Nu am putut copia. Selectează textul de mai sus manual.'}
      </span>
    </div>
  )
}
