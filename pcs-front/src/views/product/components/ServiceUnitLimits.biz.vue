<template>
  <div class="service-unit-limits">
    <p v-if="!loading && rules.length === 0" class="service-unit-limits__empty">未配置下单限制</p>

    <ul v-else-if="!loading" class="service-unit-limits__list">
      <li v-for="rule in rules" :key="rule.code" class="service-unit-limits__item">
        <div class="service-unit-limits__head">
          <span class="service-unit-limits__name">{{ rule.name }}</span>
          <span class="service-unit-limits__meta">
            {{ rule.description ? `${rule.action} · ${rule.description}` : rule.action }}
          </span>
        </div>
        <!-- 表达式用 code 元素承载：等宽字体由浏览器默认样式给出，不另写 font-family -->
        <code v-if="rule.expression" class="service-unit-limits__expression">{{ rule.expression }}</code>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listOrderingRules, type OrderingRuleItem } from '@/api/service-unit/ordering-rule'

const props = withDefaults(
  defineProps<{
    /** 要展示的下单限制规则编码 */
    codes?: string[]
  }>(),
  { codes: () => [] },
)

const rules = ref<OrderingRuleItem[]>([])
const loading = ref(false)

/**
 * 规则列表接口暂无按编码批量取的参数，取一页后本地过滤（规则量级 20+ 条，代价可忽略）。
 * 真实后端切换点：改为按编码批量查询。
 */
async function fetchRules(): Promise<void> {
  if (props.codes.length === 0) return
  loading.value = true
  try {
    const { list } = await listOrderingRules({ pageSize: 50 })
    const wanted = new Set(props.codes)
    rules.value = list.filter((rule) => wanted.has(rule.code))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchRules()
})
</script>

<style scoped>
.service-unit-limits__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);

  margin: 0;
  padding: 0;

  list-style: none;
}

.service-unit-limits__item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.service-unit-limits__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.service-unit-limits__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.service-unit-limits__meta,
.service-unit-limits__expression,
.service-unit-limits__empty {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
}

.service-unit-limits__meta,
.service-unit-limits__empty {
  color: var(--color-text-secondary);
}

.service-unit-limits__expression {
  color: var(--color-text-body);
}

.service-unit-limits__empty {
  margin: 0;
}
</style>
