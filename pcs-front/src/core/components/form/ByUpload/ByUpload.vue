<template>
  <div
    class="by-upload"
    :class="{
      'by-upload--disabled': disabled,
      'by-upload--file-list': listType === 'fileList',
    }"
  >
    <a-upload
      ref="uploadRef"
      :file-list="fileList"
      :accept="accept"
      :disabled="disabled"
      :draggable="showDragger"
      :auto-upload="false"
      :show-file-list="false"
      :on-before-upload="beforeUpload"
      class="by-upload__control"
      :class="{
        'by-upload__control--button': mode === 'button' && listType === 'fileList',
        'by-upload__control--hidden': listType === 'imageGrid' && mode === 'button',
      }"
      @update:file-list="handleUpdateFileList"
    >
      <template v-if="listType === 'fileList' && mode === 'button'" #upload-button>
        <a-button type="secondary" long :disabled="disabled" class="by-upload__btn">
          <template #icon><icon-upload :size="16" /></template>
          {{ UPLOAD_TEXT.button }}
        </a-button>
      </template>

      <template v-else-if="showDragger" #upload-button>
        <div
          class="by-upload__dragger-wrap"
          :class="{ 'by-upload__dragger-wrap--disabled': disabled }"
        >
          <div
            class="by-upload__dragger"
            :class="{
              'by-upload__dragger--active': isDragging && !disabled,
              'by-upload__dragger--disabled': disabled,
            }"
            @dragenter.prevent="onDragEnter"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <icon-cloud class="by-upload__dragger-icon" :size="24" />
            <p class="by-upload__dragger-text">
              <template v-if="isDragging && !disabled">{{ UPLOAD_TEXT.draggerDrop }}</template>
              <template v-else>
                <span class="by-upload__dragger-em">{{ UPLOAD_TEXT.draggerClick }}</span>
                {{ UPLOAD_TEXT.draggerRest }}
              </template>
            </p>
            <p class="by-upload__dragger-tip">{{ draggerTip }}</p>
          </div>
          <!-- 禁用遮罩：确保整区悬停均为 not-allowed，不被 Arco 触发器光标覆盖 -->
          <div
            v-if="disabled"
            class="by-upload__dragger-mask"
            aria-hidden="true"
          />
        </div>
      </template>
    </a-upload>

    <ByUploadFileList
      v-if="listType === 'fileList'"
      class="by-upload__list"
      :file-list="fileList"
      @remove="removeFile"
      @retry="retryFile"
      @cancel="removeFile"
    />

    <ByUploadImageGrid
      v-if="listType === 'imageGrid'"
      class="by-upload__grid"
      :file-list="fileList"
      :max-count="maxCount"
      :disabled="disabled"
      @add="triggerFileSelect"
      @remove="removeFile"
      @retry="retryFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { FileItem } from '@arco-design/web-vue'
import { errorMsg } from '@core/components/feedback/message'
import { confirmAction } from '@core/components/feedback/confirm'
import { UPLOAD_TEXT } from './uploadText'
import ByUploadFileList from './ByUploadFileList.vue'
import ByUploadImageGrid from './ByUploadImageGrid.vue'

export interface UploadResult {
  url: string
  [key: string]: unknown
}

export type UploadHandler = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<UploadResult>

interface Props {
  mode?: 'button' | 'dragger'
  listType?: 'fileList' | 'imageGrid'
  accept?: string
  maxSize?: number
  maxCount?: number
  fileList: FileItem[]
  uploadHandler?: UploadHandler
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'button',
  listType: 'fileList',
  maxSize: 10,
  maxCount: 999,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:fileList', v: FileItem[]): void
  (e: 'success', item: FileItem, response: UploadResult): void
  (e: 'error', item: FileItem, error: Error): void
  (e: 'remove', item: FileItem): void
}>()

const uploadRef = ref<{ $el?: HTMLElement } | null>(null)
const uploadedUids = new Set<string>()

const showDragger = computed(
  () => props.mode === 'dragger' && (props.listType === 'fileList' || props.listType === 'imageGrid'),
)

const acceptLabel = computed(() => {
  if (!props.accept) return UPLOAD_TEXT.acceptAny
  return props.accept
    .split(',')
    .map((s) => s.trim().replace(/^\./, '').toUpperCase())
    .join(' / ')
})

const draggerTip = computed(() =>
  UPLOAD_TEXT.draggerHelp(acceptLabel.value, props.maxSize),
)

function patchItem(uid: string, patch: Partial<FileItem>) {
  emit(
    'update:fileList',
    props.fileList.map((f) => (f.uid === uid ? { ...f, ...patch } : f)),
  )
}

async function uploadFile(item: FileItem) {
  if (!props.uploadHandler || !item.file) return
  uploadedUids.add(item.uid)
  patchItem(item.uid, { status: 'uploading', percent: 0 })
  try {
    const response = await props.uploadHandler(item.file, (p) => {
      patchItem(item.uid, { percent: p })
    })
    const patch: Partial<FileItem> = {
      status: 'done',
      percent: 100,
      url: response.url,
      response,
    }
    patchItem(item.uid, patch)
    emit('success', { ...item, ...patch }, response)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    const patch: Partial<FileItem> = {
      status: 'error',
      response: error.message,
    }
    patchItem(item.uid, patch)
    emit('error', { ...item, ...patch }, error)
  }
}

function beforeUpload(file: File): boolean {
  if (props.accept) {
    const acceptList = props.accept.split(',').map((s) => s.trim())
    const matched = acceptList.some((pattern) => {
      if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase())
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1))
      return file.type === pattern
    })
    if (!matched) {
      errorMsg(UPLOAD_TEXT.typeError(props.accept))
      return false
    }
  }
  if (file.size / 1024 / 1024 > props.maxSize) {
    errorMsg(UPLOAD_TEXT.sizeError(props.maxSize))
    return false
  }
  if (props.fileList.length >= props.maxCount) {
    errorMsg(UPLOAD_TEXT.countError(props.maxCount))
    return false
  }
  return true
}

async function removeFile(item: FileItem) {
  if (item.status === 'done') {
    const ok = await confirmAction({
      title: UPLOAD_TEXT.deleteTitle,
      content: UPLOAD_TEXT.deleteConfirm(item.name ?? ''),
      danger: true,
    })
    if (!ok) return
  }
  uploadedUids.delete(item.uid)
  emit('remove', item)
  emit(
    'update:fileList',
    props.fileList.filter((f) => f.uid !== item.uid),
  )
}

function retryFile(item: FileItem) {
  if (props.uploadHandler && item.file) {
    uploadedUids.delete(item.uid)
    uploadFile(item)
    return
  }
  patchItem(item.uid, { status: 'init' })
}

function handleUpdateFileList(list: FileItem[]) {
  emit('update:fileList', list)
  if (!props.uploadHandler) return
  nextTick(() => {
    for (const item of list) {
      if (
        item.file &&
        !uploadedUids.has(item.uid) &&
        item.status !== 'done' &&
        item.status !== 'error'
      ) {
        uploadFile(item)
      }
    }
  })
}

function triggerFileSelect() {
  const root = uploadRef.value?.$el
  const input = root?.querySelector?.('input[type="file"]') as HTMLInputElement | null
  input?.click()
}

const isDragging = ref(false)
let dragEnterCount = 0

function onDragEnter() {
  if (props.disabled) return
  dragEnterCount += 1
  isDragging.value = true
}

function onDragLeave() {
  dragEnterCount -= 1
  if (dragEnterCount <= 0) {
    dragEnterCount = 0
    isDragging.value = false
  }
}

function onDrop() {
  dragEnterCount = 0
  isDragging.value = false
}
import { Button as AButton, Upload as AUpload } from '@arco-design/web-vue'
import { IconCloud, IconUpload } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.by-upload--file-list {
  max-width: 560px;
}

.by-upload__control--button,
.by-upload__control--button :deep(.arco-upload),
.by-upload__control--button :deep(.arco-upload-trigger) {
  display: block;
  width: 100%;
}

.by-upload__control--hidden {
  position: absolute;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;

  overflow: hidden;
  pointer-events: none;
}

.by-upload__btn {
  justify-content: flex-start;
  width: 100%;
  height: 32px;
}

.by-upload__control :deep(.arco-upload-draggable),
.by-upload__control :deep(.arco-upload-draggable > span) {
  display: block;
  width: 100%;
}

.by-upload__dragger-wrap {
  position: relative;
  width: 100%;
}

.by-upload__dragger-wrap--disabled {
  cursor: not-allowed;
}

.by-upload__dragger-mask {
  position: absolute;
  inset: 0;
  z-index: var(--z-base);

  cursor: not-allowed;
}

.by-upload__dragger {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-lg);

  /* --color-border 会被 Arco body 覆盖为 #E5E6EB，禁用/默认描边用 bg-active=#DDDDDD */
  border: 1px dashed var(--color-bg-active);
  border-radius: var(--border-radius-default);

  text-align: center;

  background-color: var(--color-bg-card);

  cursor: pointer;
  transition:
    color var(--duration-state) var(--ease-state),
    border-color var(--duration-state) var(--ease-state),
    background-color var(--duration-state) var(--ease-state);
}

.by-upload__dragger-icon {
  color: var(--color-text-secondary);

  transition: color var(--duration-state) var(--ease-state);
}

.by-upload__dragger-text {
  margin: 0;

  font-size: var(--font-size-base);
  color: var(--color-text-body);
}

.by-upload__dragger-em {
  color: var(--color-primary);
}

.by-upload__dragger-tip {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.by-upload__dragger:hover:not(.by-upload__dragger--disabled) {
  border-color: var(--color-primary);
}

.by-upload__dragger--active {
  border-color: var(--color-primary);

  background-color: var(--color-primary-50);
}

.by-upload__dragger--active .by-upload__dragger-icon {
  color: var(--color-primary);
}

.by-upload__dragger--active .by-upload__dragger-text {
  color: var(--color-primary-hover);
}

.by-upload__dragger--disabled {
  border-color: var(--color-bg-active);

  background-color: var(--color-bg-page);

  cursor: not-allowed;
}

.by-upload__dragger--disabled .by-upload__dragger-icon {
  color: var(--color-text-placeholder);
}

.by-upload__dragger:hover:not(.by-upload__dragger--disabled) .by-upload__dragger-icon {
  color: var(--color-primary);
}

.by-upload__dragger--disabled .by-upload__dragger-text,
.by-upload__dragger--disabled .by-upload__dragger-tip,
.by-upload__dragger--disabled .by-upload__dragger-em {
  color: var(--color-text-secondary);
}

/* 禁用态：Arco 外层同步禁止光标 */
.by-upload--disabled,
.by-upload--disabled .by-upload__control,
.by-upload--disabled .by-upload__control :deep(.arco-upload-draggable),
.by-upload--disabled .by-upload__control :deep(.arco-upload-draggable > span) {
  cursor: not-allowed !important;
}

.by-upload__list {
  margin-top: var(--spacing-md);
}

.by-upload__grid {
  margin-top: var(--spacing-md);
}
</style>
