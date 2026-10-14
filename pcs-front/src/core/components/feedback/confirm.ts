/**
 * 命令式二次确认统一出口（实施方案任务 2.13 / 规范 §05 消息提示、§08 文案）
 *
 * 结构：左侧语义色 icon（普通=info 蓝 / 危险=error 红）+ 右侧标题 + 下方说明文字。
 * footer 取消在左、确认在右（Arco Modal.open 默认布局）。
 *
 * ⚠️ Arco ModalConfig 无独立 icon 字段，故把 icon + 标题 + 说明文字整体作为
 *   content 渲染函数传入，hideTitle 关闭 Arco 自带标题栏，避免标题重复。
 */
import { Modal } from '@arco-design/web-vue'
import { IconExclamationCircleFill, IconInfoCircleFill } from '@arco-design/web-vue/es/icon/index.js'
import { h } from 'vue'

export interface ConfirmOptions {
  title: string
  content: string
  danger?: boolean
  okText?: string
  cancelText?: string
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const { title, content, danger = false, okText, cancelText } = options

  return new Promise((resolve) => {
    Modal.open({
      hideTitle: true,
      content: () =>
        h('div', { style: { display: 'flex', gap: '12px' } }, [
          h(danger ? IconExclamationCircleFill : IconInfoCircleFill, {
            style: {
              flexShrink: 0,
              fontSize: '24px',
              color: danger ? 'var(--color-error)' : 'var(--color-info)',
            },
          }),
          h('div', {}, [
            h(
              'div',
              {
                style: {
                  fontSize: 'var(--font-size-h3)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-title)',
                },
              },
              title,
            ),
            h(
              'div',
              {
                style: {
                  marginTop: '4px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-body)',
                },
              },
              content,
            ),
          ]),
        ]),
      okText: okText ?? (danger ? '确认删除' : '确认'),
      cancelText: cancelText ?? '取消',
      okButtonProps: danger ? { status: 'danger' } : undefined,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}
