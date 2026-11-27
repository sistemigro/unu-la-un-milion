/**
 * Placeholder home. Replaced in Phase 2 by the real pack list.
 *
 * It exists now to prove the Phase 0 gate: both faces load and every Romanian
 * diacritic renders in each of them. Pixel fonts routinely ship absent or ugly
 * comma-below glyphs (ș ț) even when the subset claims coverage, so this is
 * checked before the design commits to Pixelify Sans.
 */
const PANGRAM = 'Ștefan cel Mare · Țara Românească · Mureș · Brâncuși · Îți'

export default function Home() {
  return (
    <div className="px-5 py-8">
      <h1 className="font-display text-[26px] leading-tight font-bold tracking-wide">
        UNUL LA UN MILION
      </h1>
      <p className="mt-2 text-sm">Câte răspunsuri rare știi despre România?</p>

      <section className="card mt-6 p-4">
        <h2 className="font-display text-lg font-semibold">Verificare diacritice</h2>

        <p className="mt-3 text-xs text-muted">Pixelify Sans (titluri, scoruri)</p>
        <p className="font-display text-2xl">{PANGRAM}</p>

        <p className="mt-4 text-xs text-muted">Space Grotesk (întrebări, text)</p>
        <p className="text-xl">{PANGRAM}</p>

        <p className="mt-4 text-xs text-muted">
          Toate literele trebuie să apară în aceeași familie, fără salturi de font:
          ă â î ș ț Ă Â Î Ș Ț
        </p>
      </section>

      <section className="card-flat mt-4 p-4">
        <h2 className="font-display text-base font-semibold">Culori</h2>
        {/* Class names are written out in full on purpose: Tailwind scans the
            source for literals, so an interpolated `bg-${token}` generates no
            CSS at all. */}
        <div className="mt-3 flex gap-1.5">
          <span aria-label="Unul la un milion" className="h-8 w-8 border-2 bg-tier-ulm" />
          <span aria-label="Rar" className="h-8 w-8 border-2 bg-tier-rar" />
          <span aria-label="Bun" className="h-8 w-8 border-2 bg-tier-bun" />
          <span aria-label="Clișeu" className="h-8 w-8 border-2 bg-tier-cliseu" />
          <span aria-label="Ratat" className="h-8 w-8 border-2 bg-tier-ratat" />
        </div>
      </section>
    </div>
  )
}
