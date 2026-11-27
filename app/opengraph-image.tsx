import { ImageResponse } from 'next/og'
import { REGION_PATHS } from '@/lib/map'
import { REGION_IDS, TIER_FILL, type RegionId, type Tier } from '@/lib/types'

export const alt =
  'Unul la un milion — câte răspunsuri rare știi despre România?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The card WhatsApp, Facebook and LinkedIn show for a shared link.
 *
 * Flat region fills, no cross-stitch texture: Satori does not reliably support
 * `<pattern>` or `currentColor`. The MVP ships this one static card; a map
 * generated per player is explicitly post-launch in the brief.
 */

// An illustrative good round, so the card shows the tricolour rather than an
// empty map. Not any real player's result.
const SHOWCASE: Record<RegionId, Tier> = {
  oltenia: 'rar',
  muntenia: 'bun',
  dobrogea: 'ulm',
  moldova: 'rar',
  'banat-crisana': 'cliseu',
  'maramures-bucovina': 'bun',
  transilvania: 'ulm',
}

/**
 * Fetched at build time, since this route has no dynamic input and Next
 * prerenders it. Wrapped because a build without network to fonts.gstatic.org
 * should degrade to the fallback face, not fail the whole build.
 */
async function pixelifySans(): Promise<ArrayBuffer | null> {
  try {
    // Both fetches are cached so the route prerenders instead of re-rendering
    // on every crawler hit — and on launch day the crawlers arrive in a burst.
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@700&display=swap',
      { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'force-cache' },
    ).then((r) => r.text())

    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/)?.[1]
    if (!url) return null

    return await fetch(url, { cache: 'force-cache' }).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const font = await pixelifySans()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F4EBDC',
          fontFamily: font ? 'Pixelify Sans' : 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', height: 14 }}>
          <div style={{ flex: 1, backgroundColor: '#002B7F' }} />
          <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
          <div style={{ flex: 1, backgroundColor: '#CE1126' }} />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 48,
            padding: '0 64px',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1, color: '#1E1A1A' }}>
              UNUL LA UN MILION
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.25, color: '#1E1A1A' }}>
              Câte răspunsuri rare știi despre România?
            </div>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                fontSize: 24,
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#CE1126',
                border: '3px solid #1E1A1A',
                padding: '8px 18px',
              }}
            >
              Ediția 1 Decembrie · joc gratuit
            </div>
          </div>

          <svg width={470} height={340} viewBox="0 0 40 29" style={{ flexShrink: 0 }}>
            {REGION_IDS.map((region) => (
              <path key={region} d={REGION_PATHS[region]} fill={TIER_FILL[SHOWCASE[region]]} />
            ))}
          </svg>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 64px 28px',
            fontSize: 20,
            color: '#5A4E40',
          }}
        >
          <span style={{ color: '#1E1A1A', fontWeight: 700 }}>unu-la-un-milion.com</span>
          <span>Făcut de Sistemigro</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: 'Pixelify Sans', data: font, weight: 700 as const, style: 'normal' as const }]
        : [],
    },
  )
}
