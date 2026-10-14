import { onMounted, ref } from 'vue'

/**
 * 「每日首次」提示可见性控制（实施方案任务 4.9 / 规范 §11.2 悬浮入口气泡）。
 *
 * 用 localStorage 存【当日日期串 YYYY-MM-DD】而非布尔标志：
 *   - 布尔只能「一次性消失」，无法跨天重现；
 *   - 存日期串后，挂载时比对「存值 ≠ 今日」即显示，实现「每日首次、跨天自动重现」。
 * dismiss() 把存值写为今日并隐藏，当日内刷新/重进不再显示。
 *
 * localStorage 不可用（SSR / 隐私模式 / 配额满）时读写均 try/catch 降级：
 * 读不到就默认显示气泡，写失败静默——降级方向偏向「显示」，不因存储异常吞掉提示。
 */
export function useDailyTip(key: string) {
  const visible = ref(false)

  function today(): string {
    // 仅作「当日」持久键。不复用 utils/format 的 formatDate：跨域共享模块会在
    // build-lib 逐域 preserve 中被后置 pass 覆写为局部引用集，此处自持最简格式。
    const date = new Date()
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function readStored(): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function writeStored(value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 存储不可用：静默降级，仅影响「今日不再显示」的持久化
    }
  }

  /** 隐藏气泡并记为今日已提示 */
  function dismiss(): void {
    visible.value = false
    writeStored(today())
  }

  onMounted(() => {
    // 存值 ≠ 今日（含读不到）即显示，实现「每日首次」
    visible.value = readStored() !== today()
  })

  return { visible, dismiss }
}
