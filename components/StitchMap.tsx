import {
  ALL_CELLS_PATH,
  MAP_COLS,
  MAP_ROWS,
  REGION_OUTLINES,
  REGION_PATHS,
} from '@/lib/map'
import {
  REGION_IDS,
  REGION_LABELS,
  TIER_FILL,
  TIER_LABELS,
  type RegionId,
  type Tier,
} from '@/lib/types'

const STITCH_PATTERN_ID = 'ulm-stitch'

/**
 * The cross-stitch texture, defined once per page.
 *
 * `fill="url(#id)"` resolves against the whole document, so one hidden SVG
 * serves every map on the page. Defining it inside each map would need unique
 * ids per instance, which a Server Component cannot generate (`useId` is a
 * hook) without breaking hydration — and Home renders eight maps at once.
 */
export function StitchDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <pattern id={STITCH_PATTERN_ID} width="1" height="1" patternUnits="userSpaceOnUse">
          <path
            d="M0.18 0.18L0.82 0.82M0.82 0.18L0.18 0.82"
            stroke="#1E1A1A"
            strokeWidth="0.16"
            strokeOpacity="0.38"
            fill="none"
            strokeLinecap="square"
          />
        </pattern>
      </defs>
    </svg>
  )
}

type Props = {
  /** Regions the player has stitched. Anything absent is still unstitched. */
  tiers?: Partial<Record<RegionId, Tier>>
  /** The region about to be played — outlined, so you see what you will sew. */
  highlight?: RegionId
  className?: string
  outlines?: boolean
}

/** Unstitched cloth: the printed pattern showing through, not a tier colour. */
const UNSTITCHED_FILL = '#E6D9C3'

function describe(tiers: Partial<Record<RegionId, Tier>>): string {
  const done = REGION_IDS.filter((r) => tiers[r])
  if (done.length === 0) return 'Harta României, încă necusută'

  const parts = done.map((r) => `${REGION_LABELS[r]} ${TIER_LABELS[tiers[r]!].toLowerCase()}`)
  const left = REGION_IDS.length - done.length
  const tail = left > 0 ? `; ${left} regiuni încă necusute` : '; harta e completă'
  return `Harta României: ${parts.join(', ')}${tail}`
}

export function StitchMap({ tiers = {}, highlight, className, outlines = false }: Props) {
  return (
    <svg
      viewBox={`0 0 ${MAP_COLS} ${MAP_ROWS}`}
      // The SVG equivalent of image-rendering: pixelated, which does nothing
      // to vector shapes.
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={describe(tiers)}
    >
      {REGION_IDS.map((region) => {
        const tier = tiers[region]
        return (
          <path
            key={region}
            d={REGION_PATHS[region]}
            fill={tier ? TIER_FILL[tier] : UNSTITCHED_FILL}
          />
        )
      })}

      {/* One texture pass over every cell, rather than per region. */}
      <path d={ALL_CELLS_PATH} fill={`url(#${STITCH_PATTERN_ID})`} />

      {outlines && REGION_IDS.map((region) => (
        <path key={region} d={REGION_OUTLINES[region]} fill="none" stroke="#8c7b62" strokeWidth="0.3" />
      ))}

      {highlight && (
        <path
          d={REGION_OUTLINES[highlight]}
          fill="none"
          stroke="#CE1126"
          strokeWidth="0.6"
          strokeLinecap="square"
        />
      )}
    </svg>
  )
}
