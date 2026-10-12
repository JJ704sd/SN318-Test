<template>
  <section class="section">
    <h2 class="section__title">⑩ 弹窗 Modal</h2>

    <ByCard title="弹窗触发" class="section__card">
      <a-space wrap>
        <a-button type="primary" @click="defaultVisible = true">默认弹窗（480px）</a-button>
        <a-button type="primary" @click="largeVisible = true">大弹窗（640px）</a-button>
        <a-button status="danger" @click="dangerVisible = true">危险确认弹窗</a-button>
      </a-space>
      <p class="section__hint">默认 480 / 大 640；手机端默认底部 Sheet，大弹窗全屏；最大视口 80%；header/footer 固定，内容区独立滚动；遮罩 rgba(0,0,0,0.45)。</p>
    </ByCard>

    <ByModal
      v-model:visible="defaultVisible"
      title="确认提交"
      mode="confirm"
      @confirm="onConfirm('default')"
    >
      <p class="modal-demo-text">确认提交该运单？提交后不可修改运单号。</p>
    </ByModal>

    <ByModal
      v-model:visible="largeVisible"
      title="新建运单"
      mode="form-double"
      @confirm="onConfirm('large')"
    >
      <p class="modal-demo-text">大弹窗用于双列表单或内容较多场景。表单字段双列排布，跨列字段（如备注）可 span 满。</p>
    </ByModal>

    <ByModal
      v-model:visible="dangerVisible"
      title="删除运单"
      mode="confirm"
      danger
      ok-text="确认删除"
      @confirm="onConfirm('danger')"
    >
      <p class="modal-demo-text">确认删除 BY10000001？删除后不可恢复。</p>
    </ByModal>

    <a-alert type="warning" show-icon>仅取消/确认两个按钮；危险操作用 danger；提交中确认按钮 loading 且遮罩不可关闭；禁止整体滚动。</a-alert>

    <PropsDoc :groups="MODAL_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ByCard, ByModal, successMsg } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { MODAL_PROP_GROUPS } from '../propDoc'

const defaultVisible = ref(false)
const largeVisible = ref(false)
const dangerVisible = ref(false)

function onConfirm(type: 'default' | 'large' | 'danger') {
  if (type === 'default') {
    defaultVisible.value = false
    successMsg('提交成功')
  } else if (type === 'large') {
    largeVisible.value = false
    successMsg('保存成功')
  } else {
    dangerVisible.value = false
    successMsg('删除成功')
  }
}

const code = `<ByModal
  v-model:visible="visible"
  title="确认提交"
  mode="confirm"
  @confirm="onConfirm"
  @cancel="visible = false"
>
  <p>确认提交该运单？</p>
</ByModal>

<!-- 大弹窗 -->
<ByModal
  v-model:visible="visible"
  title="新建运单"
  mode="form-double"
>
  <p>双列表单内容</p>
</ByModal>

<!-- 危险确认 -->
<ByModal
  v-model:visible="visible"
  title="删除运单"
  mode="confirm"
  danger
  ok-text="确认删除"
>
  <p>确认删除？删除后不可恢复</p>
</ByModal>`
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

.modal-demo-text {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
</style>
