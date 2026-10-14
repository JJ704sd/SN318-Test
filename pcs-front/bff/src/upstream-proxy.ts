import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export interface UpstreamProxyOptions {
  routePrefix: string
  upstreamBaseUrl: string
  upstreamPathPrefix: string
  unavailableCode: string
  unavailableMessage: string
  timeoutMs?: number
  /** Resolve the server-side Bearer token for a BFF cookie session. */
  authorizationResolver?: (request: FastifyRequest) => Promise<string | undefined>
  fetcher?: typeof globalThis.fetch
}

type ResolvedUpstreamProxyOptions = Omit<Required<UpstreamProxyOptions>, 'authorizationResolver'> & {
  authorizationResolver?: UpstreamProxyOptions['authorizationResolver']
  routePrefix: string
  upstreamBaseUrl: string
  upstreamPathPrefix: string
}

export function registerUpstreamProxyRoute(
  app: FastifyInstance,
  options: UpstreamProxyOptions,
): void {
  const fetcher = options.fetcher ?? globalThis.fetch
  const routePrefix = normalizePrefix(options.routePrefix)
  const upstreamBaseUrl = normalizeBaseUrl(options.upstreamBaseUrl)
  const upstreamPathPrefix = normalizePrefix(options.upstreamPathPrefix)

  app.all(
    `${routePrefix}/*`,
    { config: { auth: 'authenticated' } },
    async (request, reply) => {
      await proxyRequest(request, reply, {
        ...options,
        timeoutMs: options.timeoutMs ?? 8000,
        routePrefix,
        upstreamBaseUrl,
        upstreamPathPrefix,
        fetcher,
      })
    },
  )
}

async function proxyRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ResolvedUpstreamProxyOptions,
): Promise<void> {
  const requestUrl = new URL(request.url, 'http://pcs-front.local')
  const suffix = requestUrl.pathname.slice(options.routePrefix.length)
  const upstreamUrl = new URL(`${options.upstreamPathPrefix}${suffix}`, options.upstreamBaseUrl)
  upstreamUrl.search = requestUrl.search

  const method = request.method.toUpperCase()
  const headers = new Headers()
  copyHeader(request, headers, 'accept')
  copyHeader(request, headers, 'content-type')
  copyHeader(request, headers, 'authorization')
  copyHeader(request, headers, 'x-trace-id')
  if (request.headers.authorization === undefined && options.authorizationResolver !== undefined) {
    const accessToken = await options.authorizationResolver(request)
    if (accessToken !== undefined) headers.set('authorization', `Bearer ${accessToken}`)
  }
  const body = ['GET', 'HEAD'].includes(method)
    ? undefined
    : typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body ?? {})

  let response: Response
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 8000
  let timedOut = false
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true
        controller.abort()
        reject(new Error('upstream request timed out'))
      }, timeoutMs)
    })
    response = await Promise.race([
      options.fetcher(upstreamUrl, {
        method,
        headers,
        signal: controller.signal,
        ...(body === undefined ? {} : { body }),
      }),
      timeout,
    ])
  } catch (error) {
    request.log.error({ err: error, upstreamUrl: upstreamUrl.toString() }, 'upstream request failed')
    reply.code(timedOut ? 504 : 502).send({
      code: timedOut ? `${options.unavailableCode}_timeout` : options.unavailableCode,
      message: timedOut ? '上游服务响应超时，请稍后重试' : options.unavailableMessage,
      data: null,
    })
    return
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }

  const responseBody = Buffer.from(await response.arrayBuffer())
  if (!response.ok) {
    const upstreamError = parseJsonObject(responseBody)
    const message = typeof upstreamError?.message === 'string' ? upstreamError.message : options.unavailableMessage
    reply.code(response.status >= 500 ? 502 : response.status).send({
      code: `${options.unavailableCode}_response`,
      message,
      data: null,
    })
    return
  }

  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'content-length') reply.header(name, value)
  })
  reply.code(response.status).send(normalizeSuccessBody(responseBody))
}

/**
 * The services use the shared HTTP envelope with numeric code=0 for success.
 * The template-core request layer uses code=200 as its success sentinel, so
 * the BFF keeps that transport detail at the service boundary.
 */
function normalizeSuccessBody(body: Buffer): Buffer | Record<string, unknown> {
  const parsed = parseJsonObject(body)
  if (parsed?.code !== 0) return body
  return { ...parsed, code: 200 }
}

function parseJsonObject(body: Buffer): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(body.toString('utf8'))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch {
    // Keep the stable proxy error when the upstream body is not JSON.
  }
  return undefined
}

function copyHeader(request: FastifyRequest, headers: Headers, name: string): void {
  const value = request.headers[name]
  if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value)
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/\/+$/u, '')
  if (!trimmed.startsWith('/') || trimmed === '/') throw new Error(`Invalid proxy prefix: ${value}`)
  return trimmed
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/u, '')
  if (trimmed === '') throw new Error('Upstream base URL is required')
  return trimmed
}
