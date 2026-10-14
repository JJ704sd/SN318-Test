<template>
  <svg
    :style="{ width: resolvedSize, height: resolvedSize, color: color }"
    aria-hidden="true"
    class="svg-icon"
  >
    <use :xlink:href="`#icon-${name}`" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SizePreset = 'inline' | 'action' | 'decorative'

interface Props {
  name: string
  size?: SizePreset | string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: '1em',
  color: 'currentColor',
})

const PRESET_MAP: Record<SizePreset, string> = {
  inline: 'var(--icon-size-inline)',
  action: 'var(--icon-size-action)',
  decorative: 'var(--icon-size-decorative)',
}

const isPreset = (v: string): v is SizePreset => v in PRESET_MAP

const resolvedSize = computed(() =>
  isPreset(props.size) ? PRESET_MAP[props.size] : props.size,
)
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  overflow: hidden;
  fill: currentColor;
  vertical-align: -0.15em;
}
</style>
