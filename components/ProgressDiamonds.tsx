import { PROMPTS_PER_GAME } from '@/lib/types'

/**
 * Home's pack-completion markers: N of 7 packs finished.
 *
 * Deliberately NOT the tier-coloured diamonds from the game screen. On the
 * canvas both used the same sprites, so a yellow diamond meant "this answer
 * scored Rar" during play and "this pack is done" on Home — one glyph, two
 * meanings, and the colours on Home were arbitrary. These are neutral: filled
 * or empty, nothing more.
 */
export function ProgressDiamonds({ done }: { done: number }) {
  return (
    <div
      className="flex gap-1"
      role="img"
      aria-label={`${done} din ${PROMPTS_PER_GAME} pachete terminate`}
    >
      {Array.from({ length: PROMPTS_PER_GAME }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          className="h-5 w-5"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <path
            d="M5 0L10 5L5 10L0 5z"
            fill={i < done ? '#1E1A1A' : 'none'}
            stroke="#1E1A1A"
            strokeWidth="1.4"
          />
        </svg>
      ))}
    </div>
  )
}
