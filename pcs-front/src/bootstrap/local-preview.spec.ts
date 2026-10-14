import { beforeEach, describe, expect, it } from 'vitest'
import { mockGetSession, mockLogout } from '@/mock/auth'
import { prepareLocalPreviewSession } from './local-preview'

beforeEach(async () => {
  await mockLogout('application')
})

describe('本机免登录预览', () => {
  it.each(['127.0.0.1', 'localhost', 'nuxt.example.invalid'])(
    '本机开发 Mock 模式直接提供可进入首页的会话：%s',
    async (hostname) => {
      await prepareLocalPreviewSession({ development: true, mockAuth: true, hostname })
      expect(await mockGetSession()).toMatchObject({
        authenticated: true,
        identity: { username: 'local_preview' },
      })
    },
  )

  it.each([
    { development: false, mockAuth: true, hostname: '127.0.0.1' },
    { development: true, mockAuth: false, hostname: '127.0.0.1' },
    { development: true, mockAuth: true, hostname: 'portal.example.com' },
  ])('不为生产、真实认证或外部站点创建会话：%j', async (options) => {
    await prepareLocalPreviewSession(options)
    expect(await mockGetSession()).toEqual({ authenticated: false })
  })
})
