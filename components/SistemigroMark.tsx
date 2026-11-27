/**
 * The Sistemigro mark, resampled onto a 28×28 stitch grid so it belongs to the
 * same pixel world as the map and the pomul vieții in the header, and painted
 * in black and white — the linen ground and the ink thread, nothing else.
 *
 * `shapeRendering="crispEdges"` is the SVG equivalent of `image-rendering:
 * pixelated` — the raster property does nothing here. Cells run 1.01 wide so
 * adjacent rows cannot show a hairline seam at fractional CSS sizes.
 */

const DISC =
  'M10 0h8v1.01h-8zM8 1h12v1.01h-12zM6 2h16v1.01h-16zM5 3h18v1.01h-18zM4 4h20v1.01h-20zM3 5h9v1.01h-9zM16 5h9v1.01h-9zM2 6h9v1.01h-9zM17 6h9v1.01h-9zM2 7h7v1.01h-7zM13 7h2v1.01h-2zM19 7h7v1.01h-7zM1 8h6v1.01h-6zM11 8h6v1.01h-6zM21 8h6v1.01h-6zM1 9h5v1.01h-5zM9 9h10v1.01h-10zM22 9h5v1.01h-5zM0 10h6v1.01h-6zM8 10h5v1.01h-5zM15 10h5v1.01h-5zM22 10h6v1.01h-6zM0 11h6v1.01h-6zM8 11h5v1.01h-5zM15 11h13v1.01h-13zM0 12h6v1.01h-6zM8 12h20v1.01h-20zM0 13h6v1.01h-6zM10 13h3v1.01h-3zM15 13h1v1.01h-1zM21 13h7v1.01h-7zM0 14h8v1.01h-8zM12 14h1v1.01h-1zM15 14h1v1.01h-1zM22 14h6v1.01h-6zM0 15h10v1.01h-10zM12 15h1v1.01h-1zM15 15h5v1.01h-5zM22 15h6v1.01h-6zM0 16h13v1.01h-13zM15 16h5v1.01h-5zM22 16h6v1.01h-6zM0 17h6v1.01h-6zM8 17h5v1.01h-5zM15 17h5v1.01h-5zM22 17h6v1.01h-6zM1 18h5v1.01h-5zM10 18h3v1.01h-3zM15 18h4v1.01h-4zM22 18h5v1.01h-5zM1 19h6v1.01h-6zM11 19h6v1.01h-6zM21 19h6v1.01h-6zM2 20h7v1.01h-7zM13 20h2v1.01h-2zM19 20h7v1.01h-7zM2 21h9v1.01h-9zM18 21h8v1.01h-8zM3 22h9v1.01h-9zM16 22h9v1.01h-9zM4 23h20v1.01h-20zM5 24h18v1.01h-18zM6 25h16v1.01h-16zM8 26h12v1.01h-12zM10 27h8v1.01h-8z'

const MARK =
  'M12 5h4v1.01h-4zM11 6h6v1.01h-6zM9 7h4v1.01h-4zM15 7h4v1.01h-4zM7 8h4v1.01h-4zM17 8h4v1.01h-4zM6 9h3v1.01h-3zM19 9h3v1.01h-3zM6 10h2v1.01h-2zM13 10h2v1.01h-2zM20 10h2v1.01h-2zM6 11h2v1.01h-2zM13 11h2v1.01h-2zM6 12h2v1.01h-2zM6 13h4v1.01h-4zM13 13h2v1.01h-2zM16 13h5v1.01h-5zM8 14h4v1.01h-4zM13 14h2v1.01h-2zM16 14h6v1.01h-6zM10 15h2v1.01h-2zM13 15h2v1.01h-2zM20 15h2v1.01h-2zM13 16h2v1.01h-2zM20 16h2v1.01h-2zM6 17h2v1.01h-2zM13 17h2v1.01h-2zM20 17h2v1.01h-2zM6 18h4v1.01h-4zM13 18h2v1.01h-2zM19 18h3v1.01h-3zM7 19h4v1.01h-4zM17 19h4v1.01h-4zM9 20h4v1.01h-4zM15 20h4v1.01h-4zM11 21h7v1.01h-7zM12 22h4v1.01h-4z'

export function SistemigroMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={DISC} fill="var(--color-linen)" />
      <path d={MARK} fill="var(--color-ink)" />
    </svg>
  )
}
