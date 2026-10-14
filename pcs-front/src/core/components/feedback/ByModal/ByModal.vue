<template>
  <a-modal
    :visible="visible"
    :width="resolvedWidth"
    :align-center="!isSheetMobile"
    title-align="start"
    :mask-closable="effectiveMaskClosable"
    :esc-to-close="!confirmLoading"
    :closable="false"
    :unmount-on-close="true"
    class="by-modal"
    :class="{
      'by-modal--fullscreen': isFullscreenMobile,
      'by-modal--sheet': isSheetMobile,
      [`by-modal--${mode}`]: true,
    }"
    @update:visible="handleUpdateVisible"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="by-modal__header">
        <span class="by-modal__title">{{ title }}</span>
        <button
          v-if="!confirmLoading"
          class="by-modal__close"
          type="button"
          aria-label="关闭"
          @click="handleCancel"
        >
          <IconClose :size="16" />
        </button>
      </div>
    </template>

    <div class="by-modal__body">
      <slot />
    </div>

    <template #footer>
      <div class="by-modal__footer">
        <a-button :disabled="confirmLoading" @click="handleCancel">
          {{ resolvedCancelText }}
        </a-button>
        <a-button
          type="primary"
          :status="danger ? 'danger' : undefined"
          :loading="confirmLoading"
          @click="handleConfirm"
        >
          {{ resolvedOkText }}
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconClose } from '@arco-design/web-vue/es/icon/index.js'
import { useDevice } from '@core/composables/useDevice'

export type ModalMode = 'confirm' | 'form-single' | 'form-double'
export type ModalSize = 'default' | 'large'

interface Props {
  visible: boolean
  title?: string
  mode?: ModalMode
  /** 弹窗宽度：default=480 / large=640；手机端 default 为底部 Sheet，large 全屏 */
  size?: ModalSize
  /** 危险操作：确认按钮用 Danger 色（删除 / 停用等）*/
  danger?: boolean
  /** 提交中：确认按钮 loading；遮罩/ESC/关闭按钮均不可关弹窗（状态规范 loading）*/
  confirmLoading?: boolean
  maskClosable?: boolean
  okText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'confirm',
  danger: false,
  confirmLoading: false,
  /** 规范：确认类遮罩默认不关闭，避免误触 */
  maskClosable: false,
})

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { device } = useDevice()

const SIZE_WIDTH: Record<ModalSize, number> = {
  default: 480,
  large: 640,
}

const resolvedSize = computed<ModalSize>(() => {
  if (props.size) return props.size
  return props.mode === 'form-double' ? 'large' : 'default'
})

const resolvedWidth = computed(() => {
  if (device.value === 'mobile') return '100%'
  // 规范 §5.10：默认 480 / 大弹窗 640
  return SIZE_WIDTH[resolvedSize.value]
})

const isSheetMobile = computed(() =>
  device.value === 'mobile' && resolvedSize.value === 'default',
)

const isFullscreenMobile = computed(() =>
  device.value === 'mobile' && resolvedSize.value === 'large',
)

const effectiveMaskClosable = computed(() =>
  props.confirmLoading ? false : props.maskClosable,
)

const resolvedCancelText = computed(() => props.cancelText ?? '取消')

const resolvedOkText = computed(() => {
  if (props.okText) return props.okText
  if (props.mode === 'confirm') {
    return props.danger ? '确认删除' : '确认'
  }
  return '保存'
})

function handleCancel() {
  if (props.confirmLoading) return
  emit('cancel')
  emit('update:visible', false)
}

function handleConfirm() {
  emit('confirm')
}

function handleUpdateVisible(v: boolean) {
  if (props.confirmLoading && !v) return
  emit('update:visible', v)
}
import { Button as AButton, Modal as AModal } from '@arco-design/web-vue'
</script>

<style scoped>
.by-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: var(--spacing-sm);
}

.by-modal__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;

  color: var(--color-text-title);
  font-size: var(--font-size-h2); /* 16px */
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-h2);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 24×24 点击区包裹 16×16 关闭图标（与 ByDrawer 一致） */
.by-modal__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;

  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-default);

  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
}

.by-modal__close:hover {
  color: var(--color-text-title);
  background: var(--color-bg-surface);
}

.by-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm); /* 8px */
}

/* footer 内按钮由业务方经 slot 渲染（带业务 scopeId），须 :deep 命中 */
.by-modal__footer :deep(.arco-btn) {
  min-width: 80px;
}
</style>
