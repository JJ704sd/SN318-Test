<template>
  <ByCard :title="title" variant="outlined" class="section__card">
    <p v-if="note" class="props-doc__note">{{ note }}</p>
    <div
      v-for="(group, index) in groups"
      :key="group.title ?? String(index)"
      class="props-doc__group"
    >
      <h3 v-if="group.title" class="props-doc__subtitle">{{ group.title }}</h3>
      <p v-if="group.note" class="props-doc__note">{{ group.note }}</p>
      <div class="props-doc__scroll">
        <table class="props-doc__table">
          <thead>
            <tr>
              <th scope="col">参数</th>
              <th scope="col">类型</th>
              <th scope="col">默认值</th>
              <th scope="col">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows" :key="row.name">
              <td>
                <code class="props-doc__name">{{ row.name }}</code>
                <span v-if="row.required" class="props-doc__required">必填</span>
              </td>
              <td><code class="props-doc__type">{{ row.type }}</code></td>
              <td>
                <code v-if="row.default !== undefined" class="props-doc__default">{{ row.default }}</code>
                <span v-else class="props-doc__empty">—</span>
              </td>
              <td class="props-doc__desc">{{ row.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </ByCard>
</template>

<script setup lang="ts">
import { ByCard } from '@core/components'
import type { PropDocGroup } from './propDoc'

withDefaults(
  defineProps<{
    groups: PropDocGroup[]
    title?: string
    note?: string
  }>(),
  {
    title: '可传递参数',
  },
)
</script>

<style scoped>
.props-doc__group + .props-doc__group {
  /* Box Model */
  margin-top: var(--spacing-lg);
}

.props-doc__subtitle {
  /* Box Model */
  margin: 0 0 var(--spacing-sm);

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.props-doc__note {
  /* Box Model */
  margin: 0 0 var(--spacing-sm);

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.props-doc__scroll {
  /* Misc */
  overflow-x: auto;
}

.props-doc__table {
  /* Box Model */
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.props-doc__table th,
.props-doc__table td {
  /* Box Model */
  padding: var(--spacing-sm);
  border-bottom: var(--border-divider);

  /* Typographic */
  font-size: var(--font-size-sm);
  text-align: left;
  vertical-align: top;
}

.props-doc__table th {
  /* Typographic */
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;

  /* Visual */
  background: var(--color-bg-surface);
}

.props-doc__name,
.props-doc__type,
.props-doc__default {
  /* Typographic */
  font-family: inherit;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}

.props-doc__name {
  /* Typographic */
  color: var(--color-primary);
}

.props-doc__type,
.props-doc__default {
  /* Typographic */
  color: var(--color-text-body);
}

.props-doc__required {
  /* Positioning */
  display: inline-block;

  /* Box Model */
  margin-left: var(--spacing-xs);

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.props-doc__empty {
  /* Typographic */
  color: var(--color-text-secondary);
}

.props-doc__desc {
  /* Typographic */
  color: var(--color-text-body);
  overflow-wrap: anywhere;
}
</style>
