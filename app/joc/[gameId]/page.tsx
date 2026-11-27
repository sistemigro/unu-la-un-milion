import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GameClient } from '@/components/GameClient'
import { getClientPrompts, playableGameIds } from '@/lib/bank.server'
import { GAME_TITLES, isGameId, type GameId } from '@/lib/types'

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

  const prompts = getClientPrompts(gameId as GameId)?.map(({ id, region }) => ({ id, region }))
  if (!prompts) notFound()

  const title = GAME_TITLES[gameId as GameId]
  const playable = playableGameIds()
  const nextGameId = playable[playable.indexOf(gameId as GameId) + 1]

  return (
    <div className="px-5 py-6">
      <GameClient key={gameId} gameId={gameId as GameId} title={title} prompts={prompts} nextGameId={nextGameId} />

    </div>
  )
}
