import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { POST as game } from '@/app/api/game/route'
import { POST as check } from '@/app/api/check/route'
import { GET as reveal } from '@/app/api/reveal/[gameId]/route'
import { checkAnswer } from '@/lib/bank.server'

const gameId = '1-decembrie'
const request = (url: string, body: object, cookie = '') => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body),
})
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]

afterEach(() => vi.useRealTimers())

describe('question progression', () => {
  it('does not accept Cuza as a participant in the 1918 union', () => {
    expect(checkAnswer('1-decembrie', 'personalitati-marea-unire', 'Alexandru Ioan Cuza', 1000)?.matched).toBe(false)
    expect(checkAnswer('istorie', 'marea-unire', 'Alexandru Ioan Cuza', 1000)?.matched).toBe(false)
  })
  it('skips only the active question and completes after seven skips', async () => {
    expect((await game(request('http://localhost/api/game', { gameId, action: 'skip', promptId: 'x' }))).status).toBe(403)
    const crossSite = new Request('http://localhost/api/game', { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify({ gameId, action: 'skip' }) })
    expect((await game(crossSite)).status).toBe(403)
    let response = await game(request('http://localhost/api/game', { gameId, action: 'start' }))
    let cookie = cookieOf(response)
    let data = await response.json()
    for (let i = 0; i < 7; i++) {
      expect((await game(request('http://localhost/api/game', { gameId, action: 'skip', promptId: 'wrong' }, cookie))).status).toBe(403)
      response = await game(request('http://localhost/api/game', { gameId, action: 'skip', promptId: data.prompt.id }, cookie))
      expect(response.status).toBe(200)
      cookie = cookieOf(response)
      expect((await game(request('http://localhost/api/game', { gameId, action: 'skip', promptId: data.prompt.id }, cookie))).status).toBe(403)
      response = await game(request('http://localhost/api/game', { gameId, action: 'next' }, cookie))
      cookie = cookieOf(response)
      data = await response.json()
      expect(data.index).toBe(i + 1)
    }
    expect(data.prompt).toBeNull()
    expect((await reveal(new Request('http://localhost', { headers: { cookie } }), { params: Promise.resolve({ gameId }) })).status).toBe(200)
  })
  it('only reveals the current prompt and requires finishing before the answers', async () => {
    vi.useFakeTimers()
    const started = await game(request('http://localhost/api/game', { gameId, action: 'start' }))
    let cookie = cookieOf(started)
    const first = await started.json()
    expect(first.index).toBe(0)
    expect(first.prompt.text).toBeTruthy()
    expect(first.prompt.answers).toBeUndefined()
    expect(await game(request('http://localhost/api/game', { gameId, action: 'next' }, cookie)).then(r => r.status)).toBe(403)
    expect(await reveal(new Request('http://localhost', { headers: { cookie } }), { params: Promise.resolve({ gameId }) }).then(r => r.status)).toBe(403)
    expect(await check(request('http://localhost/api/check', { gameId, promptId: 'other', answer: 'x', elapsedMs: 1 }, cookie)).then(r => r.status)).toBe(403)
    for (let index = 1; index <= 7; index++) {
      vi.advanceTimersByTime(20_000)
      const response = await game(request('http://localhost/api/game', { gameId, action: 'next' }, cookie))
      expect(response.status).toBe(200)
      cookie = cookieOf(response)
      const data = await response.json()
      expect(data.index).toBe(index)
      if (index < 7) expect(data.prompt.answers).toBeUndefined()
      else expect(data.prompt).toBeNull()
    }
    const revealed = await reveal(new Request('http://localhost', { headers: { cookie } }), { params: Promise.resolve({ gameId }) })
    expect(revealed.status).toBe(200)
    const data = await revealed.json()
    expect(data.prompts.flatMap((prompt: { answers: { fact?: string }[] }) => prompt.answers).some((answer: { fact?: string }) => !!answer.fact)).toBe(true)
  })
})
