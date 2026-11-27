import { ImageResponse } from 'next/og'
import { MAP_GRID } from '@/data/map-grid'
import { REGION_OUTLINES, REGION_PATHS } from '@/lib/map'
import { REGION_IDS, type RegionId } from '@/lib/types'

export const alt = 'Unu’ la un milion — câte răspunsuri rare știi despre România?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const colors: Record<RegionId, string> = {
  oltenia: '#fcd116', muntenia: '#002b7f', dobrogea: '#ce1126', moldova: '#fcd116',
  'banat-crisana': '#fffaf0', 'maramures-bucovina': '#f2e8d7', transilvania: '#ce1126',
}
const stitches = MAP_GRID.flatMap((row, y) => [...row].flatMap((cell, x) =>
  cell === '.' ? [] : [`M${x + 0.18} ${y + 0.18}l0.64 0.64m0-0.64l-0.64 0.64`],
)).join('')
const grid = [
  ...Array.from({ length: 151 }, (_, i) => `M${i * 8} 0v630`),
  ...Array.from({ length: 80 }, (_, i) => `M0 ${i * 8}h1200`),
].join('')

async function loadFont(family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
      headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'force-cache',
    }).then((r) => r.text())
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/)?.[1]
    return url ? await fetch(url, { cache: 'force-cache' }).then((r) => r.arrayBuffer()) : null
  } catch { return null }
}

export default async function OpengraphImage() {
  const [font, bodyFont] = await Promise.all([loadFont('Pixelify+Sans:wght@700'), loadFont('Space+Grotesk:wght@400')])
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#f4ebdc', color: '#1e1a1a' }}>
      <svg width="1200" height="630" style={{ position: 'absolute', top: 0, left: 0 }}><path d={grid} fill="none" stroke="#dbcbb5" strokeWidth="0.6" /></svg>
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 34, background: '#fff9ef' }}>
        <svg width="1200" height="34" viewBox="0 0 1200 34">
          <path d="M0 5h1200M0 28h1200" stroke="#1e1a1a" strokeWidth="3" />
          <path d="M0 16h1200" stroke="#ce1126" strokeWidth="4" />
          {Array.from({ length: 39 }, (_, i) => <g key={i} transform={`translate(${i * 31 + 5} 4)`}><path d="M10 0h6v5h5v6h5v6h-5v6h-5v5h-6v-5H5v-6H0v-6h5V5h5z" fill="#1e1a1a"/><path d="M10 4h6v5h5v10h-5v5h-6v-5H5V9h5z" fill="#ce1126"/><path d="M10 10h6v8h-6z" fill="#fff9ef"/></g>)}
        </svg>
      </div>
      <div style={{ display: 'flex', position: 'absolute', top: 34, left: 0, width: '100%', height: 9 }}>
        <div style={{ flex: 1, background: '#002b7f' }} /><div style={{ flex: 1, background: '#fcd116' }} /><div style={{ flex: 1, background: '#ce1126' }} />
      </div>
      <div style={{ position: 'absolute', top: 115, left: 65, width: 550, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <svg width="88" height="104" viewBox="0 0 11 13" shapeRendering="crispEdges"><path fill="#b3192b" d="M5 0h1v1h-1zM4 1h3v1h-3zM3 2h5v1h-5zM5 3h1v1h-1zM2 4h3v1h-3zM6 4h3v1h-3zM1 5h3v1h-3zM7 5h3v1h-3zM5 6h1v1h-1zM3 7h5v1h-5zM4 8h3v1h-3z"/><path fill="#d4a017" d="M5 0h1v1h-1zM4 1h3v1h-3z"/><path fill="#1e1a1a" d="M5 8h1v5H5zM4 12h3v1H4z"/></svg>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: font ? 'Pixelify Sans' : 'sans-serif', fontSize: 68, lineHeight: 0.96, fontWeight: 700, marginTop: 18 }}><span>UNU’ LA UN</span><span>MILION</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: bodyFont ? 'Space Grotesk' : 'sans-serif', fontSize: 30, lineHeight: 1.28, marginTop: 22 }}><span>Câte răspunsuri rare știi despre</span><span>România?</span></div>
        <div style={{ display: 'flex', marginTop: 18, padding: '10px 17px', border: '4px solid #1e1a1a', boxShadow: '5px 5px 0 #1e1a1a', background: '#ce1126', color: '#fff', fontFamily: font ? 'Pixelify Sans' : 'sans-serif', fontWeight: 700, fontSize: 23 }}>Ediția 1 Decembrie · joc gratuit</div>
      </div>
      <svg width="475" height="345" viewBox="0 0 40 29" shapeRendering="crispEdges" style={{ position: 'absolute', top: 166, left: 670 }}>
        {REGION_IDS.map((region) => <path key={region} d={REGION_PATHS[region]} fill={colors[region]} />)}
        <path d={stitches} fill="none" stroke="#1e1a1a" strokeOpacity="0.48" strokeWidth="0.12" />
        {REGION_IDS.map((region) => <path key={region} d={REGION_OUTLINES[region]} fill="none" stroke="#1e1a1a" strokeWidth="0.17" />)}
      </svg>
    </div>,
    { ...size, fonts: [
      ...(font ? [{ name: 'Pixelify Sans', data: font, weight: 700 as const, style: 'normal' as const }] : []),
      ...(bodyFont ? [{ name: 'Space Grotesk', data: bodyFont, weight: 400 as const, style: 'normal' as const }] : []),
    ] },
  )
}
