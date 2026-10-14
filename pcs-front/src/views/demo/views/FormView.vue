<template>
  <div class="form-view-page">
    <PageHeader type="standard" :title="pageTitle">
      <template #extra>
        <a-radio-group v-model="mode" type="button" size="small">
          <a-radio value="single">单页</a-radio>
          <a-radio value="stepped">分步</a-radio>
        </a-radio-group>
      </template>
    </PageHeader>

    <div class="form-view">
    <a-steps v-if="isStepped" :current="activeStep + 1" class="form-view__steps">
      <a-step v-for="(label, index) in STEP_LABELS" :key="index" :title="label" />
    </a-steps>

    <div class="form-view__form-area">
      <ByForm ref="formRef" :model="form" class="form-view__form">
        <FormFields
          v-model:file-list="fileList"
          :model-value="form"
          :rules="formRules"
          :biz-options="BIZ_TYPE_OPTIONS"
          :accept="ATTACHMENT_ACCEPT"
          :max-size="ATTACHMENT_MAX_SIZE"
          :max-count="ATTACHMENT_MAX_COUNT"
          :active-step="isStepped ? activeStep : -1"
          @update:model-value="form = $event"
        />
      </ByForm>
    </div>

    <div class="form-view__footer" :style="footerStyle">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button v-if="isStepped && !isFirstStep" @click="prevStep">上一步</a-button>
        <a-button v-if="isStepped && !isLastStep" type="primary" @click="nextStep">下一步</a-button>
        <a-button
          v-if="!isStepped || isLastStep"
          v-permission="'operation:frontend_demo.demo.save'"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </a-button>
      </a-space>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FileItem } from '@arco-design/web-vue'
import PageHeader from '@/layout/components/PageHeader.vue'
import { ByForm, successMsg } from '@core/components'
import { useDevice } from '@core/composables'
import { submitForm, type WaybillFormData, type WaybillAttachment } from '@/api/demo'
import { useSiderStore } from '@core/stores'
import FormFields from '../components/FormFields.biz.vue'
import {
  BIZ_TYPE_OPTIONS,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE,
  ATTACHMENT_MAX_COUNT,
  formRules,
  STEP_FIELDS,
  createEmptyForm,
} from '../config/formConfig'

const props = withDefaults(defineProps<{ mode?: 'single' | 'stepped' }>(), { mode: 'single' })

const route = useRoute()
const router = useRouter()
const siderStore = useSiderStore()
const { isDesktop } = useDevice()

const SIDER_WIDTH = 220
const SIDER_COLLAPSED_WIDTH = 56

const siderWidth = computed(() => {
  if (!isDesktop.value) return 0
  return siderStore.siderCollapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH
})

const footerStyle = computed(() => ({
  '--form-footer-sider-width': `${siderWidth.value}px`,
}))

const STEP_LABELS = ['基本信息', '物流信息', '费用信息']

const mode = ref<'single' | 'stepped'>(props.mode)
const activeStep = ref(0)
const submitting = ref(false)
const form = ref<WaybillFormData>(createEmptyForm())
const fileList = ref<FileItem[]>([])
const formRef = ref<InstanceType<typeof ByForm>>()

const editId = computed(() => (route.query.id as string) || '')
const pageTitle = computed(() => (editId.value ? '编辑运单' : '新建运单'))

const isStepped = computed(() => mode.value === 'stepped')
const isFirstStep = computed(() => activeStep.value === 0)
const isLastStep = computed(() => activeStep.value === STEP_FIELDS.length - 1)

async function nextStep() {
  const fields = STEP_FIELDS[activeStep.value] ?? []
  const errors = await formRef.value?.validateFields(fields)
  if (errors) return
  activeStep.value += 1
}

function prevStep() {
  activeStep.value -= 1
}

async function handleSubmit() {
  const errors = await formRef.value?.validate()
  if (errors) return
  submitting.value = true
  try {
    const attachments: WaybillAttachment[] = fileList.value.map((f) => ({ name: f.name ?? '', url: f.url }))
    await submitForm({ ...form.value, waybillNo: editId.value || undefined, attachments })
    successMsg('保存成功')
    router.push({ name: 'demo-list' })
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  router.back()
}

onMounted(() => {
  // 真实编辑场景应按 editId 拉取回填，此处模板仅演示新建/编辑标题切换。
})
</script>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供 */
.form-view-page {
  display: flex;
  flex-direction: column;
}

/* PageHeader 通栏：负 margin 顶掉内容区左边距，与侧边栏零间隙 */
.form-view-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上内边距；右侧沿用布局内容内边距；下边距为固定底部操作栏预留空间；
 * 左内边距由 basic-layout__content 提供 */
.form-view {
  /* 表单列与底部操作栏共用的最大宽度，保证 arco-space 与 form-view__form 宽度一致 */
  --form-view-max-width: 720px;

  /* Positioning */
  display: flex;
  flex-direction: column;
  gap: var(--card-gap); /* 步骤卡、表单卡与操作区间距 */

  /* Box Model - 下边距为固定底部操作栏预留空间，避免遮挡表单末项 */
  padding-top: var(--card-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--spacing-2xl);
}

.form-view__steps {
  /* Positioning - 与表单卡片同宽居中 */
  align-self: center;

  /* Box Model */
  box-sizing: border-box;
  width: 100%;
  max-width: var(--form-view-max-width);
  padding: var(--spacing-md) var(--spacing-lg);

  /* Visual */
  background: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

/* 表单区：max 720px，水平居中（规范 §新增/编辑页）；
 * 底部 56px 为固定操作栏预留，避免末项被挡住 */
.form-view__form-area {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-bottom: 56px;
}

.form-view__form {
  /* Box Model */
  box-sizing: border-box;
  width: 100%;
  max-width: var(--form-view-max-width);
  padding: var(--card-padding);

  /* Visual */
  background: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

/* 底部操作栏：水平内边距与内容区一致，内部列与表单同宽居中，按钮组对齐表单卡片右缘 */
.form-view__footer {
  /* Positioning */
  position: fixed;
  right: 0;
  bottom: 0;
  left: var(--form-footer-sider-width, 0);
  z-index: var(--z-sticky-bar);
  display: flex;
  justify-content: center;
  align-items: center;

  /* Box Model */
  padding: var(--spacing-lg) var(--layout-content-padding);
  border-top: var(--border-default);

  /* Visual */
  background: var(--color-bg-card);
}

.form-view__footer :deep(.arco-space) {
  /* Box Model - 与 form-view__form 同宽，超出时被 padding 收窄 */
  box-sizing: border-box;
  width: 100%;
  max-width: var(--form-view-max-width);

  /* Misc */
  justify-content: flex-end;
}
</style>
