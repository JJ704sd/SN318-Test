import type { Component } from 'vue'
import type { FileItem } from '@arco-design/web-vue'
import {
  IconFile,
  IconFileImage,
  IconFilePdf,
} from '@arco-design/web-vue/es/icon/index.js'
import { UPLOAD_TEXT } from './uploadText'

export function clampUploadPercent(percent?: number): number {
  if (percent == null || Number.isNaN(percent)) return 0
  return Math.min(100, Math.max(0, Math.round(percent)))
}

export function formatUploadSize(item: FileItem): string {
  const size = item.file?.size
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function uploadErrorText(item: FileItem): string {
  const detail = item.response
  return typeof detail === 'string' && detail ? detail : UPLOAD_TEXT.failDefault
}

export function uploadFileTypeIcon(name: string): Component {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return IconFilePdf
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return IconFileImage
  return IconFile
}

export function uploadThumbSrc(item: FileItem): string {
  if (item.url && item.url !== '#') return item.url
  return ''
}
