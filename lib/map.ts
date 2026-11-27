import { MAP_COLS, MAP_GRID, MAP_ROWS } from '@/data/map-grid'
import { REGION_IDS, type RegionId } from '@/lib/types'

/**
 * Turns the character grid into SVG path data, once at module load.
 *
 * Derived rather than generated alongside the grid, so hand-correcting a cell
 * in `data/map-grid.ts` can never leave the paths out of step. ~1,160 cells is
 * sub-millisecond work and happens once per process.
 *
 * Framework-free on purpose: a Server Component renders this, and the result
 * is static markup.
 */

/**
 * One subpath per cell, 1.01 wide so neighbouring cells overlap slightly.
 * Without that overlap, adjacent cells show hairline seams wherever the SVG
 * lands on a non-integer CSS size — which, on a fluid phone layout, is always.
 */
function cellsToPath(cells: readonly (readonly [number, number])[]): string {
  return cells.map(([c, r]) => `M${c} ${r}h1.01v1.01h-1.01z`).join('')
}

function regionAt(col: number, row: number): RegionId | null {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null
  const char = MAP_GRID[row][col]
  if (char === '.' || char === undefined) return null
  return REGION_IDS[Number(char) - 1] ?? null
}

/**
 * The region's outer boundary: only those cell edges whose neighbour belongs
 * to a different region.
 *
 * Stroking the fill path instead would outline every cell individually and
 * render as a mesh over the whole region, not a border around it.
 */
function cellsToOutline(
  cells: readonly (readonly [number, number])[],
  region: RegionId,
): string {
  const segments: string[] = []
  for (const [c, r] of cells) {
    if (regionAt(c, r - 1) !== region) segments.push(`M${c} ${r}h1`)
    if (regionAt(c, r + 1) !== region) segments.push(`M${c} ${r + 1}h1`)
    if (regionAt(c - 1, r) !== region) segments.push(`M${c} ${r}v1`)
    if (regionAt(c + 1, r) !== region) segments.push(`M${c + 1} ${r}v1`)
  }
  return segments.join('')
}

function buildPaths() {
  const byRegion = new Map<RegionId, [number, number][]>()
  const all: [number, number][] = []

  for (let row = 0; row < MAP_ROWS; row++) {
    const line = MAP_GRID[row]
    for (let col = 0; col < MAP_COLS; col++) {
      const char = line[col]
      if (char === '.' || char === undefined) continue

      const region = REGION_IDS[Number(char) - 1]
      if (!region) continue

      const bucket = byRegion.get(region) ?? []
      bucket.push([col, row])
      byRegion.set(region, bucket)
      all.push([col, row])
    }
  }

  const paths = {} as Record<RegionId, string>
  const outlines = {} as Record<RegionId, string>
  for (const region of REGION_IDS) {
    const cells = byRegion.get(region) ?? []
    paths[region] = cellsToPath(cells)
    outlines[region] = cellsToOutline(cells, region)
  }

  return { paths, outlines, allPath: cellsToPath(all), cellCount: all.length }
}

const built = buildPaths()

/** One merged path per region. Changing a region's tier is a `fill` swap. */
export const REGION_PATHS: Record<RegionId, string> = built.paths

/** Each region's outer border, for highlighting the region about to be played. */
export const REGION_OUTLINES: Record<RegionId, string> = built.outlines

/** Every stitched cell, for a single cross-stitch texture overlay. */
export const ALL_CELLS_PATH = built.allPath

export const STITCHED_CELL_COUNT = built.cellCount

export { MAP_COLS, MAP_ROWS }
