<template>
  <div
    class="by-safe-image"
    :style="{
      width: sizeStyle(width),
      height: sizeStyle(height),
      borderRadius: radius,
    }"
  >
    <img
      v-if="src && state !== 'error'"
      :src="src"
      :alt="alt"
      class="by-safe-image__img"
      :style="{ objectFit: fit, opacity: state === 'success' ? 1 : 0 }"
      @load="handleLoad"
      @error="handleError"
    />
    <div v-if="state === 'loading'" class="by-safe-image__placeholder by-safe-image__skeleton" />
    <div v-if="state === 'error' || state === 'empty'" class="by-safe-image__placeholder">
      <SvgIcon name="image-broken" size="decorative" />
      <span class="by-safe-image__alt">{{ alt }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SvgIcon from '../SvgIcon.vue'

interface Props {
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  radius?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: '图片',
  fit: 'cover',
  radius: 'var(--border-radius-default)',
})

type ImgState = 'loading' | 'success' | 'error' | 'empty'

const state = ref<ImgState>(props.src ? 'loading' : 'empty')

watch(
  () => props.src,
  (newSrc) => {
    state.value = newSrc ? 'loading' : 'empty'
  },
)

function handleLoad() {
  state.value = 'success'
}

function handleError() {
  state.value = 'error'
}

function sizeStyle(v?: string | number) {
  if (v === undefined) return undefined
  return typeof v === 'number' ? `${v}px` : v
}
</script>

<style scoped>
.by-safe-image {
  position: relative;
  overflow: hidden;

  display: inline-block;

  background: var(--color-bg-surface);
}

.by-safe-image__img {
  width: 100%;
  height: 100%;
}

.by-safe-image__placeholder {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);

  color: var(--color-text-placeholder);
}

.by-safe-image__skeleton {
  background: var(--color-bg-surface);
}

.by-safe-image__alt {
  font-size: var(--font-size-xs);
}
</style>
