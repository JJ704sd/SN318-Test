<template>
  <div v-if="fileList.length" class="by-upload-file-list">
    <div
      v-for="item in fileList"
      :key="item.uid"
      class="by-upload-file-list__item"
      :class="{
        'by-upload-file-list__item--uploading': item.status === 'uploading',
        'by-upload-file-list__item--error': item.status === 'error',
        'by-upload-file-list__item--has-reason': item.status === 'error' && !!uploadErrorText(item),
      }"
    >
      <component
        :is="uploadFileTypeIcon(item.name ?? '')"
        class="by-upload-file-list__ftype"
        :size="20"
      />

      <div class="by-upload-file-list__main">
        <span class="by-upload-file-list__name">{{ item.name }}</span>

        <div v-if="item.status === 'uploading'" class="by-upload-file-list__progress-row">
          <div class="by-upload-file-list__progress-track">
            <div
              class="by-upload-file-list__progress-fill"
              :style="{ width: `${clampUploadPercent(item.percent)}%` }"
            />
          </div>
          <span class="by-upload-file-list__progress-percent">
            {{ clampUploadPercent(item.percent) }}%
          </span>
        </div>

        <span
          v-else-if="item.status === 'done' && formatUploadSize(item)"
          class="by-upload-file-list__size"
        >
          {{ formatUploadSize(item) }}
        </span>

        <p v-else-if="item.status === 'error'" class="by-upload-file-list__reason">
          {{ uploadErrorText(item) }}
        </p>
      </div>

      <icon-check-circle-fill
        v-if="item.status === 'done'"
        class="by-upload-file-list__status by-upload-file-list__status--ok"
        :size="18"
      />
      <icon-exclamation-circle-fill
        v-else-if="item.status === 'error'"
        class="by-upload-file-list__status by-upload-file-list__status--err"
        :size="18"
      />

      <div class="by-upload-file-list__actions">
        <button
          v-if="item.status === 'uploading'"
          type="button"
          class="by-upload-file-list__icon-btn"
          :aria-label="UPLOAD_TEXT.cancelUpload"
          @click.stop="emit('cancel', item)"
        >
          <icon-close :size="16" />
        </button>
        <template v-else-if="item.status === 'error'">
          <button
            type="button"
            class="by-upload-file-list__icon-btn"
            :aria-label="UPLOAD_TEXT.retry"
            @click.stop="emit('retry', item)"
          >
            <icon-refresh :size="16" />
          </button>
          <button
            type="button"
            class="by-upload-file-list__icon-btn by-upload-file-list__icon-btn--danger"
            :aria-label="BUTTON_TEXT.delete"
            @click.stop="emit('remove', item)"
          >
            <icon-delete :size="16" />
          </button>
        </template>
        <button
          v-else
          type="button"
          class="by-upload-file-list__icon-btn by-upload-file-list__icon-btn--danger"
          :aria-label="BUTTON_TEXT.delete"
          @click.stop="emit('remove', item)"
        >
          <icon-delete :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from '@arco-design/web-vue'
import { BUTTON_TEXT, UPLOAD_TEXT } from './uploadText'
import {
  clampUploadPercent,
  formatUploadSize,
  uploadErrorText,
  uploadFileTypeIcon,
} from './byUploadHelpers'

interface Props {
  fileList?: FileItem[]
}

withDefaults(defineProps<Props>(), {
  fileList: () => [],
})

const emit = defineEmits<{
  (e: 'remove', item: FileItem): void
  (e: 'retry', item: FileItem): void
  (e: 'cancel', item: FileItem): void
}>()
import {
  IconCheckCircleFill,
  IconClose,
  IconDelete,
  IconExclamationCircleFill,
  IconRefresh,
} from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.by-upload-file-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.by-upload-file-list__item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
  column-gap: var(--spacing-sm);
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: var(--border-radius-default);
  background: var(--color-bg-surface);
}

.by-upload-file-list__item--has-reason {
  align-items: start;
  min-height: 72px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.by-upload-file-list__ftype {
  grid-column: 1;
  align-self: center;
  color: var(--color-text-secondary);
}

.by-upload-file-list__item--has-reason .by-upload-file-list__ftype {
  align-self: start;
  margin-top: 2px;
}

.by-upload-file-list__item--uploading .by-upload-file-list__ftype {
  align-self: start;
  margin-top: var(--spacing-sm);
}

.by-upload-file-list__main {
  display: flex;
  flex-direction: row;
  gap: var(--spacing-sm);
  align-items: center;
  grid-column: 2;
  min-width: 0;
  padding: var(--spacing-sm) 0;
}

.by-upload-file-list__item--uploading .by-upload-file-list__main,
.by-upload-file-list__item--has-reason .by-upload-file-list__main {
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
}

.by-upload-file-list__item--has-reason .by-upload-file-list__main {
  gap: var(--spacing-sm);
  padding: 0;
}

.by-upload-file-list__name {
  overflow: hidden;
  font-size: var(--font-size-base);
  color: var(--color-text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.by-upload-file-list__item--error .by-upload-file-list__name {
  color: var(--color-error);
}

.by-upload-file-list__size {
  flex: none;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.by-upload-file-list__progress-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.by-upload-file-list__progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--color-divider);
  overflow: hidden;
}

.by-upload-file-list__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.by-upload-file-list__progress-percent {
  flex: none;
  min-width: 34px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  text-align: right;
}

.by-upload-file-list__reason {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-error);
}

.by-upload-file-list__status {
  grid-column: 3;
  align-self: center;
  flex: none;
}

.by-upload-file-list__status--ok { color: var(--color-success); }
.by-upload-file-list__status--err { color: var(--color-error); }

.by-upload-file-list__actions {
  display: flex;
  flex: none;
  grid-column: 4;
  gap: var(--spacing-xs);
  align-items: center;
}

.by-upload-file-list__item--has-reason .by-upload-file-list__status,
.by-upload-file-list__item--has-reason .by-upload-file-list__actions {
  align-self: start;
}

.by-upload-file-list__item--uploading .by-upload-file-list__actions {
  align-self: start;
  margin-top: var(--spacing-sm);
}

/* 错误图标与右侧 28px 操作热区内的 16px 图标保持视觉中心线一致。 */
.by-upload-file-list__item--has-reason .by-upload-file-list__status {
  margin-top: 4px;
}

.by-upload-file-list__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--border-radius-select-option);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color var(--duration-state) var(--ease-state),
    background-color var(--duration-state) var(--ease-state);
}

.by-upload-file-list__icon-btn:hover {
  background: var(--color-divider);
  color: var(--color-text-title);
}

.by-upload-file-list__icon-btn--danger:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
}
</style>
