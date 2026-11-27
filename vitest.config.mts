import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Engine tests only. `lib/normalize.ts`, `lib/match.ts` and `lib/score.ts` are
 * deliberately free of React and Next imports, so this needs no plugins and
 * runs in plain Node.
 */
export default defineConfig({
  resolve: {
    // Mirrors `paths` in tsconfig.json — Vitest does not read it.
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
