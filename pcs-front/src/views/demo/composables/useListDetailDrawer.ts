import { computed, ref } from 'vue'
import { successMsg } from '@core/components'
import { useDetail } from '@core/composables'
import {
  getDrawerDetail,
  type WaybillListItem,
  type WaybillDrawerDetail,
  type WaybillDrawerWarning,
} from '@/api/demo'

interface UseListDetailDrawerOptions {
  /** 抽屉"编辑"按钮回调，由视图层注入（router.push 跳表单页）。 */
  onEdit?: (id: string) => void
}

/**
 * 列表页详情抽屉状态机：打开懒加载 detail、关闭清态、预警处理、编辑回调注入。
 * onEdit 走视图层注入，避免 composable 依赖 useRouter。
 * visible 独立于 detail/loading：关闭后即使请求返回也不会自动重开抽屉。
 */
export function useListDetailDrawer(options: UseListDetailDrawerOptions = {}) {
  const { detail, loading, load, clear } = useDetail<WaybillDrawerDetail>({
    fetchFn: getDrawerDetail,
  })

  const visible = ref(false)

  const drawerVisible = computed({
    get: () => visible.value && (detail.value !== null || loading.value),
    set: (v) => {
      visible.value = v
      if (!v) clear()
    },
  })

  const drawerTitle = computed(() =>
    detail.value ? `运单详情：${detail.value.waybillNo}` : '运单详情',
  )

  function open(record: WaybillListItem) {
    visible.value = true
    load(record.id)
  }

  function close() {
    visible.value = false
    clear()
  }

  function handleWarningAction(warning: WaybillDrawerWarning) {
    successMsg(`已处理预警：${warning.message}`)
  }

  function handleEdit() {
    if (!detail.value) return
    options.onEdit?.(detail.value.id)
    clear()
  }

  return {
    drawerVisible,
    drawerTitle,
    detail,
    detailLoading: loading,
    open,
    close,
    handleWarningAction,
    handleEdit,
  }
}
