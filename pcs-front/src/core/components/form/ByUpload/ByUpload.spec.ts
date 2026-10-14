import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import {
  Upload as AUpload,
  Button as AButton,
  ImagePreview as AImagePreview,
} from '@arco-design/web-vue'
import type { FileItem } from '@arco-design/web-vue'
import ByUpload from './ByUpload.vue'
import { BUTTON_TEXT, UPLOAD_TEXT } from './uploadText'

const globalComponents = { AUpload, AButton, AImagePreview }

vi.mock('@core/components/feedback/confirm', () => ({
  confirmAction: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}))
vi.mock('@core/components/feedback/message', () => ({
  errorMsg: vi.fn<() => void>(),
}))

describe('ByUpload', () => {
  it('auto-upload 关闭', () => {
    const wrapper = mount(ByUpload, {
      props: { fileList: [] },
      global: { components: globalComponents },
    })
    expect(wrapper.findComponent(AUpload).props('autoUpload')).toBe(false)
  })

  it('超限文件不入列表且触发 errorMsg', async () => {
    const { errorMsg } = await import('@core/components/feedback/message')
    const wrapper = mount(ByUpload, {
      props: { fileList: [], maxSize: 1 },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    const bigFile = new File(['x'.repeat(2 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    const result = beforeUpload(bigFile)
    expect(result).toBe(false)
    expect(errorMsg).toHaveBeenCalled()
  })

  it('失败项显示重试按钮', () => {
    const fileList: FileItem[] = [{ uid: '1', name: 'a.pdf', status: 'error' }]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'fileList' },
      global: { components: globalComponents },
    })
    expect(wrapper.find('[aria-label="' + UPLOAD_TEXT.retry + '"]').exists()).toBe(true)
  })

  it('删除成功文件走二次确认', async () => {
    const { confirmAction } = await import('@core/components/feedback/confirm')
    const fileList: FileItem[] = [{ uid: '1', name: 'a.pdf', status: 'done' }]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'fileList' },
      global: { components: globalComponents },
    })
    await wrapper.find('.by-upload-file-list__icon-btn--danger').trigger('click')
    expect(confirmAction).toHaveBeenCalled()
  })

  it('图片网格渲染缩略图与新增入口', () => {
    const fileList: FileItem[] = [
      { uid: '1', name: 'a.png', status: 'done', url: '/a.png' },
      { uid: '2', name: 'b.png', status: 'done', url: '/b.png' },
    ]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'imageGrid' },
      global: { components: globalComponents },
    })
    expect(wrapper.findAll('.by-upload-image-grid__thumb--done')).toHaveLength(2)
    expect(wrapper.find('.by-upload-image-grid__thumb--add').exists()).toBe(true)
  })

  it('图片网格删除已上传图片走二次确认', async () => {
    const { confirmAction } = await import('@core/components/feedback/confirm')
    vi.mocked(confirmAction).mockClear()
    const fileList: FileItem[] = [{ uid: '1', name: 'a.png', status: 'done', url: '/a.png' }]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'imageGrid' },
      global: { components: globalComponents },
    })
    await wrapper.find('[data-act="delete"]').trigger('click')
    expect(confirmAction).toHaveBeenCalled()
  })

  it('beforeUpload：accept 扩展名匹配通过则返回 true', () => {
    const wrapper = mount(ByUpload, {
      props: { fileList: [], accept: '.png,.jpg' },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    const f = new File(['x'], 'a.png', { type: 'image/png' })
    expect(beforeUpload(f)).toBe(true)
  })

  it('beforeUpload：accept 通配符类型匹配', () => {
    const wrapper = mount(ByUpload, {
      props: { fileList: [], accept: 'image/*' },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    expect(beforeUpload(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true)
  })

  it('beforeUpload：accept 精确类型匹配', () => {
    const wrapper = mount(ByUpload, {
      props: { fileList: [], accept: 'application/pdf' },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    expect(beforeUpload(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(true)
  })

  it('beforeUpload：类型不匹配返回 false 且触发 errorMsg', async () => {
    const { errorMsg } = await import('@core/components/feedback/message')
    vi.mocked(errorMsg).mockClear()
    const wrapper = mount(ByUpload, {
      props: { fileList: [], accept: '.png' },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    expect(beforeUpload(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false)
    expect(errorMsg).toHaveBeenCalled()
  })

  it('beforeUpload：达到 maxCount 上限返回 false 且触发 errorMsg', async () => {
    const { errorMsg } = await import('@core/components/feedback/message')
    vi.mocked(errorMsg).mockClear()
    const existing: FileItem[] = [
      { uid: '1', name: 'a.png', status: 'done', url: '/a.png' },
    ]
    const wrapper = mount(ByUpload, {
      props: { fileList: existing, maxCount: 1 },
      global: { components: globalComponents },
    })
    const beforeUpload = wrapper.findComponent(AUpload).props('onBeforeUpload') as (
      f: File,
    ) => boolean
    expect(beforeUpload(new File(['x'], 'b.png', { type: 'image/png' }))).toBe(false)
    expect(errorMsg).toHaveBeenCalled()
  })

  it('删除非 done 文件不弹二次确认且 emit remove', async () => {
    const { confirmAction } = await import('@core/components/feedback/confirm')
    vi.mocked(confirmAction).mockClear()
    const fileList: FileItem[] = [{ uid: '1', name: 'a.pdf', status: 'init' }]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'fileList' },
      global: { components: globalComponents },
    })
    await wrapper.find('[aria-label="' + BUTTON_TEXT.delete + '"]').trigger('click')
    expect(confirmAction).not.toHaveBeenCalled()
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('update:fileList')).toBeTruthy()
  })

  it('删除 done 文件且二次确认取消时不 emit remove', async () => {
    const { confirmAction } = await import('@core/components/feedback/confirm')
    vi.mocked(confirmAction).mockResolvedValueOnce(false)
    const fileList: FileItem[] = [{ uid: '1', name: 'a.pdf', status: 'done' }]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'fileList' },
      global: { components: globalComponents },
    })
    await wrapper.find('[aria-label="' + BUTTON_TEXT.delete + '"]').trigger('click')
    expect(confirmAction).toHaveBeenCalled()
    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('隐藏态小图 add 入口：图片网格达到 maxCount 后不渲染新增按钮', () => {
    const fileList: FileItem[] = [
      { uid: '1', name: 'a.png', status: 'done', url: '/a.png' },
    ]
    const wrapper = mount(ByUpload, {
      props: { fileList, listType: 'imageGrid', maxCount: 1 },
      global: { components: globalComponents },
    })
    expect(wrapper.find('.by-upload-image-grid__thumb--add').exists()).toBe(false)
  })

  it('图片网格 disabled 时不渲染 add 入口', () => {
    const wrapper = mount(ByUpload, {
      props: { fileList: [], listType: 'imageGrid', disabled: true },
      global: { components: globalComponents },
    })
    expect(wrapper.find('.by-upload-image-grid__thumb--add').exists()).toBe(false)
  })

  it('上传流程：uploadHandler 触发上传成功并 emit success', async () => {
    const handler = vi
      .fn<(f: File, onProgress: (p: number) => void) => Promise<{ url: string }>>()
      .mockResolvedValue({ url: '/u.png' })
    const item: FileItem = {
      uid: '1',
      name: 'a.png',
      status: 'init',
      file: new File(['x'], 'a.png', { type: 'image/png' }),
    }
    const wrapper = mount(ByUpload, {
      props: { fileList: [item], listType: 'fileList', uploadHandler: handler },
      global: { components: globalComponents },
    })
    wrapper.findComponent(AUpload).vm.$emit('update:file-list', [item])
    await flushPromises()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('上传流程：uploadHandler reject 时 emit error', async () => {
    const handler = vi
      .fn<(f: File, onProgress: (p: number) => void) => Promise<{ url: string }>>()
      .mockRejectedValue(new Error('网络错误'))
    const item: FileItem = {
      uid: '2',
      name: 'b.png',
      status: 'init',
      file: new File(['x'], 'b.png', { type: 'image/png' }),
    }
    const wrapper = mount(ByUpload, {
      props: { fileList: [item], listType: 'fileList', uploadHandler: handler },
      global: { components: globalComponents },
    })
    wrapper.findComponent(AUpload).vm.$emit('update:file-list', [item])
    await flushPromises()
    expect(wrapper.emitted('error')).toBeTruthy()
  })
})
