import { ref } from 'vue'
import type { WaybillListItem, WaybillStatus } from '@/api/demo'

/**
 * 单元格行内编辑（状态列）的 UI 状态机。
 * 只负责「哪一行在编辑 / 当前待提交值」，不触碰列表数据；
 * 值真正变化时通过 onCommit 把意图上抛给数据拥有方（视图 / composable）。
 */
export function useStatusEdit(onCommit: (id: string, status: WaybillStatus) => void) {
  const editingId = ref<string | null>(null)
  const editingStatus = ref<WaybillStatus>('pending')

  function startEditStatus(record: WaybillListItem) {
    editingId.value = record.id
    editingStatus.value = record.status
  }

  function stopEditStatus(record: WaybillListItem) {
    if (editingId.value !== record.id) return
    const next = editingStatus.value
    editingId.value = null
    if (next !== record.status) onCommit(record.id, next)
  }

  return { editingId, editingStatus, startEditStatus, stopEditStatus }
}
