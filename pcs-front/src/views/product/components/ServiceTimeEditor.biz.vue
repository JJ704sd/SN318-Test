<script lang="ts">
/** 单个服务时段：选中的星期数组 + 起止时间（HH:mm）。 */
export interface ServiceSegment {
  days: string[]
  start: string
  end: string
}

/** 新建空时段：星期留空待选，时间留空由用户填写。 */
export function createSegment(): ServiceSegment {
  return { days: [], start: '', end: '' }
}

/**
 * 校验时段列表：每条都要选星期且开始早于结束，同一星期的时段不能重叠。
 * 返回第一条错误文案，合法时返回 undefined —— 这类跨行 / 跨字段规则用不了 form rules，
 * 由调用方负责提示。
 */
export function validateServiceSegments(segments: ServiceSegment[]): string | undefined {
  const hasInvalidRow = segments.some(
    (segment) => segment.days.length === 0 || !segment.start || !segment.end || segment.start >= segment.end,
  )
  if (hasInvalidRow) return '请为每条服务时段选择星期，并设置开始时间早于结束时间'

  const hasOverlap = segments.some((left, leftIndex) =>
    segments.some((right, rightIndex) => {
      if (rightIndex <= leftIndex) return false
      const sharesDay = left.days.some((day) => right.days.includes(day))
      return sharesDay && left.start < right.end && right.start < left.end
    }))
  return hasOverlap ? '同一星期的服务时段不能重叠' : undefined
}
</script>

<script setup lang="ts">
const segments = defineModel<ServiceSegment[]>({ required: true })

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 以新数组整体赋回 model：行内任何改动都走这里，不在子组件直接改父级数据。 */
function patchSegment(index: number, resolve: (segment: ServiceSegment) => Partial<ServiceSegment>): void {
  segments.value = segments.value.map((segment, i) => (i === index ? { ...segment, ...resolve(segment) } : segment))
}

/** 点选 / 取消某个星期，选中的星期即 model 里的 days 数组。 */
function toggleDay(index: number, day: string): void {
  patchSegment(index, (segment) => ({
    days: segment.days.includes(day)
      ? segment.days.filter((item) => item !== day)
      : [...segment.days, day],
  }))
}

function addSegment(): void {
  segments.value = [...segments.value, createSegment()]
}

function removeSegment(index: number): void {
  segments.value = segments.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="service-time-editor">
    <div v-for="(segment, index) in segments" :key="index" class="service-time-editor__row">
      <div class="service-time-editor__days" role="group" aria-label="选择该时段覆盖的星期">
        <button
          v-for="day in WEEK_DAYS"
          :key="day"
          class="service-time-editor__day"
          :class="{ 'is-active': segment.days.includes(day) }"
          type="button"
          :aria-pressed="segment.days.includes(day)"
          @click="toggleDay(index, day)"
        >
          {{ day }}
        </button>
      </div>

      <div class="service-time-editor__range">
        <a-time-picker v-model="segment.start" format="HH:mm" placeholder="开始时间" />
        <span class="service-time-editor__separator">至</span>
        <a-time-picker v-model="segment.end" format="HH:mm" placeholder="结束时间" />
      </div>

      <button class="service-time-editor__remove" type="button" @click="removeSegment(index)">移除</button>
    </div>

    <button class="service-time-editor__add" type="button" @click="addSegment">
      <icon-plus />
      添加服务时段
    </button>

    <p class="service-time-editor__tip">
      可按不同星期设置多个服务时段。例如周一 09:00—18:00，周二至周日 10:00—19:00。
    </p>
  </div>
</template>

<style scoped>
.service-time-editor {
  padding: var(--spacing-md);

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);

  background-color: var(--color-bg-surface);
  border: var(--border-default);
  border-radius: var(--border-radius-card);
}

.service-time-editor__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-md) 0;
}

.service-time-editor__row:first-child {
  padding-top: 0;
}

/* 行间细分隔线只出现在第二行起，避免首行上方多一条线 */
.service-time-editor__row + .service-time-editor__row {
  border-top: 1px solid var(--color-divider);
}

.service-time-editor__days {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.service-time-editor__day,
.service-time-editor__remove,
.service-time-editor__add {
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  cursor: pointer;

  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
  transition: color var(--duration-state) var(--ease-state), background-color var(--duration-state) var(--ease-state),
    border-color var(--duration-state) var(--ease-state);
}

.service-time-editor__day {
  min-width: 48px;
  height: 32px;
  padding: 0 var(--spacing-sm);
}

.service-time-editor__day:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-200);
}

/* 选中态：字体与边框走主色亮蓝，浅蓝底；hover 不覆盖选中态 */
.service-time-editor__day.is-active,
.service-time-editor__day.is-active:hover {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background-color: var(--color-primary-50);
  border-color: var(--color-primary);
}

.service-time-editor__range {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* Arco 单值 Picker 的根节点挂在 Trigger 的 Fragment 上，class 与父级 scope 属性都到不了
   .arco-picker，需从容器用 :deep 命中，否则行内时间选择器会按内容自适应撑开 */
.service-time-editor__range :deep(.arco-picker) {
  width: 128px;
}

.service-time-editor__separator {
  color: var(--color-text-secondary);
}

.service-time-editor__remove {
  height: 32px;
  padding: 0 var(--spacing-md);
}

.service-time-editor__remove:hover {
  color: var(--color-error);
  border-color: var(--color-error);
}

.service-time-editor__add {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  width: 100%;
  height: 32px;
  padding: 0 var(--spacing-md);
}

.service-time-editor__add:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.service-time-editor__day:focus-visible,
.service-time-editor__remove:focus-visible,
.service-time-editor__add:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.service-time-editor__tip {
  margin: var(--spacing-sm) 0 0;

  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}
</style>
