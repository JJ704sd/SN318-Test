import { describe, expect, it } from 'vitest'
import { createLocalDevApp } from './local-dev.js'

describe('local development BFF', () => {
  it('queries the real LMD transport through the existing BFF route', async () => {
    const app = createLocalDevApp({
      environment: 'dev',
      host: '127.0.0.1',
      lmdServiceBaseUrl: 'http://127.0.0.1:8082',
      pcsServiceBaseUrl: 'http://127.0.0.1:8080',
      fetcher: async (input) => {
        expect(String(input)).toBe('http://127.0.0.1:8082/api/v1/countries?page=1')
        return new Response(
          JSON.stringify({ code: 0, data: { list: [{ code: 'CN', name: '中国' }], total: 1 } }),
          {
            headers: { 'content-type': 'application/json' },
          },
        )
      },
    })
    const response = await app.inject('/pcs/api/lmd/v1/countries?page=1')
    expect(response.statusCode).toBe(200)
    expect(response.json().data.list).toEqual([{ code: 'CN', name: '中国' }])
    await app.close()
  })

  it.each([
    { environment: 'prod' },
    { nodeEnvironment: 'production' },
    { host: '0.0.0.0' },
    { lmdServiceBaseUrl: 'http://external.example' },
    { pcsServiceBaseUrl: 'https://127.0.0.1:8080' },
  ])('rejects unsafe local configuration: %j', (override) => {
    expect(() =>
      createLocalDevApp({
        environment: 'dev',
        host: '127.0.0.1',
        lmdServiceBaseUrl: 'http://127.0.0.1:8082',
        pcsServiceBaseUrl: 'http://127.0.0.1:8080',
        ...override,
      }),
    ).toThrow(/Local BFF/)
  })

  it('rejects requests from a non-local frontend origin', async () => {
    const app = createLocalDevApp({
      environment: 'dev',
      host: '127.0.0.1',
      lmdServiceBaseUrl: 'http://127.0.0.1:8082',
      pcsServiceBaseUrl: 'http://127.0.0.1:8080',
    })
    const response = await app.inject({
      url: '/healthz',
      headers: { origin: 'https://external.example' },
    })
    expect(response.statusCode).toBe(403)
    await app.close()
  })
})
