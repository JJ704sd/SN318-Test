<template>
  <span
    class="by-biz-tag"
    :class="[
      `by-biz-tag--${type}`,
      size === 'small' && 'by-biz-tag--small',
    ]"
    :style="customColorVars"
  >
    <slot>{{ displayText }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type BizType } from '@core/styles/tokens'

export type { BizType }
export type TagSize = 'default' | 'small'

interface Props {
  type: BizType
  size?: TagSize
  /** 覆盖默认显示文字；优先级 slot > label > type 默认文字。 */
  label?: string
  /** 自定义文字色（经 CSS.supports 校验，非法则回落 type 预设）。 */
  color?: string
  /** 自定义底色（经 CSS.supports 校验，非法则回落 type 预设）。 */
  backgroundColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
})

const DEFAULT_LABELS: Record<BizType, string> = {
  express: '快递',
  air: '空运',
  fba: 'FBA',
  line: '国际专线',
  sea: '海运整柜',
  pickup: '上门取件',
  inquiry: '在线询盘',
}

const displayText = computed(() => props.label ?? DEFAULT_LABELS[props.type])

/** 环境不支持 CSS.supports 时放行（浏览器实际渲染兜底），支持时做合法性过滤。 */
function isSupported(property: 'color' | 'background-color', value: string): boolean {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return CSS.supports(property, value)
  }
  return true
}

/** 自定义色经受控 CSS 变量注入（style 白名单仅这两个 var），无自定义时返回 undefined 不产生内联 style。 */
const customColorVars = computed<Record<string, string> | undefined>(() => {
  const vars: Record<string, string> = {}
  if (props.color && isSupported('color', props.color)) vars['--by-tag-color'] = props.color
  if (props.backgroundColor && isSupported('background-color', props.backgroundColor)) {
    vars['--by-tag-bg'] = props.backgroundColor
  }
  return Object.keys(vars).length > 0 ? vars : undefined
})
</script>

<style scoped>
/*
 * 业务类型 Tag（规范 §Tag）：浅底 + 深字，无描边
 * default 高 22 / 字 12 / 左右 8；small 高 18 / 字 10 / 左右 6
 * 颜色经 --by-tag-color / --by-tag-bg 自定义属性读取：type 预设 class 提供默认值，
 * 自定义 color/backgroundColor 以内联同名变量覆盖（优先级高于 class）。
 */
.by-biz-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  height: var(--tag-height-default);
  padding: 0 var(--tag-padding-x-default);
  border-radius: var(--border-radius-default);

  color: var(--by-tag-color);
  background-color: var(--by-tag-bg);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  line-height: 1;
  white-space: nowrap;
}

.by-biz-tag--small {
  height: var(--tag-height-sm);
  padding: 0 var(--tag-padding-x-sm);
  font-size: var(--font-size-tag-sm);
}

.by-biz-tag--express {
  --by-tag-color: var(--color-biz-express);
  --by-tag-bg: var(--color-biz-express-bg);
}

.by-biz-tag--air {
  --by-tag-color: var(--color-biz-air);
  --by-tag-bg: var(--color-biz-air-bg);
}

.by-biz-tag--fba {
  --by-tag-color: var(--color-biz-fba);
  --by-tag-bg: var(--color-biz-fba-bg);
}

.by-biz-tag--line {
  --by-tag-color: var(--color-biz-line);
  --by-tag-bg: var(--color-biz-line-bg);
}

.by-biz-tag--sea {
  --by-tag-color: var(--color-biz-sea);
  --by-tag-bg: var(--color-biz-sea-bg);
}

.by-biz-tag--pickup {
  --by-tag-color: var(--color-biz-pickup);
  --by-tag-bg: var(--color-biz-pickup-bg);
}

.by-biz-tag--inquiry {
  --by-tag-color: var(--color-biz-inquiry);
  --by-tag-bg: var(--color-biz-inquiry-bg);
}
</style>
