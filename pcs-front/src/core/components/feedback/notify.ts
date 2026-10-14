/**
 * 命令式通知框统一出口（实施方案任务 2.13 / 规范 §05 消息提示）
 *
 * 白底卡片 + shadow-md，无语义底色/描边；主色圆底白符号图标；
 * 标题 + 正文 + 可选操作；右上角滑入，约 4.5 秒或手动关闭。
 * 一句话反馈走 message.ts；页面级内联提示走 a-alert。
 */
import { Notification, Button } from '@arco-design/web-vue'
import {
  IconCheck,
  IconClose,
  IconExclamation,
  IconInfo,
} from '@arco-design/web-vue/es/icon/index.js'
import { h, type Component } from 'vue'

export type NotifyType = 'success' | 'warning' | 'error' | 'info'

export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface NotifyOptions {
  type: NotifyType
  title: string
  content: string
  actions?: NotifyAction[]
  duration?: number
}

const DEFAULT_DURATION = 4500

const NOTIFY_ICON: Record<NotifyType, Component> = {
  success: IconCheck,
  warning: IconExclamation,
  error: IconClose,
  info: IconInfo,
}

function renderNotifyIcon(type: NotifyType) {
  return () =>
    h('span', { class: ['by-notify-icon', `by-notify-icon--${type}`] }, [
      h(NOTIFY_ICON[type]),
    ])
}

export function notify(options: NotifyOptions) {
  const { type, title, content, actions, duration = DEFAULT_DURATION } = options

  Notification[type]({
    title,
    content,
    duration,
    closable: true,
    position: 'topRight',
    icon: renderNotifyIcon(type),
    footer: actions?.length
      ? () =>
          h(
            'div',
            { class: 'by-notify__actions' },
            actions.map((action, index) =>
              h(
                Button,
                {
                  size: 'small',
                  type: index === 0 ? 'primary' : 'secondary',
                  onClick: action.onClick,
                },
                { default: () => action.label },
              ),
            ),
          )
      : undefined,
  })
}
