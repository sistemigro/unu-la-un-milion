import type { RegionId } from '../lib/types'

/**
 * Romania's 42 ADM1 units (41 counties + Bucharest) grouped into the seven
 * historical regions the map stitches.
 *
 * Keys are `shapeName` exactly as geoBoundaries spells them — unaccented
 * ASCII, so `Arges`, not `Argeș`. Do not "fix" the spelling here or the
 * lookup breaks.
 *
 * Two judgement calls, both flagged in the plan as open questions:
 *  - Bucharest and Ilfov sit with Muntenia.
 *  - Satu Mare sits with Maramureș rather than Crișana. Historically it is
 *    Sătmar/Crișana, but Banat & Crișana is already the larger region and
 *    putting it with Maramureș keeps both areas contiguous on the grid, which
 *    matters more for a 40x29 picture than the historical nicety.
 */
export const COUNTY_REGION: Record<string, RegionId> = {
  // Oltenia (5)
  Dolj: 'oltenia',
  Gorj: 'oltenia',
  Mehedinti: 'oltenia',
  Olt: 'oltenia',
  Valcea: 'oltenia',

  // Muntenia (11, including the capital)
  Arges: 'muntenia',
  Braila: 'muntenia',
  Bucuresti: 'muntenia',
  Buzau: 'muntenia',
  Calarasi: 'muntenia',
  Dambovita: 'muntenia',
  Giurgiu: 'muntenia',
  Ialomita: 'muntenia',
  Ilfov: 'muntenia',
  Prahova: 'muntenia',
  Teleorman: 'muntenia',

  // Dobrogea (2)
  Constanta: 'dobrogea',
  Tulcea: 'dobrogea',

  // Moldova (7)
  Bacau: 'moldova',
  Botosani: 'moldova',
  Galati: 'moldova',
  Iasi: 'moldova',
  Neamt: 'moldova',
  Vaslui: 'moldova',
  Vrancea: 'moldova',

  // Banat & Crișana (4)
  Arad: 'banat-crisana',
  Bihor: 'banat-crisana',
  'Caras-Severin': 'banat-crisana',
  Timis: 'banat-crisana',

  // Maramureș & Bucovina (3)
  Maramures: 'maramures-bucovina',
  'Satu Mare': 'maramures-bucovina',
  Suceava: 'maramures-bucovina',

  // Transilvania (10)
  Alba: 'transilvania',
  'Bistrita-Nasaud': 'transilvania',
  Brasov: 'transilvania',
  Cluj: 'transilvania',
  Covasna: 'transilvania',
  Harghita: 'transilvania',
  Hunedoara: 'transilvania',
  Mures: 'transilvania',
  Salaj: 'transilvania',
  Sibiu: 'transilvania',
}
