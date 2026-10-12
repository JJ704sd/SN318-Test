import { ref } from 'vue'
import type { FileItem } from '@arco-design/web-vue'
import { successMsg, errorMsg } from '@baiyun/template-core/components'

/** 导入弹窗状态机：选文件 → 确认 → 刷新列表。onDone 由数据拥有方注入（通常是列表 fetch）。 */
export function useImport(onDone: () => Promise<void> | void) {
  const visible = ref(false)
  const loading = ref(false)
  const fileList = ref<FileItem[]>([])

  function cancel() {
    fileList.value = []
  }

  async function confirm() {
    if (fileList.value.length === 0) {
      errorMsg('请选择文件')
      return
    }
    loading.value = true
    try {
      await onDone()
      successMsg('导入成功')
      visible.value = false
      fileList.value = []
    } finally {
      loading.value = false
    }
  }

  return { visible, loading, fileList, cancel, confirm }
}
