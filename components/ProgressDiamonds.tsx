import { PROMPTS_PER_GAME } from '@/lib/types'

const COLORS = ['#FCD116', '#002B7F', '#CE1126', '#FCD116', '#002B7F', '#CE1126', '#FCD116']
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
            fill={i < done ? COLORS[i] : 'none'}
            stroke={i < done ? COLORS[i] : '#8c7b62'}
            strokeWidth="1.4"
          />
        </svg>
      ))}
    </div>
  )
}
