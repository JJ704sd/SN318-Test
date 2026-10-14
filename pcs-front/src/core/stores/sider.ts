import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 侧栏能力 store：桌面折叠与移动端抽屉开关。
 */
export const useSiderStore = defineStore('sider', () => {
  const siderCollapsed = ref(false)
  // <1280px 侧栏改为抽屉形态，此状态控制抽屉开合，顶栏汉堡按钮触发
  const siderDrawerVisible = ref(false)

  function toggleSider() {
    siderCollapsed.value = !siderCollapsed.value
  }

  /** 断点跨越桌面子档时由 useDevice/BasicLayout 重置折叠态（≥1440 展开 / 1280–1439 折叠）。 */
  function setSiderCollapsed(collapsed: boolean) {
    siderCollapsed.value = collapsed
  }

  function openSiderDrawer() {
    siderDrawerVisible.value = true
  }

  function closeSiderDrawer() {
    siderDrawerVisible.value = false
  }

  return {
    siderCollapsed,
    siderDrawerVisible,
    toggleSider,
    setSiderCollapsed,
    openSiderDrawer,
    closeSiderDrawer,
  }
})
