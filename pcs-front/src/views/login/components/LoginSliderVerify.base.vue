<template>
  <div
    class="login-slider"
    :class="{ 'login-slider--verified': verified }"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <div class="login-slider__fill" :style="fillStyle" />
    <div class="login-slider__text">{{ verified ? '验证通过' : '请拖动滑块完成验证' }}</div>
    <div
      class="login-slider__handle"
      role="slider"
      tabindex="0"
      :aria-label="verified ? '已验证' : '拖动完成验证'"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="valueNow"
      :style="handleStyle"
      @pointerdown="onDown"
      @keydown="onKeydown"
    >
      <icon-check v-if="verified" :size="18" />
      <icon-double-right v-else :size="18" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

withDefaults(defineProps<{ modelValue?: boolean }>(), { modelValue: false })

const verified = ref(false)
const dragging = ref(false)
const handleLeft = ref(-1)
const valueNow = ref(0)
const startX = ref(0)
const maxX = ref(0)
const trackEl = ref<HTMLElement | null>(null)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const handleStyle = computed(() => {
  if (verified.value) return undefined
  return {
    left: `${handleLeft.value}px`,
    transition: dragging.value || reduceMotion ? 'none' : 'left 200ms var(--ease-card)',
  }
})

const HANDLE_SIZE = 40

const fillStyle = computed(() => {
  if (verified.value) return undefined
  const width = Math.max(0, handleLeft.value + HANDLE_SIZE)
  return { width: `${width}px` }
})

function succeed() {
  verified.value = true
  valueNow.value = 100
  handleLeft.value = -1
  emit('update:modelValue', true)
}

function resetHandle() {
  if (verified.value) return
  handleLeft.value = -1
  valueNow.value = 0
}

function onDown(e: PointerEvent) {
  if (verified.value) return
  const target = e.currentTarget as HTMLElement
  trackEl.value = target.parentElement
  dragging.value = true
  startX.value = e.clientX
  maxX.value = (trackEl.value?.clientWidth ?? 0) - target.clientWidth
  target.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value || verified.value) return
  const x = Math.max(-1, Math.min(maxX.value, e.clientX - startX.value - 20))
  handleLeft.value = x
  valueNow.value = Math.round((x / Math.max(maxX.value, 1)) * 100)
  if (x >= maxX.value - 2) {
    dragging.value = false
    succeed()
  }
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  resetHandle()
}

function onKeydown(e: KeyboardEvent) {
  if ((e.key === 'Enter' || e.key === ' ') && !verified.value) {
    e.preventDefault()
    succeed()
  }
}

function reset() {
  verified.value = false
  dragging.value = false
  handleLeft.value = -1
  valueNow.value = 0
  emit('update:modelValue', false)
}

defineExpose({ reset, verified })
</script>

<style scoped>
.login-slider {
  /* Positioning */
  position: relative;

  /* Box Model */
  height: var(--login-control-height);
  margin-bottom: var(--spacing-md);
  border: var(--border-default);
  border-radius: var(--border-radius-default);

  /* Visual */
  background: var(--color-bg-surface);

  /* Misc */
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.login-slider__fill {
  /* Positioning */
  position: absolute;
  inset: 0 auto 0 0;

  /* Box Model */
  width: calc(var(--login-control-height) - 2px);

  /* Visual */
  background: var(--color-primary-50);
}

.login-slider__text {
  /* Positioning */
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);

  /* Misc */
  pointer-events: none;
}

.login-slider__handle {
  /* Positioning */
  position: absolute;
  top: -1px;
  left: -1px;
  z-index: var(--z-base);
  display: grid;
  place-items: center;

  /* Box Model */
  width: var(--login-control-height);
  height: var(--login-control-height);
  border: var(--border-default);
  border-radius: var(--border-radius-default);

  /* Typographic */
  color: var(--color-text-secondary);

  /* Visual */
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);

  /* Misc */
  cursor: grab;
  transition:
    border-color var(--duration-state) var(--ease-state),
    color var(--duration-state) var(--ease-state);
}

.login-slider__handle:active {
  cursor: grabbing;
}

.login-slider--verified .login-slider__fill {
  /* Box Model */
  width: calc(100% - var(--login-control-height) + 8px);
  border-right: 0;

  /* Visual */
  background: var(--color-success-bg);
}

.login-slider:not(.login-slider--verified) .login-slider__fill {
  border-radius: 8px;
}

.login-slider--verified .login-slider__text {
  color: var(--color-success);
}

.login-slider--verified .login-slider__handle {
  /* Positioning */
  left: calc(100% - var(--login-control-height) + 1px);

  /* Box Model */
  width: var(--login-control-height);
  border-left-color: var(--color-border);
  border-radius: var(--border-radius-default);

  /* Typographic */
  color: var(--color-success);

  /* Misc */
  cursor: default;
}
</style>
