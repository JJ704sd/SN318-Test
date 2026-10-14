import axios, { type AxiosAdapter, type AxiosInstance } from 'axios'
import type { LmdListQuery, LmdResource, LmdValue } from '@/api/lmd'
import { createLmdMockStore } from './lmd-store'

export interface LmdMockOptions {
  development: boolean
  enabled: boolean
  delayMs?: number
}

export function installLmdMock(client: AxiosInstance, options: LmdMockOptions): () => void {
  if (!options.development || !options.enabled) return () => {}
  const original = client.defaults.adapter
  const store = createLmdMockStore()
  const adapter: AxiosAdapter = async (config) => {
    const url = new URL(config.url ?? '', 'https://server.example.invalid')
    const route = /^\/pcs\/api\/lmd\/v1\/([^/]+)(?:\/([^/]+))?\/?$/.exec(url.pathname)
    if (!route) return axios.getAdapter(original)(config)
    await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 150))
    const resource = route[1] as LmdResource
    const id = route[2] === undefined ? undefined : decodeURIComponent(route[2])
    let envelope: { code: number; msg: string; data: unknown }
    try {
      const query: LmdListQuery = Object.fromEntries(url.searchParams)
      const params: unknown = config.params
      if (params && typeof params === 'object') Object.assign(query, params)
      const raw: unknown = config.data
      const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
      const body =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, LmdValue>)
          : {}
      const method = (config.method ?? 'get').toLowerCase()
      const result =
        method === 'get'
          ? store.list(resource, query)
          : method === 'post'
            ? store.create(resource, body)
            : method === 'patch' && id !== undefined
              ? store.update(resource, id, body)
              : method === 'delete' && id !== undefined
                ? store.remove(resource, id)
                : (() => {
                    throw new Error('该操作暂不可用')
                  })()
      envelope = { code: 200, msg: 'success', data: result }
    } catch (error: unknown) {
      envelope = {
        code: 409,
        msg: error instanceof Error ? error.message : '操作失败，请稍后重试',
        data: null,
      }
    }
    return {
      config,
      data: envelope,
      status: 200,
      statusText: 'OK',
      headers: { 'x-local-mock': 'lmd' },
    }
  }
  client.defaults.adapter = adapter
  return () => {
    if (client.defaults.adapter === adapter) client.defaults.adapter = original
  }
}
