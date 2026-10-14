<template>
  <transition name="global-loading-fade">
    <div
      v-if="globalLoadingStore.globalLoading"
      class="global-loading"
      role="alert"
      aria-busy="true"
      aria-live="assertive"
    >
      <a-spin :size="spinnerSize" />
    </div>
  </transition>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGlobalLoadingStore } from '@core/stores'

const globalLoadingStore = useGlobalLoadingStore()

// a-spin :size 必须为数字，从 CSS 变量 --spinner-size-md 读取以避免散落裸值（默认 32）
const spinnerSize = ref(32)
onMounted(() => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--spinner-size-md').trim()
  const parsed = Number.parseInt(raw, 10)
  if (Number.isFinite(parsed) && parsed > 0) spinnerSize.value = parsed
})
</script>

<style scoped>
.global-loading {
  /* Positioning */
  position: fixed;
  inset: 0;
  z-index: var(--z-global-loading);
  display: flex;
  align-items: center;
  justify-content: center;

  /* Visual */
  background: var(--overlay-loading-full);
}

.global-loading-fade-enter-active,
.global-loading-fade-leave-active {
  transition: opacity var(--duration-state) var(--ease-state);
}

.global-loading-fade-enter-from,
.global-loading-fade-leave-to {
  opacity: 0;
}
</style>
