import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { registerLmdProxyRoutes } from './lmd-proxy.js'

describe('LMD BFF proxy', () => {
  it('preserves the LMD path, query, method and JSON body', async () => {
    const app = Fastify()
    let receivedUrl = ''
    let receivedBody = ''
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      fetcher: async (input, init) => {
        receivedUrl = String(input)
        receivedBody = String(init?.body ?? '')
        return new Response(JSON.stringify({ code: 200, data: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/pcs/api/lmd/v1/countries?keyword=CN',
      payload: { code: 'CN', name: '中国' },
    })

    expect(response.statusCode).toBe(200)
    expect(receivedUrl).toBe('http://lmd.local/api/v1/countries?keyword=CN')
    expect(JSON.parse(receivedBody)).toEqual({ code: 'CN', name: '中国' })
    expect(response.json()).toEqual({ code: 200, data: { ok: true } })
    await app.close()
  })

  it('normalizes the service success envelope for template-core', async () => {
    const app = Fastify()
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      fetcher: async () => new Response(JSON.stringify({
        code: 0,
        message: 'success',
        data: { list: [], total: 0, page: 1, page_size: 20 },
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    })

    const response = await app.inject({ method: 'GET', url: '/pcs/api/lmd/v1/countries' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      code: 200,
      message: 'success',
      data: { list: [], total: 0, page: 1, page_size: 20 },
    })
    await app.close()
  })

  it('adds the server-side session token when the browser has no Bearer header', async () => {
    const app = Fastify()
    let receivedAuthorization = ''
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      authorizationResolver: async (request) => {
        expect(request.headers.cookie).toBe('byauth_session=session-1')
        return 'session-access-token'
      },
      fetcher: async (_input, init) => {
        receivedAuthorization = new Headers(init?.headers).get('authorization') ?? ''
        return new Response(JSON.stringify({ code: 200, data: null }), { status: 200 })
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/pcs/api/lmd/v1/countries',
      headers: { cookie: 'byauth_session=session-1' },
    })

    expect(response.statusCode).toBe(200)
    expect(receivedAuthorization).toBe('Bearer session-access-token')
    await app.close()
  })

  it('keeps an explicit Bearer header instead of resolving a cookie token', async () => {
    const app = Fastify()
    let resolverCalled = false
    let receivedAuthorization = ''
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      authorizationResolver: async () => {
        resolverCalled = true
        return 'session-access-token'
      },
      fetcher: async (_input, init) => {
        receivedAuthorization = new Headers(init?.headers).get('authorization') ?? ''
        return new Response(JSON.stringify({ code: 200, data: null }), { status: 200 })
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/pcs/api/lmd/v1/countries',
      headers: { authorization: 'Bearer explicit-token' },
    })

    expect(response.statusCode).toBe(200)
    expect(resolverCalled).toBe(false)
    expect(receivedAuthorization).toBe('Bearer explicit-token')
    await app.close()
  })

  it('maps an unreachable upstream to a stable 502 error', async () => {
    const app = Fastify()
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      fetcher: async () => {
        throw new Error('connection refused')
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/pcs/api/lmd/v1/countries',
    })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({
      code: 'lmd_upstream_unavailable',
      message: 'LMD 服务暂时不可用，请稍后重试',
      data: null,
    })
    await app.close()
  })

  it('maps upstream non-success responses to a stable error shape', async () => {
    const app = Fastify()
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      fetcher: async () => new Response(JSON.stringify({ code: 'LMD4001', message: '无操作权限' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    })

    const response = await app.inject({ method: 'GET', url: '/pcs/api/lmd/v1/countries' })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      code: 'lmd_upstream_unavailable_response',
      message: '无操作权限',
      data: null,
    })
    await app.close()
  })

  it('maps an upstream timeout to a stable 504 error', async () => {
    const app = Fastify()
    registerUpstreamProxyRouteForTest(app)
    const response = await app.inject({ method: 'GET', url: '/pcs/api/lmd/v1/countries' })

    expect(response.statusCode).toBe(504)
    expect(response.json()).toEqual({
      code: 'lmd_upstream_unavailable_timeout',
      message: '上游服务响应超时，请稍后重试',
      data: null,
    })
    await app.close()
  })
})

function registerUpstreamProxyRouteForTest(app: ReturnType<typeof Fastify>): void {
    registerLmdProxyRoutes(app, {
      upstreamBaseUrl: 'http://lmd.local',
      timeoutMs: 10,
      fetcher: () => new Promise<Response>(() => undefined),
  })
}
