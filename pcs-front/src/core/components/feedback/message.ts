/**
 * 命令式轻提示统一出口（实施方案任务 2.13 / 规范 §05 消息提示、§07 操作反馈）
 *
 * Toast：浅底（50 色）+ 主色 30% 描边 + 主色圆底白符号图标 + 主色文字 + shadow-md；3s 自动消失。
 * 需标题+正文/操作按钮的异步消息走 notify.ts。
 */
import { Message } from '@arco-design/web-vue'
import {
  IconCheck,
  IconClose,
  IconExclamation,
  IconInfo,
} from '@arco-design/web-vue/es/icon/index.js'
import { h, type Component } from 'vue'

const DURATION = 3000
const POSITION = 'top' as const

type ToastType = 'success' | 'warning' | 'error' | 'info'

const TOAST_ICON: Record<ToastType, Component> = {
  success: IconCheck,
  warning: IconExclamation,
  error: IconClose,
  info: IconInfo,
}

function renderToastIcon(type: ToastType) {
  return () =>
    h('span', { class: ['by-toast-icon', `by-toast-icon--${type}`] }, [
      h(TOAST_ICON[type]),
    ])
}

function showToast(type: ToastType, content: string) {
  Message[type]({
    content,
    duration: DURATION,
    position: POSITION,
    icon: renderToastIcon(type),
  })
}

export function successMsg(content: string) {
  showToast('success', content)
}

export function warningMsg(content: string) {
  showToast('warning', content)
}

export function errorMsg(content: string) {
  showToast('error', content)
}

export function infoMsg(content: string) {
  showToast('info', content)
}
