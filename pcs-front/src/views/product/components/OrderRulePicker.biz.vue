<script lang="ts">
/** 一条下单限制规则：规则表达式在「下单限制规则」中统一维护，本系统只做搜索与引用选择。 */
export interface OrderRuleOption {
  /** 规则编码：选中值以此为准，表单落库也是这串编码 */
  code: string
  /** 规则名称：列表主文案 */
  name: string
  /** 规则类型 */
  type: string
  /** 命中规则后的处理方式 */
  action: string
  /** 规则说明，仅供选择时参考 */
  description: string
}

/**
 * 下单限制可选规则：数组驱动渲染，模板里不写死任何一条。
 * 后续「下单限制规则」列表接口就绪后，把本常量换成接口返回即可，调用方无需改动。
 */
export const ORDER_RULE_OPTIONS: OrderRuleOption[] = [
  {
    code: 'duty_prepaid',
    name: '关税预付',
    type: '关税预付',
    action: '拒收',
    description: '涉及关税预付时按下单限制校验',
  },
  {
    code: 'hk_delivery',
    name: '香港交货',
    type: '香港交货',
    action: '拒收',
    description: '涉及香港交货时按下单限制校验',
  },
  {
    code: 'oversized',
    name: '超大件',
    type: '超大件',
    action: '转人工',
    description: '超大件需按规则校验或转人工',
  },
  {
    code: 'with_battery',
    name: '是否带电',
    type: '是否带电',
    action: '拒收',
    description: '带电按接单限制',
  },
]
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

/** 选中的规则编码数组，与表单 form.orderRules 双向绑定 */
const selectedCodes = defineModel<string[]>({ required: true })

const keyword = ref('')

/** 关键词对规则名称 / 编码 / 规则类型做忽略大小写匹配 */
const filteredRules = computed<OrderRuleOption[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (kw === '') return ORDER_RULE_OPTIONS
  return ORDER_RULE_OPTIONS.filter((rule) =>
    [rule.name, rule.code, rule.type].some((field) => field.toLowerCase().includes(kw)),
  )
})
</script>

<template>
  <div class="order-rule-picker">
    <a-input
      v-model="keyword"
      class="order-rule-picker__search"
      placeholder="搜索规则名称 / 编码 / 规则类型"
      allow-clear
    >
      <template #prefix>
        <icon-search />
      </template>
    </a-input>

    <a-checkbox-group v-model="selectedCodes" direction="vertical" class="order-rule-picker__list">
      <a-checkbox v-for="rule in filteredRules" :key="rule.code" :value="rule.code" class="order-rule-picker__row">
        <span class="order-rule-picker__row-name">{{ rule.name }}</span>
        <span class="order-rule-picker__row-meta">
          {{ rule.code }} · {{ rule.type }} · {{ rule.action }} · {{ rule.description }}
        </span>
      </a-checkbox>
    </a-checkbox-group>

    <p v-if="filteredRules.length === 0" class="order-rule-picker__empty">无匹配规则，请调整关键词后重试。</p>

    <p class="order-rule-picker__tip">
      支持多选：先搜索定位规则，直接勾选行即可。规则类型、处理方式和说明仅供选择时参考。
    </p>
  </div>
</template>

<style scoped>
.order-rule-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);

  padding: var(--spacing-md);

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);

  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
}

.order-rule-picker__tip,
.order-rule-picker__row-meta {
  color: var(--color-text-secondary);
}

.order-rule-picker__tip,
.order-rule-picker__empty,
.order-rule-picker__row-meta {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
}

.order-rule-picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* 行内铺满：Arco checkbox 默认行内宽度与固定高度，这里改成整行卡片 */
.order-rule-picker__row {
  display: flex;
  align-items: center;
  width: 100%;
  height: auto;
  padding: var(--spacing-sm) var(--spacing-md);
  gap: var(--spacing-sm);

  border: 1px solid var(--color-divider);
  border-radius: var(--border-radius-default);
}

.order-rule-picker__row:hover {
  border-color: var(--color-primary-200);
}

.order-rule-picker__row :deep(.arco-checkbox-label) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-xs) var(--spacing-sm);
  min-width: 0;
}

.order-rule-picker__row-name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.order-rule-picker__empty,
.order-rule-picker__tip {
  margin: 0;
}
</style>
