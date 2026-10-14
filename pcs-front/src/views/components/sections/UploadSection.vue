<template>
  <section class="section">
    <h2 class="section__title">⑥ 上传 Upload</h2>

    <ByCard title="按钮形态 + 文件列表（三态）" class="section__card">
      <ByUpload
        v-model:file-list="buttonFiles"
        mode="button"
        list-type="fileList"
        accept=".pdf,.xlsx,.zip"
        :max-size="10"
        :max-count="5"
        :upload-handler="mockUploadHandler"
      />
      <p class="section__hint">
        文件列表项三态：上传中（进度条）/ 成功（绿色对勾）/ 失败（红色叉 + 错误原因 + 重试）。
      </p>
    </ByCard>

    <ByCard title="拖拽形态（Dragger）" class="section__card">
      <ByUpload
        v-model:file-list="draggerFiles"
        mode="dragger"
        list-type="fileList"
        accept=".pdf,.xlsx,.zip"
        :max-size="10"
        :max-count="5"
        :upload-handler="mockUploadHandler"
      />
    </ByCard>

    <ByCard title="图片网格形态" class="section__card">
      <ByUpload
        v-model:file-list="imageFiles"
        mode="dragger"
        list-type="imageGrid"
        accept="image/*"
        :max-size="5"
        :max-count="6"
        :upload-handler="mockUploadHandler"
      />
    </ByCard>

    <a-alert type="warning" show-icon
      >显式提交（非选中即传）；类型与大小上限必须提前说明；上传中可取消，失败可重试；删除已提交附件需二次确认。</a-alert
    >

    <PropsDoc :groups="UPLOAD_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileItem } from '@arco-design/web-vue'
import { ByCard, ByUpload } from '@core/components'
import type { UploadHandler, UploadResult } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { UPLOAD_PROP_GROUPS } from '../propDoc'

// 演示用 mock 上传处理器：模拟进度推进 + 300ms 间隔，让示例页可完整体验上传中/成功/失败三态
const mockUploadHandler: UploadHandler = (file: File, onProgress) => {
  return new Promise<UploadResult>((resolve, reject) => {
    let percent = 0
    const timer = setInterval(() => {
      percent += 20
      onProgress(Math.min(percent, 100))
      if (percent >= 100) {
        clearInterval(timer)
        // 演示失败场景：文件名含"失败"时返回 reject
        if (file.name.includes('失败')) {
          reject(new Error('网络异常，请重试'))
        } else {
          resolve({ url: URL.createObjectURL(file) })
        }
      }
    }, 300)
  })
}

// demo 占位缩略图：data URI SVG 内联，避免依赖外部不可达 URL（原 example.com 导致 <img> 加载失败）。
// <img> 加载 SVG 时无法解析 CSS 变量，颜色只能硬编码；色值取自项目主色系（#EAF2FF / #046EFC / #4B5564）。
function cargoThumb(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#EAF2FF"/><g fill="none" stroke="#046EFC" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><path d="M22 30 L40 21 L58 30 L58 52 L40 61 L22 52 Z"/><path d="M22 30 L40 39 L58 30"/><path d="M40 39 L40 61"/></g><text x="40" y="74" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#4B5564">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const buttonFiles = ref<FileItem[]>([
  {
    uid: 'uploading-1',
    name: '运单面单.pdf',
    status: 'uploading',
    percent: 60,
  },
  {
    uid: 'done-1',
    name: '报关单.xlsx',
    status: 'done',
    url: '/local-samples/declaration.xlsx',
  },
  {
    uid: 'error-1',
    name: '异常凭证.zip',
    status: 'error',
    response: '网络异常，请重试',
  },
])

const draggerFiles = ref<FileItem[]>([
  {
    uid: 'done-2',
    name: '批量面单.pdf',
    status: 'done',
    url: '/local-samples/batch.pdf',
  },
])

const imageFiles = ref<FileItem[]>([
  {
    uid: 'img-1',
    name: '货物照片 1.jpg',
    status: 'done',
    url: cargoThumb('货物 1'),
  },
  {
    uid: 'img-2',
    name: '货物照片 2.jpg',
    status: 'done',
    url: cargoThumb('货物 2'),
  },
])

const code = `<!-- 按钮形态 + 文件列表 -->
<ByUpload
  v-model:file-list="files"
  mode="button"
  list-type="fileList"
  accept=".pdf,.xlsx,.zip"
  :max-size="10"
  :max-count="5"
/>

<!-- 拖拽形态 -->
<ByUpload
  v-model:file-list="files"
  mode="dragger"
  list-type="fileList"
  accept=".pdf,.xlsx"
  :max-size="10"
/>

<!-- 图片网格 -->
<ByUpload
  v-model:file-list="images"
  mode="dragger"
  list-type="imageGrid"
  accept="image/*"
  :max-size="5"
  :max-count="6"
/>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.section__hint {
  margin: var(--spacing-sm) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
