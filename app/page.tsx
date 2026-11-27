import type { Metadata } from 'next'
import { PackList, type PackMeta } from '@/components/PackList'
import { StitchDefs } from '@/components/StitchMap'
import { isPlayable } from '@/lib/bank.server'
import { SITE_URL } from '@/app/sitemap'
import { GAME_IDS, GAME_TITLES, type GameId } from '@/lib/types'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const MAIN_ID: GameId = '1-decembrie'

export default function Home() {
  const toMeta = (id: GameId): PackMeta => ({
    id,
    title: GAME_TITLES[id],
    playable: isPlayable(id),
  })

  const main = toMeta(MAIN_ID)
  const packs = GAME_IDS.filter((id) => id !== MAIN_ID).map(toMeta)

  // Served in the HTML so search engines and AI answer engines get the whole
  // description on the first request, not after JavaScript runs.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: 'Unu’ la un milion',
    url: SITE_URL,
    inLanguage: 'ro',
    genre: 'Trivia',
    description:
      'Joc gratuit de cultură generală despre România. Șapte întrebări, 20 de secunde fiecare; cu cât răspunsul e mai rar, cu atât primești mai multe puncte.',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 1 },
    isAccessibleForFree: true,
    author: {
      '@type': 'Organization',
      name: 'Sistemigro',
      url: 'https://sistemigro.com',
    },
  }

  return (
    <div className="px-5 py-6">
      <script
        type="application/ld+json"
        // Static, authored above — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StitchDefs />

      <header className="flex items-center gap-3.5">
        <svg viewBox="0 0 11 13" className="h-13 w-11" shapeRendering="crispEdges" aria-hidden="true">
          {/* Pomul vieții — the tree-of-life motif, as pixel stitches. */}
          <path
            fill="#B3192B"
            d="M5 0h1v1h-1zM4 1h3v1h-3zM3 2h5v1h-5zM5 3h1v1h-1zM2 4h3v1h-3zM6 4h3v1h-3zM1 5h3v1h-3zM7 5h3v1h-3zM5 6h1v1h-1zM3 7h5v1h-5zM4 8h3v1h-3zM5 9h1v4h-1z"
          />
          <path fill="#D4A017" d="M0 5h1v1h-1zM10 5h1v1h-1zM5 3h1v1h-1z" />
        </svg>
        <div>
          <h1 className="font-display text-[26px] leading-none font-bold tracking-wide">
            UNU’ LA UN MILION
          </h1>
          <p className="mt-1.5 text-sm leading-snug">
            Câte răspunsuri rare știi despre România?
          </p>
        </div>
      </header>

      {/* First-time rules, in the page rather than a pop-up, as the brief asks.
          Directly under the title: a first-time visitor needs them before the packs. */}
      <section className="card-flat mt-5 p-4">
        <h2 className="font-display text-base font-semibold">Cum se joacă</h2>
        <ol className="mt-2.5 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-snug">
          <li>Șapte întrebări, cu cronometru la fiecare.</li>
          <li>Un singur răspuns la fiecare. Cu cât e mai rar, cu atât valorează mai mult.</li>
          <li>Fiecare răspuns coase o regiune pe harta ta a României.</li>
        </ol>
      </section>

      <PackList main={main} packs={packs} />
    </div>
  )
}
