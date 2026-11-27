import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GameClient } from '@/components/GameClient'
import { getClientPrompts, playableGameIds } from '@/lib/bank.server'
import { GAME_TITLES, REGION_LABELS, isGameId, type GameId } from '@/lib/types'

/**
 * Statically rendered, one route per game.
 *
 * Prompts are not secret — answers are — so they belong in the HTML, where
 * crawlers and link previews can read them. The secrecy boundary is
 * `getClientPrompts`, which projects the bank onto `ClientPrompt`; that is the
 * same guard whether its output travels as RSC props or as a JSON response,
 * which is why there is no `/api/game` route.
 */

export function generateStaticParams() {
  // Only drafted games get a route; the rest show as "în curând" on Home.
  return playableGameIds().map((gameId) => ({ gameId }))
}

type Params = { params: Promise<{ gameId: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { gameId } = await params
  if (!isGameId(gameId)) return {}

  const title = GAME_TITLES[gameId]
  const description = `Șapte întrebări despre ${title.toLowerCase()}. Cu cât răspunsul tău e mai rar, cu atât primești mai multe puncte.`

  return {
    title,
    description,
    alternates: { canonical: `/joc/${gameId}` },
    openGraph: { title, description, url: `/joc/${gameId}` },
  }
}

export default async function GamePage({ params }: Params) {
  // Next 16 removed synchronous param access entirely.
  const { gameId } = await params
  if (!isGameId(gameId)) notFound()

  const prompts = getClientPrompts(gameId as GameId)
  if (!prompts) notFound()

  const title = GAME_TITLES[gameId as GameId]

  return (
    <div className="px-5 py-6">
      <GameClient gameId={gameId as GameId} title={title} prompts={prompts} />

      {/* Crawlable content, collapsed so it does not spoil the pacing for a
          player who would rather meet each prompt cold. Crawlers read inside
          <details> regardless of its open state. */}
      <details className="card-flat mt-8 p-4">
        <summary className="font-display cursor-pointer text-base font-semibold">
          Ce întrebări conține
        </summary>
        <p className="mt-3 text-sm text-muted">
          Cele șapte întrebări din acest pachet, în ordinea în care se cos pe hartă.
          Răspunsurile rămân ascunse până termini jocul.
        </p>
        <ol className="mt-3 flex flex-col gap-2 text-[15px]">
          {prompts.map((prompt) => (
            <li key={prompt.id}>
              <span className="font-display text-xs tracking-wide text-brand">
                {REGION_LABELS[prompt.region].toUpperCase()}
              </span>
              <br />
              {prompt.text}
              <span className="text-muted"> · {prompt.answerCount} răspunsuri acceptate</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
