import { StitchDefs, StitchMap } from '@/components/StitchMap'
import { STITCHED_CELL_COUNT } from '@/lib/map'
import type { RegionId, Tier } from '@/lib/types'

/**
 * Placeholder home. Replaced in Phase 2 by the real pack list.
 *
 * It exists now to prove the Phase 0/1 gates: both faces load with every
 * Romanian diacritic, and the stitched map renders in each of its states.
 */
const PANGRAM = 'Ștefan cel Mare · Țara Românească · Mureș · Brâncuși · Îți'

// The sample run from the design canvas: 360/700, Boier.
const PARTIAL: Partial<Record<RegionId, Tier>> = {
  oltenia: 'rar',
  muntenia: 'bun',
  dobrogea: 'ulm',
  moldova: 'rar',
}

const COMPLETE: Partial<Record<RegionId, Tier>> = {
  oltenia: 'rar',
  muntenia: 'bun',
  dobrogea: 'ulm',
  moldova: 'rar',
  'banat-crisana': 'cliseu',
  'maramures-bucovina': 'ratat',
  transilvania: 'ulm',
}

export default function Home() {
  return (
    <div className="px-5 py-8">
      <StitchDefs />

      <h1 className="font-display text-[26px] leading-tight font-bold tracking-wide">
        UNUL LA UN MILION
      </h1>
      <p className="mt-2 text-sm">Câte răspunsuri rare știi despre România?</p>

      <section className="card mt-6 p-4">
        <h2 className="font-display text-lg font-semibold">Harta</h2>
        <p className="mt-1 text-xs text-muted">
          {STITCHED_CELL_COUNT} de pătrate, 7 regiuni, grilă 40×29
        </p>

        <p className="mt-4 text-xs text-muted">Necusută</p>
        <StitchMap className="mt-1 w-full" />

        <p className="mt-4 text-xs text-muted">
          4 din 7 regiuni · urmează Banat &amp; Crișana
        </p>
        <StitchMap className="mt-1 w-full" tiers={PARTIAL} highlight="banat-crisana" />

        <p className="mt-4 text-xs text-muted">Completă · 360/700 · Boier</p>
        <StitchMap className="mt-1 w-full" tiers={COMPLETE} />
      </section>

      <section className="card-flat mt-4 p-4">
        <h2 className="font-display text-base font-semibold">Verificare diacritice</h2>

        <p className="mt-3 text-xs text-muted">Pixelify Sans (titluri, scoruri)</p>
        <p className="font-display text-2xl">{PANGRAM}</p>

        <p className="mt-4 text-xs text-muted">Space Grotesk (întrebări, text)</p>
        <p className="text-xl">{PANGRAM}</p>
      </section>
    </div>
  )
}
