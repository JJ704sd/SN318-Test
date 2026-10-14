import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'

const { fakeClient, getHttpMock, runOnErrorMock } = vi.hoisted(() => {
  const fakeClient: Record<string, ReturnType<typeof vi.fn>> = {}
  return { fakeClient, getHttpMock: vi.fn<(module?: string) => AxiosInstance>(), runOnErrorMock: vi.fn<(...args: unknown[]) => void>() }
})

vi.mock('./http', () => ({ getHttp: getHttpMock, http: {} }))
vi.mock('./handlers', () => ({ runOnError: runOnErrorMock }))

import { del, download, get, patch, post, put, request as requestFn, upload } from './request'
import { ERROR_TEXT } from './errorCode'

/** 每用例重建 fake client 并注入 request 层。 */
function makeClient() {
  fakeClient.get = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  fakeClient.post = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  fakeClient.put = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  fakeClient.patch = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  fakeClient.delete = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  fakeClient.request = vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
  getHttpMock.mockReturnValue(fakeClient as unknown as AxiosInstance)
  return fakeClient
}

/** stub URL.createObjectURL/revokeObjectURL + document.body.appendChild，捕获 download 触发保存的 <a> 以校验文件名。 */
function stubBrowserSave() {
  let captured: HTMLAnchorElement | undefined
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn<(blob: Blob) => string>(() => 'blob:m'),
    revokeObjectURL: vi.fn<(url: string) => void>(),
  } as unknown as typeof URL)
  const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    captured = node as HTMLAnchorElement
    return node
  })
  return {
    getDownload: () => captured?.download,
    restore: () => appendSpy.mockRestore(),
  }
}

describe('request 帮助函数', () => {
  beforeEach(() => runOnErrorMock.mockClear())
  afterEach(() => {
    runOnErrorMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('get 解包 data 并透传 params', async () => {
    const client = makeClient()
    client.get.mockResolvedValue({ data: { id: 1 } })
    await expect(get<{ id: number }>('/users', { page: 1 })).resolves.toEqual({ id: 1 })
    expect(client.get).toHaveBeenCalledWith('/users', expect.objectContaining({ params: { page: 1 } }))
  })

  it('post 携带 body 解包 data', async () => {
    const client = makeClient()
    client.post.mockResolvedValue({ data: 'ok' })
    await expect(post('/x', { a: 1 })).resolves.toBe('ok')
    expect(client.post).toHaveBeenCalledWith('/x', { a: 1 }, undefined)
  })

  it('put / patch / del 走对应方法并解包', async () => {
    const client = makeClient()
    client.put.mockResolvedValue({ data: 'put' })
    await expect(put('/p', { v: 1 })).resolves.toBe('put')
    client.patch.mockResolvedValue({ data: 'patch' })
    await expect(patch('/p', { v: 2 })).resolves.toBe('patch')
    client.delete.mockResolvedValue({ data: 'del' })
    await expect(del('/p', { id: 3 })).resolves.toBe('del')
    expect(client.delete).toHaveBeenCalledWith('/p', expect.objectContaining({ params: { id: 3 } }))
  })

  it('request 通用方法解包 data', async () => {
    const client = makeClient()
    client.request.mockResolvedValue({ data: 'r' })
    await expect(requestFn({ url: '/any' })).resolves.toBe('r')
  })

  it('upload 透传 FormData 与 onProgress', async () => {
    const client = makeClient()
    client.post.mockResolvedValue({ data: 'up' })
    const fd = new FormData()
    const onProgress = vi.fn<(event: unknown) => void>()
    await expect(upload('/up', fd, { onProgress })).resolves.toBe('up')
    expect(client.post).toHaveBeenCalledWith('/up', fd, expect.objectContaining({ onUploadProgress: onProgress }))
  })

  it('download 成功保存非 json blob，并用 content-disposition 命名', async () => {
    const client = makeClient()
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    const originalUrl = globalThis.URL
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    } as unknown as typeof URL)
    client.get.mockResolvedValue({
      data: new Blob(['hello'], { type: 'text/plain' }),
      headers: { 'content-disposition': 'attachment; filename="a.txt"' },
    })
    await download('/dl', { id: 1 })
    expect(client.get).toHaveBeenCalledWith('/dl', expect.objectContaining({ responseType: 'blob', params: { id: 1 } }))
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
    // 还原被 stub 前的全局（这里引用 originalUrl 仅为非空断言留痕）
    void originalUrl
  })

  it('download 遇 JSON 错误信封：走 onError 并抛归一错误、不触发保存', async () => {
    const client = makeClient()
    const createObjectURL = vi.fn<(blob: Blob) => string>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn<(url: string) => void>() } as unknown as typeof URL)
    client.get.mockResolvedValue({
      data: new Blob(['{"code":1001,"msg":"后端拒绝"}'], { type: 'application/json' }),
    })
    await expect(download('/dl')).rejects.toMatchObject({ kind: 'business', message: '后端拒绝', bizCode: 1001 })
    expect(runOnErrorMock).toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  // ---- 分支补全（覆盖 if/else、||/??、可选链各方向）----

  it('client 按 config.meta.apiModule 选择实例', async () => {
    const client = makeClient()
    client.get.mockResolvedValue({ data: 'm' })
    await get('/m', undefined, { meta: { apiModule: 'file' } })
    expect(getHttpMock).toHaveBeenCalledWith('file')
  })

  it('upload 接收 File 时包装为表单字段（不走 FormData 直传分支）', async () => {
    const client = makeClient()
    client.post.mockResolvedValue({ data: 'up-file' })
    const file = new File(['content'], 'a.png', { type: 'image/png' })
    await expect(upload('/up', file)).resolves.toBe('up-file')
    const sent = client.post.mock.calls[0][1] as FormData
    expect(sent).toBeInstanceOf(FormData)
    expect(sent.get('file')).toBe(file)
    // 未传 config：且不设置 onUploadProgress
    expect(client.post.mock.calls[0][2]).toMatchObject({ onUploadProgress: undefined })
  })

  it('download 解析 UTF-8 filename* 编码文件名', async () => {
    const client = makeClient()
    const save = stubBrowserSave()
    client.get.mockResolvedValue({
      data: new Blob(['hi'], { type: 'text/plain' }),
      headers: { 'content-disposition': "attachment; filename*=UTF-8''my%20file%20v2.txt" },
    })
    await download('/dl')
    expect(save.getDownload()).toBe('my file v2.txt')
    save.restore()
  })

  it('download 无 content-disposition 时用传入 filename 兜底', async () => {
    const client = makeClient()
    const save = stubBrowserSave()
    client.get.mockResolvedValue({ data: new Blob(['x'], { type: 'text/plain' }) })
    await download('/dl', undefined, { filename: 'fallback.txt' })
    expect(save.getDownload()).toBe('fallback.txt')
    save.restore()
  })

  it('download 无 disposition 且无 filename 时落默认 download 名', async () => {
    const client = makeClient()
    const save = stubBrowserSave()
    client.get.mockResolvedValue({ data: new Blob(['x'], { type: 'text/plain' }) })
    await download('/dl')
    expect(save.getDownload()).toBe('download')
    save.restore()
  })

  it('download 遇 JSON 信封无 msg：用兜底文案抛归一错误', async () => {
    const client = makeClient()
    client.get.mockResolvedValue({ data: new Blob(['{"code":2002}'], { type: 'application/json' }) })
    await expect(download('/dl')).rejects.toMatchObject({
      kind: 'business',
      message: ERROR_TEXT.business,
      bizCode: 2002,
    })
    expect(runOnErrorMock).toHaveBeenCalled()
  })

  it('download 遇非法 JSON 信封：进入 catch 兜底并抛归一错误', async () => {
    const client = makeClient()
    client.get.mockResolvedValue({ data: new Blob(['not-json'], { type: 'application/json' }) })
    await expect(download('/dl')).rejects.toMatchObject({
      kind: 'business',
      message: ERROR_TEXT.business,
      bizCode: undefined,
    })
    expect(runOnErrorMock).toHaveBeenCalled()
  })
})
