import type { Component } from 'vue'
import {
  IconApps,
  IconBook,
  IconCommon,
  IconDashboard,
  IconFile,
  IconLayers,
  IconList,
  IconSettings,
  IconStorage,
  IconTag,
  IconThunderbolt,
} from '@arco-design/web-vue/es/icon'
// AuthPolicy 由 core /router 复用；RouteMeta 基础字段同由 core 全局声明，本地仅覆盖 icon 为组件对象
import type { AuthPolicy } from '@core/router'
import type { RouteRecordRaw } from 'vue-router'
import { MASTER_DATA_KEYS, getMasterDataConfig, getMasterDataGroup, type MasterDataKey } from '@/views/master-data/config'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 菜单图标：显式导入的图标组件对象（路由守卫与菜单直接 render，不维护字符串图标表） */
    icon?: Component
    hideInMenu?: boolean
    activeMenu?: string
    exceptionType?: '404' | '403' | '500' | 'offline' | 'error' | 'auth-unavailable' | 'auth-error'
    /** 访问策略；缺省按 'authenticated' 处理 */
    auth?: AuthPolicy
    masterDataKey?: MasterDataKey
    masterDataReadPermission?: string
  }
}

const masterDataRoutes: RouteRecordRaw[] = MASTER_DATA_KEYS.filter((key) => getMasterDataConfig(key)?.visibleInMenu !== false).map((key) => {
  const config = getMasterDataConfig(key)
  if (!config) throw new Error(`基础数据路由配置缺失：${key}`)
  return {
    path: key.replaceAll('_', '-'),
    name: `master-data-${key}`,
    component: () => import('@/views/master-data/views/MasterDataPage.view.vue'),
    props: { embedded: true, masterDataKey: key },
    beforeEnter: () => {
      const group = getMasterDataGroup(key)
      return {
        name: 'master-data-workspace',
        query: { group: group?.key ?? 'location', resource: key },
        replace: true,
      }
    },
    meta: {
      title: config.title,
      hideInMenu: true,
      masterDataKey: key,
      masterDataReadPermission: `operation:pcs.front.${key}.read`,
      auth: { resourceId: `operation:pcs.front.page.${key}` },
    },
  }
})

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', hideInMenu: true, auth: 'public' },
  },
  {
    // /user/login：登录页的独立访问路径，复用同一 LoginView（Lazy 复用同一 chunk）
    // /auth/login 是权限中台 BFF 端点，前端通过 LoginView 打开的登录浮层访问它。
    path: '/user/login',
    name: 'user-login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', hideInMenu: true, auth: 'public' },
  },
  {
    path: '/',
    alias: '/pcs',
    component: () => import('@/layout/BasicLayout.vue'),
    // 根地址展示登录页并自动打开权限中台登录浮层，认证成功后进入基础配置工作区。
    // 业务页面仍沿用原有根路径，避免调整现有菜单和权限资源的 URL。
    redirect: { name: 'login' },
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/home/HomeView.vue'),
        meta: {
          title: '基础配置',
          icon: IconList,
          hideInMenu: true,
          activeMenu: '/system-config/master-data',
          auth: { resourceId: 'operation:pcs.front.page.home' },
        },
      },
      {
        // componentless 父记录：保留菜单/权限元数据，页面渲染由 BasicLayout 内容区承接
        path: 'product',
        name: 'product',
        redirect: { name: 'service-unit' },
        meta: { title: '产品管理', icon: IconApps, auth: { resourceId: 'menu:pcs.front.product' } },
        children: [
          {
            // componentless 中间层：保留 /product/service/* 分组路径层级，不引入薄层组件
            path: 'service',
            name: 'product-service',
            redirect: { name: 'service-unit' },
            meta: { title: '服务管理', icon: IconCommon, auth: { resourceId: 'menu:pcs.front.product.service' } },
            children: [
              {
                path: 'unit',
                name: 'service-unit',
                component: () => import('@/views/product/view/service/ServiceUnit.view.vue'),
                meta: { title: '服务单元', icon: IconLayers, auth: { resourceId: 'operation:pcs.front.page.service_unit' } },
              },
              {
                // 隐藏页：由「服务单元」列表页「新建服务单元」按钮进入，不出现在侧边栏
                path: 'unit/new',
                name: 'service-unit-create',
                component: () => import('@/views/product/view/service/ServiceUnitEdit.view.vue'),
                meta: {
                  title: '新建服务单元',
                  hideInMenu: true,
                  activeMenu: '/product/service/unit',
                  auth: { resourceId: 'operation:pcs.front.page.service_unit' },
                },
              },
              {
                // 隐藏页：与新建共用同一页面，路径带服务单元编码，页面据此进入编辑态
                path: 'unit/edit/:code',
                name: 'service-unit-edit',
                component: () => import('@/views/product/view/service/ServiceUnitEdit.view.vue'),
                meta: {
                  title: '编辑服务单元',
                  hideInMenu: true,
                  activeMenu: '/product/service/unit',
                  auth: { resourceId: 'operation:pcs.front.page.service_unit' },
                },
              },
              {
                // 隐藏页：服务单元详情（只读），由列表的「详情」按钮 / 编码链接进入
                path: 'unit/detail/:code',
                name: 'service-unit-detail',
                component: () => import('@/views/product/view/service/ServiceUnitDetail.view.vue'),
                meta: {
                  title: '服务单元详情',
                  hideInMenu: true,
                  activeMenu: '/product/service/unit',
                  auth: { resourceId: 'operation:pcs.front.page.service_unit' },
                },
              },
              {
                path: 'combination',
                name: 'service-combination',
                component: () => import('@/views/product/view/service/ServiceCombination.view.vue'),
                meta: { title: '服务组合', icon: IconStorage, auth: { resourceId: 'operation:pcs.front.page.service_combination' } },
              },
              {
                // 隐藏页：由「服务单元」列表页「下单规则」按钮进入，不出现在侧边栏
                path: 'rule',
                name: 'ordering-rule',
                component: () => import('@/views/product/view/service/OrderingRules.view.vue'),
                meta: {
                  title: '下单限制规则',
                  hideInMenu: true,
                  activeMenu: '/product/service/unit',
                  auth: { resourceId: 'operation:pcs.front.page.service_unit' },
                },
              },
            ],
          },
          {
            // componentless 中间层：保留 /product/price/* 分组路径层级，不引入薄层组件
            path: 'price',
            name: 'product-price',
            redirect: { name: 'cost-price-card' },
            meta: { title: '价格维护', icon: IconTag, auth: { resourceId: 'menu:pcs.front.product.price' } },
            children: [
              {
                path: 'cost-card',
                name: 'cost-price-card',
                component: () => import('@/views/product/view/price/CostPriceCard.view.vue'),
                meta: { title: '成本价卡', icon: IconFile, auth: { resourceId: 'operation:pcs.front.page.cost_price_card' } },
              },
              {
                path: 'fuel-rule',
                name: 'fuel-surcharge-rule',
                component: () => import('@/views/product/view/price/FuelSurchargeRule.view.vue'),
                meta: { title: '燃油费规则', icon: IconThunderbolt, auth: { resourceId: 'operation:pcs.front.page.fuel_rule' } },
              },
            ],
          },
        ],
      },
      {
        path: 'system-config',
        name: 'system-config',
        redirect: { name: 'master-data' },
        meta: { title: '系统配置', icon: IconSettings },
        children: [
          {
            path: 'master-data',
            alias: ['/master-data', '/pcs/master-data'],
            name: 'master-data',
            component: () => import('@/views/master-data/views/MasterDataWorkspace.view.vue'),
            meta: { title: '基础配置', icon: IconList, auth: { resourceId: 'menu:pcs.front.base_data' } },
            children: [
              {
                path: '',
                name: 'master-data-workspace',
                component: () => import('@/views/master-data/views/MasterDataResourcePanel.view.vue'),
                meta: {
                  hideInMenu: true,
                  // 工作区入口没有独立的 page 资源，沿用基础数据菜单权限；
                  // 具体对象页面再由 main.ts 检查各自的 read 权限。
                  auth: { resourceId: 'menu:pcs.front.base_data' },
                },
              },
              ...masterDataRoutes,
            ],
          },
        ],
      },
      {
        // componentless 父记录：保留菜单/权限元数据，页面渲染由 BasicLayout 内容区承接
        path: 'demo',
        name: 'demo',
        redirect: { name: 'demo-list' },
        meta: { title: '示例管理', icon: IconBook, hideInMenu: true, auth: { resourceId: 'menu:frontend_demo.demo' } },
        children: [
          {
            // componentless 中间层：保留 /demo/list/* 分组路径层级，不引入薄层组件
            path: 'list',
            redirect: { name: 'demo-list' },
            meta: { title: '列表页', icon: IconList, auth: { resourceId: 'operation:frontend_demo.page.demo_list' } },
            children: [
              {
                path: '',
                name: 'demo-list',
                component: () => import('@/views/demo/views/ListView.vue'),
                meta: { hideInMenu: true, auth: { resourceId: 'operation:frontend_demo.page.demo_list' } },
              },
              {
                path: 'detail',
                name: 'demo-detail',
                component: () => import('@/views/demo/views/DetailView.vue'),
                meta: {
                  title: '详情页',
                  hideInMenu: true,
                  activeMenu: '/demo/list',
                  auth: { resourceId: 'operation:frontend_demo.page.demo_detail' },
                },
              },
              {
                path: 'form',
                name: 'demo-form',
                component: () => import('@/views/demo/views/FormView.vue'),
                meta: {
                  title: '新建运单',
                  hideInMenu: true,
                  activeMenu: '/demo/list',
                  auth: { resourceId: 'operation:frontend_demo.page.demo_form' },
                },
              },
            ],
          },
          {
            path: 'dashboard',
            name: 'demo-dashboard',
            component: () => import('@/views/demo/views/DashboardView.vue'),
            meta: { title: '仪表盘', icon: IconDashboard, auth: { resourceId: 'operation:frontend_demo.page.demo_dashboard' } },
          },
          {
            path: 'components',
            name: 'components',
            component: () => import('@/views/components/ComponentsShowcase.vue'),
            meta: { title: '基础组件', icon: IconApps, auth: { resourceId: 'operation:frontend_demo.page.demo_components' } },
          },
        ],
      },
    ],
  },
  {
    path: '/404',
    name: 'exception-404',
    component: () => import('@/views/exception/ExceptionView.vue'),
    meta: { title: '页面不存在', hideInMenu: true, exceptionType: '404', auth: 'public' },
  },
  {
    path: '/403',
    name: 'exception-403',
    component: () => import('@/views/exception/ExceptionView.vue'),
    meta: { title: '暂无访问权限', hideInMenu: true, exceptionType: '403', auth: 'public' },
  },
  {
    path: '/500',
    name: 'exception-500',
    component: () => import('@/views/exception/ExceptionView.vue'),
    meta: { title: '服务器开小差', hideInMenu: true, exceptionType: '500', auth: 'public' },
  },
  {
    path: '/auth-unavailable',
    name: 'exception-auth-unavailable',
    component: () => import('@/views/exception/ExceptionView.vue'),
    meta: { title: '认证服务不可用', hideInMenu: true, exceptionType: 'auth-unavailable', auth: 'public' },
  },
  {
    path: '/auth-error',
    name: 'exception-auth-error',
    component: () => import('@/views/exception/ExceptionView.vue'),
    meta: { title: '认证异常', hideInMenu: true, exceptionType: 'auth-error', auth: 'public' },
  },
  // catch-all 必须放路由表末尾，兜底所有未匹配路径重定向到 /404，不拦截上方正常路由
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]
