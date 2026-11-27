import { afterEach, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => callback() }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('sends the Supabase secret key in the apikey header only', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  const { logEvent } = await import('../lib/log.server')

  logEvent('share_click')

  expect(fetchMock).toHaveBeenCalledOnce()
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toBe('https://example.supabase.co/rest/v1/game_events')
  expect(options.headers.apikey).toBe('sb_secret_test')
  expect(options.headers).not.toHaveProperty('authorization')
})
