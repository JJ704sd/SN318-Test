<template>
  <section class="section">
    <h2 class="section__title">⑭ 消息提示（message / notify / confirm 三者分流）</h2>

    <ByCard title="Toast 轻提示（一句话反馈 · message）" class="section__card">
      <a-space wrap>
        <a-button type="primary" @click="successMsg('保存成功')">success 成功</a-button>
        <a-button @click="warningMsg('请先填写必填项')">warning 警告</a-button>
        <a-button status="danger" @click="errorMsg('保存失败，请稍后重试')">error 错误</a-button>
        <a-button @click="infoMsg('这是一条信息提示')">info 信息</a-button>
      </a-space>
      <p class="section__hint">顶部居中 / 3 秒自动消失 / 浅底 + 主色 30% 描边 + 主色圆底白符号图标 + 主色文字。</p>
    </ByCard>

    <ByCard title="Notification 通知提醒框（异步消息 · notify）" class="section__card">
      <a-space wrap>
        <a-button type="primary" @click="onNotifySuccess">异步任务完成</a-button>
        <a-button @click="onNotifyWarning">系统警告</a-button>
        <a-button status="danger" @click="onNotifyError">任务失败</a-button>
        <a-button @click="onNotifyWithAction">带操作按钮</a-button>
      </a-space>
      <p class="section__hint">右上角滑入 / 约 4.5 秒或手动关闭 / 白底卡片 + shadow-md / 承载标题 + 正文 + 操作。</p>
    </ByCard>

    <ByCard title="确认弹窗（不可逆操作 · confirmAction）" class="section__card">
      <a-space wrap>
        <a-button @click="onConfirmNormal">普通确认</a-button>
        <a-button status="danger" @click="onConfirmDanger">危险确认（删除）</a-button>
      </a-space>
      <p class="section__hint">屏幕居中遮罩 / 左侧语义色 icon + 右侧标题 + 说明文字 / 取消在左、确认在右。</p>
    </ByCard>

    <a-alert type="warning" show-icon>一句话走 Toast / 标题+正文走 Notify / 不可逆操作走 Confirm；三者分流不混用。</a-alert>

    <PropsDoc :groups="MESSAGE_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard, successMsg, warningMsg, errorMsg, infoMsg, notify, confirmAction } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { MESSAGE_PROP_GROUPS } from '../propDoc'

function onNotifySuccess() {
  notify({ type: 'success', title: '导入完成', content: '已成功导入 86 条运单记录。' })
}

function onNotifyWarning() {
  notify({ type: 'warning', title: '存储空间告警', content: '剩余存储不足 10%，请及时清理。' })
}

function onNotifyError() {
  notify({ type: 'error', title: '同步失败', content: '与运单系统同步失败，已自动重试 3 次。' })
}

function onNotifyWithAction() {
  notify({
    type: 'info',
    title: '导出已就绪',
    content: '运单报表已生成，点击下载。',
    actions: [{ label: '下载', onClick: () => infoMsg('开始下载') }],
  })
}

async function onConfirmNormal() {
  const ok = await confirmAction({
    title: '确认提交',
    content: '提交后不可修改运单号，是否继续？',
  })
  if (ok) successMsg('提交成功')
}

async function onConfirmDanger() {
  const ok = await confirmAction({
    title: '删除运单',
    content: '确认删除 BY10000001？删除后不可恢复。',
    danger: true,
  })
  if (ok) successMsg('删除成功')
}

const code = `successMsg('保存成功')
warningMsg('请先填写必填项')
errorMsg('保存失败，请稍后重试')
infoMsg('信息提示')

notify({
  type: 'success',
  title: '导入完成',
  content: '已成功导入 86 条运单记录。',
  actions: [{ label: '下载', onClick: () => infoMsg('开始下载') }],
})

const ok = await confirmAction({
  title: '删除运单',
  content: '确认删除？删除后不可恢复。',
  danger: true,
})
if (ok) successMsg('删除成功')`
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

</style>
