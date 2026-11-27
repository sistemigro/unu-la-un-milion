'use client'

import { logSistemigroClick } from '@/lib/client-events'

export function SistemigroPromo() {
  return (
    <aside className="mt-5 flex flex-col gap-1.5 bg-ink px-4 py-4 text-left text-linen">
      <span className="font-display text-lg font-bold">Ai o idee de aplicație?</span>
      <a href="https://sistemigro.com?utm_source=unul-la-un-milion&utm_medium=footer&utm_campaign=1-decembrie" target="_blank" rel="noopener noreferrer" onClick={() => logSistemigroClick('footer')} className="text-sm font-bold text-yellow">sistemigro.com</a>
    </aside>
  )
}
