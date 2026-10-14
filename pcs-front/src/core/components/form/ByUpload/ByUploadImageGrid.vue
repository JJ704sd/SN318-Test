<template>
  <div class="by-upload-image-grid">
    <div
      v-for="item in fileList"
      :key="item.uid"
      class="by-upload-image-grid__thumb"
      :class="{
        'by-upload-image-grid__thumb--done': item.status === 'done',
        'by-upload-image-grid__thumb--uploading': item.status === 'uploading',
        'by-upload-image-grid__thumb--error': item.status === 'error',
      }"
      @click="onThumbClick(item, $event)"
    >
      <template v-if="item.status === 'error'">
        <div class="by-upload-image-grid__err-veil">
          <icon-image-close :size="24" />
          <span class="by-upload-image-grid__err-title">{{ UPLOAD_TEXT.uploadFailTitle }}</span>
          <span class="by-upload-image-grid__err-retry">{{ UPLOAD_TEXT.uploadFailRetry }}</span>
        </div>
      </template>

      <template v-else>
        <img
          v-if="uploadThumbSrc(item)"
          class="by-upload-image-grid__photo"
          :src="uploadThumbSrc(item)"
          :alt="item.name"
        />
        <div v-else class="by-upload-image-grid__photo by-upload-image-grid__photo--empty" />

        <div v-if="item.status === 'uploading'" class="by-upload-image-grid__up-veil">
          <span class="by-upload-image-grid__pct">{{ clampUploadPercent(item.percent) }}%</span>
          <span class="by-upload-image-grid__mini-track">
            <span
              class="by-upload-image-grid__mini-fill"
              :style="{ width: `${clampUploadPercent(item.percent)}%` }"
            />
          </span>
        </div>

        <template v-else-if="item.status === 'done'">
          <div class="by-upload-image-grid__overlay">
            <button
              type="button"
              class="by-upload-image-grid__ov-btn"
              data-act="preview"
              :aria-label="UPLOAD_TEXT.preview"
              @click.stop="openPreview(item)"
            >
              <icon-eye :size="15" />
            </button>
            <button
              type="button"
              class="by-upload-image-grid__ov-btn"
              data-act="delete"
              :aria-label="BUTTON_TEXT.delete"
              @click.stop="emit('remove', item)"
            >
              <icon-delete :size="15" />
            </button>
          </div>
          <div class="by-upload-image-grid__fn">{{ item.name }}</div>
        </template>
      </template>
    </div>

    <button
      v-if="showAdd"
      type="button"
      class="by-upload-image-grid__thumb by-upload-image-grid__thumb--add"
      :disabled="disabled"
      @click="emit('add')"
    >
      <icon-plus :size="20" />
      <span class="by-upload-image-grid__add-text">{{ UPLOAD_TEXT.addThumb }}</span>
    </button>

    <a-image-preview v-model:visible="previewVisible" :src="previewSrc" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileItem } from '@arco-design/web-vue'
import { BUTTON_TEXT, UPLOAD_TEXT } from './uploadText'
import { clampUploadPercent, uploadThumbSrc } from './byUploadHelpers'

interface Props {
  fileList?: FileItem[]
  maxCount?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fileList: () => [],
  maxCount: 999,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', item: FileItem): void
  (e: 'retry', item: FileItem): void
}>()

const previewVisible = ref(false)
const previewSrc = ref('')

const showAdd = computed(
  () => !props.disabled && props.fileList.length < props.maxCount,
)

function openPreview(item: FileItem) {
  const src = uploadThumbSrc(item)
  if (!src) return
  previewSrc.value = src
  previewVisible.value = true
}

function onThumbClick(item: FileItem, e: MouseEvent) {
  if (item.status === 'error') {
    emit('retry', item)
    return
  }
  if (item.status !== 'done') return
  const act = (e.target as HTMLElement | null)?.closest?.('[data-act]')
  if (act?.getAttribute('data-act') === 'delete') return
  openPreview(item)
}
import { ImagePreview as AImagePreview } from '@arco-design/web-vue'
import {
  IconDelete,
  IconEye,
  IconImageClose,
  IconPlus,
} from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.by-upload-image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.by-upload-image-grid__thumb {
  position: relative;
  flex: none;
  width: 80px;
  height: 80px;
  border-radius: var(--border-radius-default);
  background: var(--color-bg-surface);
  overflow: hidden;
}

.by-upload-image-grid__thumb--done { cursor: pointer; }

.by-upload-image-grid__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.by-upload-image-grid__photo--empty { background: var(--color-bg-surface); }

.by-upload-image-grid__thumb--uploading .by-upload-image-grid__photo {
  filter: brightness(0.5);
}

.by-upload-image-grid__fn {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: var(--spacing-sm) 6px var(--spacing-xs);
  font-size: var(--font-size-tag-sm);
  color: var(--color-text-on-overlay);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  background: linear-gradient(to top, rgb(0 0 0 / 55%), transparent);
}

.by-upload-image-grid__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity var(--duration-state) var(--ease-state);
}

.by-upload-image-grid__thumb--done:hover .by-upload-image-grid__overlay {
  opacity: 1;
}

.by-upload-image-grid__ov-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius-select-option);
  background: rgb(255 255 255 / 16%);
  color: var(--color-text-on-overlay);
  cursor: pointer;
}

.by-upload-image-grid__up-veil {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--color-text-on-overlay);
}

.by-upload-image-grid__pct {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.by-upload-image-grid__mini-track {
  width: 52px;
  height: 4px;
  border-radius: 999px;
  background: rgb(255 255 255 / 30%);
  overflow: hidden;
}

.by-upload-image-grid__mini-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-text-on-overlay);
}

.by-upload-image-grid__thumb--error {
  background: var(--color-error-bg);
  cursor: pointer;
}

.by-upload-image-grid__err-veil {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: var(--color-error);
  text-align: center;
}

.by-upload-image-grid__err-title,
.by-upload-image-grid__err-retry {
  font-size: var(--font-size-tag-sm);
  line-height: 1.3;
}

.by-upload-image-grid__thumb--add {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-bg-active);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color var(--duration-state) var(--ease-state),
    border-color var(--duration-state) var(--ease-state);
}

.by-upload-image-grid__thumb--add:disabled { cursor: not-allowed; }
.by-upload-image-grid__add-text { font-size: var(--font-size-tag-sm); }

.by-upload-image-grid__thumb--add:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
