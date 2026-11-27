'use client'

import { SistemigroMark } from '@/components/SistemigroMark'
import { logSistemigroClick } from '@/lib/client-events'

export function SistemigroPromo() {
  return (
    <aside className="mt-5 flex items-center gap-3 bg-ink px-4 py-4 text-left text-linen">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-display text-lg font-bold">Ai o idee de aplicație?</span>
        <p className="text-[13px] leading-snug">
          Noi o construim — de la site la aplicație mobilă. Hai să vorbim{' '}
          <a
            href="https://sistemigro.com?utm_source=unul-la-un-milion&utm_medium=footer&utm_campaign=1-decembrie"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logSistemigroClick('footer')}
            className="font-bold text-yellow underline underline-offset-2"
          >
            aici
          </a>
          .
        </p>
      </div>
      {/* Shrink-proof: the mark keeps its square at every width. */}
      <SistemigroMark className="size-14 shrink-0" />
    </aside>
  )
}
