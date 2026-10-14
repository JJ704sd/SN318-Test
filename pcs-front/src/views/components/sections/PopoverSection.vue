<template>
  <section class="section">
    <h2 class="section__title">⑯ 气泡卡片 Popover</h2>

    <ByCard title="承载可交互内容（按钮 / 表单）" class="section__card">
      <a-space wrap>
        <a-popover v-model:popup-visible="confirmVisible" title="确认操作" trigger="click" position="top">
          <a-button>点击触发 Popover</a-button>
          <template #content>
            <div class="popover-content">
              <p class="popover-content__text">确认删除该运单？</p>
              <div class="popover-content__actions">
                <a-button size="small" @click="onCancel">取消</a-button>
                <a-button size="small" type="primary" status="danger" @click="onConfirm">删除</a-button>
              </div>
            </div>
          </template>
        </a-popover>

        <a-popover title="快捷筛选" trigger="click" position="bottom">
          <a-button>嵌入表单</a-button>
          <template #content>
            <div class="popover-form">
              <a-radio-group v-model="quickFilter" type="radio" size="small">
                <a-radio value="all">全部</a-radio>
                <a-radio value="today">今日</a-radio>
                <a-radio value="week">本周</a-radio>
              </a-radio-group>
            </div>
          </template>
        </a-popover>

        <a-popover title="关联操作" trigger="click" position="left">
          <a-button>链接列表</a-button>
          <template #content>
            <div class="popover-links">
              <a-link>查看运单详情</a-link>
              <a-link>打开轨迹记录</a-link>
            </div>
          </template>
        </a-popover>

        <a-popover title="状态信息" trigger="click" position="right">
          <a-button>状态说明</a-button>
          <template #content>
            <p class="popover-content__text">当前运单正在运输中，预计明日送达。</p>
          </template>
        </a-popover>
      </a-space>
      <p class="section__hint">点击触发、点击外部关闭；承载按钮 / 链接 / 表单 / 列表等可交互内容；白底 + 描边 + shadow-md。</p>
    </ByCard>

    <ByCard title="与 Tooltip 区别" class="section__card">
      <div class="diff-table">
        <div class="diff-table__row diff-table__row--head">
          <span>维度</span>
          <span>Tooltip</span>
          <span>Popover</span>
        </div>
        <div class="diff-table__row">
          <span>触发方式</span>
          <span>hover</span>
          <span>点击</span>
        </div>
        <div class="diff-table__row">
          <span>可承载内容</span>
          <span>纯文字</span>
          <span>按钮 / 表单 / 列表</span>
        </div>
        <div class="diff-table__row">
          <span>Mobile 适用</span>
          <span>不适用</span>
          <span>适用</span>
        </div>
      </div>
    </ByCard>

    <a-alert type="warning" show-icon>点击触发，承载可交互内容；同时仅 1 个 Popover；复杂多步操作改 Modal；内容超一屏需内部滚动。</a-alert>

    <PropsDoc :groups="POPOVER_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ByCard, successMsg } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { POPOVER_PROP_GROUPS } from '../propDoc'

const quickFilter = ref('all')
const confirmVisible = ref(false)

function onCancel() {
  confirmVisible.value = false
}

function onConfirm() {
  confirmVisible.value = false
  successMsg('删除成功')
}

const code = `<a-popover title="确认操作" trigger="click" position="top">
  <a-button>点击触发</a-button>
  <template #content>
    <p>确认删除该运单？</p>
    <div>
      <a-button size="small">取消</a-button>
      <a-button size="small" type="primary" status="danger">删除</a-button>
    </div>
  </template>
</a-popover>

<!-- 嵌入表单 -->
<a-popover title="快捷筛选" trigger="click" position="bottom">
  <a-button>快捷筛选</a-button>
  <template #content>
    <a-radio-group v-model="filter" type="radio" size="small">
      <a-radio value="all">全部</a-radio>
      <a-radio value="today">今日</a-radio>
    </a-radio-group>
  </template>
</a-popover>

<!-- 链接列表 -->
<a-popover title="关联操作" trigger="click" position="left">
  <a-button>链接列表</a-button>
  <template #content>
    <div>
      <a-link>查看运单详情</a-link>
      <a-link>打开轨迹记录</a-link>
    </div>
  </template>
</a-popover>

<!-- 状态信息 -->
<a-popover title="状态信息" trigger="click" position="right">
  <a-button>状态说明</a-button>
  <template #content>
    <p>当前运单正在运输中，预计明日送达。</p>
  </template>
</a-popover>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.section__hint {
  margin: var(--spacing-sm) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.popover-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 200px;
}

.popover-content__text {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.popover-content__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.popover-form {
  width: 200px;
}

.popover-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 160px;
}

.diff-table {
  display: grid;
  grid-template-columns: 100px 1fr 1fr;
  gap: var(--spacing-sm);
}

.diff-table__row {
  display: contents;
}

.diff-table__row > span {
  padding: var(--spacing-xs) var(--spacing-sm);

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.diff-table__row--head > span {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  border-bottom: var(--border-divider);
}
</style>
