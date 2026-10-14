<template>
  <section class="section">
    <h2 class="section__title">⑪ 抽屉 Drawer</h2>

    <ByCard title="抽屉触发" class="section__card">
      <a-space wrap>
        <a-button type="primary" @click="defaultVisible = true">默认抽屉（480px）</a-button>
        <a-button type="primary" @click="largeVisible = true">宽抽屉（640px）</a-button>
      </a-space>
      <p class="section__hint">默认 480 / 宽 640；固定右侧滑出；高度撑满视口；手机端全屏；header/footer 固定，内容区独立滚动。</p>
    </ByCard>

    <ByDrawer
      v-model:visible="defaultVisible"
      title="运单详情"
      size="default"
    >
      <div class="drawer-demo-body">
        <p class="drawer-demo-text">默认抽屉宽度 480px，用于列表行内快速查看详情。</p>
        <p class="drawer-demo-text">移动端自动占满宽（100%）。</p>
      </div>
      <template #footer>
        <a-button @click="defaultVisible = false">关闭</a-button>
      </template>
    </ByDrawer>

    <ByDrawer
      v-model:visible="largeVisible"
      title="编辑运单"
      size="large"
    >
      <div class="drawer-demo-body">
        <p class="drawer-demo-text">宽抽屉 640px，用于内容较多或双列展示场景。</p>
        <p class="drawer-demo-text">底部 footer 固定，不随内容滚动。</p>
      </div>
      <template #footer>
        <a-button type="primary" @click="onSave">保存</a-button>
        <a-button @click="largeVisible = false">取消</a-button>
      </template>
    </ByDrawer>

    <a-alert type="warning" show-icon>右侧滑出；默认 480 / 宽 640；移动端占满宽；底部固定；与 Modal 区别：贴边不打断。</a-alert>

    <PropsDoc :groups="DRAWER_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ByCard, ByDrawer, successMsg } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { DRAWER_PROP_GROUPS } from '../propDoc'

const defaultVisible = ref(false)
const largeVisible = ref(false)

function onSave() {
  largeVisible.value = false
  successMsg('保存成功')
}

const code = `<ByDrawer
  v-model:visible="visible"
  title="运单详情"
  size="default"
  @close="visible = false"
>
  <p>抽屉内容</p>
  <template #footer>
    <a-button @click="visible = false">关闭</a-button>
  </template>
</ByDrawer>

<!-- 宽抽屉 -->
<ByDrawer
  v-model:visible="visible"
  title="编辑运单"
  size="large"
>
  <p>宽抽屉内容</p>
  <template #footer>
    <a-button type="primary">保存</a-button>
    <a-button @click="visible = false">取消</a-button>
  </template>
</ByDrawer>`
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

.drawer-demo-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.drawer-demo-text {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
</style>
