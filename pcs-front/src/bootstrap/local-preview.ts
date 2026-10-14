export interface LocalPreviewOptions {
  development: boolean
  mockAuth: boolean
  hostname: string
}

/** 本机开发预览会话；真实认证和生产构建不创建模拟登录态。 */
export async function prepareLocalPreviewSession(options: LocalPreviewOptions): Promise<boolean> {
  const localHosts = ['localhost', '127.0.0.1', 'nuxt.example.invalid']
  if (!options.development || !options.mockAuth || !localHosts.includes(options.hostname)) {
    return false
  }

  const { mockLogin } = await import('@/mock/auth')
  await mockLogin('local_preview', '')
  return true
}
