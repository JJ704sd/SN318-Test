import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

/** 面包屑判定与 PageHeader 一致：matched 中带 meta.title 的记录数 > 1 才显示 */
function breadcrumbTitles(router: ReturnType<typeof makeRouter>): string[] {
  return router.currentRoute.value.matched
    .filter((record) => record.meta?.title)
    .map((record) => record.meta.title as string)
}

describe('routes 结构（精简计划阶段2：薄层清理后）', () => {
  it('/login 与 /user/login 为独立懒加载记录，均为 public', async () => {
    const r = makeRouter()
    await r.push('/login')
    expect(r.currentRoute.value.name).toBe('login')
    expect(r.currentRoute.value.matched).toHaveLength(1)
    expect(r.currentRoute.value.meta.auth).toBe('public')

    await r.push('/user/login')
    expect(r.currentRoute.value.name).toBe('user-login')
    expect(r.currentRoute.value.matched).toHaveLength(1)
    expect(r.currentRoute.value.meta.auth).toBe('public')
  })

  it('/demo/list matched 保留 componentless 父层级（面包屑/权限元数据不丢）', async () => {
    const r = makeRouter()
    await r.push('/demo/list')
    const matched = r.currentRoute.value.matched
    expect(r.currentRoute.value.name).toBe('demo-list')
    // demo 与 list 分组父记录仍在 matched 且无 component
    const demo = matched.find((m) => m.path === '/demo')
    const list = matched.find((m) => m.path === '/demo/list')
    expect(demo).toBeTruthy()
    expect(list).toBeTruthy()
    expect(demo?.components?.default).toBeUndefined()
    expect(list?.components?.default).toBeUndefined()
    // 叶子路由可直接懒加载组件（componentless 折叠后由 BasicLayout 内容区渲染）
    expect(matched.at(-1)?.name).toBe('demo-list')
  }, 60_000)

  it('/demo 重定向到 /demo/list', async () => {
    const r = makeRouter()
    await r.push('/demo')
    expect(r.currentRoute.value.name).toBe('demo-list')
  })

  it('/demo/dashboard 与 /demo/components 直接匹配叶子', async () => {
    const r = makeRouter()
    await r.push('/demo/dashboard')
    expect(r.currentRoute.value.name).toBe('demo-dashboard')
    await r.push('/demo/components')
    expect(r.currentRoute.value.name).toBe('components')
  }, 60_000)

  it('详情页 matched 保留父级分组 title（面包屑层级可用）且 activeMenu 指向列表', async () => {
    const r = makeRouter()
    await r.push('/demo/list/detail')
    expect(r.currentRoute.value.name).toBe('demo-detail')
    expect(r.currentRoute.value.meta.activeMenu).toBe('/demo/list')
    expect(breadcrumbTitles(r)).toEqual(['示例管理', '列表页', '详情页'])
  })

  it('业务路由声明资源级权限、异常页为 public', async () => {
    const r = makeRouter()
    await r.push('/demo/list')
    const auth = r.currentRoute.value.meta.auth as { resourceId?: string }
    expect(typeof auth).toBe('object')
    expect(auth.resourceId).toContain('demo_list')

    await r.push('/pcs/master-data/country')
    expect(r.currentRoute.value.name).toBe('master-data-workspace')
    expect(r.currentRoute.value.query.resource).toBe('country')

    await r.push('/pcs/master-data/exchange-rate')
    expect(r.currentRoute.value.name).toBe('master-data-workspace')
    expect(r.currentRoute.value.query.resource).toBe('exchange_rate')

    await r.push('/pcs/master-data')
    expect(r.currentRoute.value.name).toBe('master-data-workspace')
    expect(r.currentRoute.value.meta.auth).toEqual({ resourceId: 'menu:pcs.front.base_data' })
    expect(breadcrumbTitles(r)).toEqual(['系统配置', '基础配置'])

    await r.push('/system-config/master-data')
    expect(r.currentRoute.value.name).toBe('master-data-workspace')
    expect(breadcrumbTitles(r)).toEqual(['系统配置', '基础配置'])

    await r.push({ name: 'master-data-workspace', query: { group: 'finance', resource: 'exchange_rate' } })
    expect(r.currentRoute.value.name).toBe('master-data-workspace')
    expect(r.currentRoute.value.query.resource).toBe('exchange_rate')

    await r.push('/404')
    expect(r.currentRoute.value.name).toBe('exception-404')
    expect(r.currentRoute.value.meta.auth).toBe('public')
  })

  it('未匹配路径经 catch-all 落到 /404', async () => {
    const r = makeRouter()
    await r.push('/no/such/page')
    expect(r.currentRoute.value.name).toBe('exception-404')
  })

  it('/ → 展示登录页，业务路径仍保留菜单 icon 与资源级权限', async () => {
    const r = makeRouter()
    await r.push('/')
    expect(r.currentRoute.value.name).toBe('login')
    expect(r.currentRoute.value.meta.auth).toBe('public')

    await r.push('/system-config/master-data')
    expect(r.currentRoute.value.meta.icon).toBeTruthy()
    const auth = r.currentRoute.value.meta.auth as { resourceId?: string }
    expect(auth.resourceId).toBe('menu:pcs.front.base_data')
  }, 60_000)

  it('/demo/list/form 懒加载运单表单，activeMenu 指向列表', async () => {
    const r = makeRouter()
    await r.push('/demo/list/form')
    expect(r.currentRoute.value.name).toBe('demo-form')
    expect(r.currentRoute.value.meta.activeMenu).toBe('/demo/list')
  }, 60_000)

  it('异常页 403/500/auth-unavailable/auth-error 均为 public 懒加载', async () => {
    const r = makeRouter()
    const cases: Array<[string, string]> = [
      ['/403', 'exception-403'],
      ['/500', 'exception-500'],
      ['/auth-unavailable', 'exception-auth-unavailable'],
      ['/auth-error', 'exception-auth-error'],
    ]
    for (const [path, name] of cases) {
      await r.push(path)
      expect(r.currentRoute.value.name).toBe(name)
      expect(r.currentRoute.value.meta.auth).toBe('public')
    }
  }, 60_000)
})
