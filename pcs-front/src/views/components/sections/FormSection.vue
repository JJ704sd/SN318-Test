<template>
  <section class="section">
    <h2 class="section__title">⑦ 表单 Form</h2>

    <ByCard title="单列表单（必填标记 + 校验错误态）" class="section__card">
      <ByForm :model="singleModel">
        <a-form-item field="name" label="收件人" required>
          <a-input v-model="singleModel.name" placeholder="请填写收件人" />
        </a-form-item>
        <a-form-item field="phone" label="联系电话" required validate-status="error" help="手机号格式不正确，请重新输入">
          <a-input v-model="singleModel.phone" placeholder="请填写手机号" />
        </a-form-item>
        <a-form-item field="address" label="收件地址">
          <a-input v-model="singleModel.address" placeholder="请填写地址" />
        </a-form-item>
        <a-form-item field="remark" label="备注">
          <a-textarea v-model="singleModel.remark" placeholder="请填写备注" :max-length="200" show-word-limit />
        </a-form-item>
      </ByForm>
    </ByCard>

    <ByCard title="双列表单（≥1440px 自动双列）" class="section__card">
      <ByForm :model="doubleModel" :cols="2">
        <a-form-item field="consignee" label="收件人" required>
          <a-input v-model="doubleModel.consignee" placeholder="请填写" />
        </a-form-item>
        <a-form-item field="phone" label="联系电话" required>
          <a-input v-model="doubleModel.phone" placeholder="请填写" />
        </a-form-item>
        <a-form-item field="weight" label="重量">
          <a-input-number v-model="doubleModel.weight" placeholder="请填写" :min="0" />
        </a-form-item>
        <a-form-item field="amount" label="金额">
          <a-input-number v-model="doubleModel.amount" placeholder="请填写" :min="0" />
        </a-form-item>
        <a-form-item field="remark" label="备注（跨两列）" class="by-form-span-2">
          <a-textarea v-model="doubleModel.remark" placeholder="请填写" />
        </a-form-item>
      </ByForm>
    </ByCard>

    <a-alert type="warning" show-icon>上下排布局；必填 * 红色左侧；校验提示输入框下方 12px 错误色；双列 ≥1440 自动启用，&lt;1440 降单列。</a-alert>

    <PropsDoc :groups="FORM_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ByCard, ByForm } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { FORM_PROP_GROUPS } from '../propDoc'

const singleModel = reactive({
  name: '',
  phone: '138',
  address: '',
  remark: '',
})

const doubleModel = reactive({
  consignee: '',
  phone: '',
  weight: 0,
  amount: 0,
  remark: '',
})

const code = `<ByForm :model="model">
  <a-form-item field="name" label="收件人" required>
    <a-input v-model="model.name" placeholder="请填写收件人" />
  </a-form-item>
  <a-form-item
    field="phone"
    label="联系电话"
    required
    validate-status="error"
    help="手机号格式不正确，请重新输入"
  >
    <a-input v-model="model.phone" />
  </a-form-item>
</ByForm>

<!-- 双列 -->
<ByForm :model="model" :cols="2">
  <a-form-item field="consignee" label="收件人" required>
    <a-input v-model="model.consignee" />
  </a-form-item>
  <a-form-item field="phone" label="联系电话" required>
    <a-input v-model="model.phone" />
  </a-form-item>
  <a-form-item field="remark" label="备注（跨两列）" class="by-form-span-2">
    <a-textarea v-model="model.remark" />
  </a-form-item>
</ByForm>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

</style>
