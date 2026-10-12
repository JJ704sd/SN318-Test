import type { Component } from 'vue'
import {
  IconApps,
  IconBook,
  IconDashboard,
  IconHome,
  IconList,
} from '@arco-design/web-vue/es/icon'
// AuthPolicy 由 core /router 复用；RouteMeta 基础字段同由 core 全局声明，本地仅覆盖 icon 为组件对象
import type { AuthPolicy } from '@baiyun/template-core/router'
import type { RouteRecordRaw } from 'vue-router'

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
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', hideInMenu: true, auth: 'public' },
  },
  {
    // /user/login：登录页的独立访问路径，复用同一 LoginView（Lazy 复用同一 chunk）
    // 原 /login 路由保持不动；注意勿用 /auth/login（真实认证模式整页跳 BFF 的 /auth/login）
    path: '/user/login',
    name: 'user-login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', hideInMenu: true, auth: 'public' },
  },
  {
    path: '/',
    component: () => import('@/layout/BasicLayout.vue'),
    redirect: { name: 'home' },
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/home/HomeView.vue'),
        meta: {
          title: '首页',
          icon: IconHome,
          auth: { resourceId: 'operation:frontend_demo.page.home' },
        },
      },
      {
        // componentless 父记录：保留菜单/权限元数据，页面渲染由 BasicLayout 内容区承接
        path: 'demo',
        name: 'demo',
        redirect: { name: 'demo-list' },
        meta: { title: '示例管理', icon: IconBook, auth: { resourceId: 'menu:frontend_demo.demo' } },
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
