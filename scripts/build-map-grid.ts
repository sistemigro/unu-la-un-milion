/**
 * Turns Romania's county boundaries into the 40x29 stitch grid the game's map
 * is drawn from, and emits `data/map-grid.ts`.
 *
 * Run with `npm run map:build`. The OUTPUT is committed; this script exists so
 * the grid is reproducible and reviewable, not because it runs at build time.
 * Expect to hand-fix a few cells afterwards — the script gives a first draft,
 * coastlines and the Danube Delta especially.
 *
 * Source: geoBoundaries ROU ADM1 (World Bank, 2017), CC BY 4.0.
 * https://www.geoboundaries.org/
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REGION_IDS, type RegionId } from '../lib/types'
import { COUNTY_REGION } from './regions'

const COLS = 40
const ROWS = 29
/** Samples per cell, per axis. 3 means 9 probes; centre-only loses the coast. */
const SUBSAMPLES = 3
/** A cell needs this many of its 9 probes inside the country to be stitched. */
const MIN_HITS = 4

type Ring = [number, number][]
type Poly = Ring[]

const here = import.meta.dirname
const geo = JSON.parse(readFileSync(join(here, 'data/ro-counties.geojson'), 'utf8'))

// --- collect polygons per region --------------------------------------------

const polysByRegion = new Map<RegionId, Poly[]>()
const unmapped: string[] = []

for (const feature of geo.features) {
  const name: string = feature.properties.shapeName
  const region = COUNTY_REGION[name]
  if (!region) {
    unmapped.push(name)
    continue
  }
  const { type, coordinates } = feature.geometry
  const polys: Poly[] = type === 'Polygon' ? [coordinates] : coordinates
  const bucket = polysByRegion.get(region) ?? []
  bucket.push(...polys)
  polysByRegion.set(region, bucket)
}

if (unmapped.length) {
  throw new Error(`No region for: ${unmapped.join(', ')} — fix scripts/regions.ts`)
}

// --- projection --------------------------------------------------------------

// Longitude degrees shrink with latitude. Without this Romania comes out
// visibly squashed: raw-degree aspect is 2.03, projected it is 1.41, and the
// grid is 40/29 = 1.379.
const LAT_MID = 46
const K = Math.cos((LAT_MID * Math.PI) / 180)

let minX = Infinity
let maxX = -Infinity
let minLat = Infinity
let maxLat = -Infinity

for (const polys of polysByRegion.values()) {
  for (const poly of polys) {
    for (const [lon, lat] of poly[0]) {
      const x = lon * K
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
}

// Fit the bbox inside the grid without distorting it, then centre what is left.
const scale = Math.min(COLS / (maxX - minX), ROWS / (maxLat - minLat))
const padX = (COLS - (maxX - minX) * scale) / 2
const padY = (ROWS - (maxLat - minLat) * scale) / 2

/** Grid column/row (fractional) → geographic point. */
function cellToPoint(col: number, row: number): [number, number] {
  const x = (col - padX) / scale + minX
  // Row 0 is the top of the grid, so latitude runs the other way.
  const lat = maxLat - (row - padY) / scale
  return [x / K, lat]
}

// --- point in polygon ---------------------------------------------------------

function inRing(ring: Ring, lon: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** First ring is the outline; any others are holes. */
function inPoly(poly: Poly, lon: number, lat: number): boolean {
  if (!inRing(poly[0], lon, lat)) return false
  for (let h = 1; h < poly.length; h++) {
    if (inRing(poly[h], lon, lat)) return false
  }
  return true
}

// Bounding boxes make the ~1.5M probe/polygon tests tractable.
const bboxes = new Map<Poly, [number, number, number, number]>()
for (const polys of polysByRegion.values()) {
  for (const poly of polys) {
    let w = Infinity
    let s = Infinity
    let e = -Infinity
    let n = -Infinity
    for (const [lon, lat] of poly[0]) {
      if (lon < w) w = lon
      if (lon > e) e = lon
      if (lat < s) s = lat
      if (lat > n) n = lat
    }
    bboxes.set(poly, [w, s, e, n])
  }
}

function regionAt(lon: number, lat: number): RegionId | null {
  for (const region of REGION_IDS) {
    for (const poly of polysByRegion.get(region) ?? []) {
      const [w, s, e, n] = bboxes.get(poly)!
      if (lon < w || lon > e || lat < s || lat > n) continue
      if (inPoly(poly, lon, lat)) return region
    }
  }
  return null
}

// --- rasterise -----------------------------------------------------------------

const grid: string[] = []
const regionCells = new Map<RegionId, [number, number][]>()
const allCells: [number, number][] = []

for (let row = 0; row < ROWS; row++) {
  let line = ''
  for (let col = 0; col < COLS; col++) {
    const votes = new Map<RegionId, number>()
    let hits = 0

    for (let sy = 0; sy < SUBSAMPLES; sy++) {
      for (let sx = 0; sx < SUBSAMPLES; sx++) {
        const [lon, lat] = cellToPoint(
          col + (sx + 0.5) / SUBSAMPLES,
          row + (sy + 0.5) / SUBSAMPLES,
        )
        const region = regionAt(lon, lat)
        if (region) {
          hits++
          votes.set(region, (votes.get(region) ?? 0) + 1)
        }
      }
    }

    if (hits < MIN_HITS) {
      line += '.'
      continue
    }

    // Majority region wins; REGION_IDS order breaks ties deterministically.
    let best: RegionId = REGION_IDS[0]
    let bestVotes = -1
    for (const region of REGION_IDS) {
      const v = votes.get(region) ?? 0
      if (v > bestVotes) {
        bestVotes = v
        best = region
      }
    }

    line += String(REGION_IDS.indexOf(best) + 1)
    const bucket = regionCells.get(best) ?? []
    bucket.push([col, row])
    regionCells.set(best, bucket)
    allCells.push([col, row])
  }
  grid.push(line)
}

// --- emit ------------------------------------------------------------------------

const counts = REGION_IDS.map((r) => `${r}=${(regionCells.get(r) ?? []).length}`).join(' ')

// Only the grid is emitted. The SVG paths are derived from it in lib/map.ts,
// so hand-editing a cell here cannot leave the paths out of step — which it
// would if both were generated side by side.
const out = `// Generated by scripts/build-map-grid.ts, then hand-corrected.
// THIS FILE IS THE SOURCE OF TRUTH for the map's shape; edit cells directly.
// Re-running the script overwrites hand-fixes, so re-apply them afterwards.
//
// Source: geoBoundaries ROU ADM1 (World Bank, 2017), CC BY 4.0.
// Generated cell counts: ${counts}

export const MAP_COLS = ${COLS}
export const MAP_ROWS = ${ROWS}

/**
 * One character per cell, '1'-'7' indexing REGION_IDS, '.' outside the country:
 * 1 oltenia · 2 muntenia · 3 dobrogea · 4 moldova
 * 5 banat-crisana · 6 maramures-bucovina · 7 transilvania
 */
export const MAP_GRID = [
${grid.map((line) => `  '${line}',`).join('\n')}
] as const
`

writeFileSync(join(here, '../data/map-grid.ts'), out)

console.log(grid.join('\n'))
console.log(`\ncells: ${allCells.length} of ${COLS * ROWS}`)
console.log(counts)
