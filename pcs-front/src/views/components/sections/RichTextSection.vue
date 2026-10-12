<template>
  <section class="section">
    <h2 class="section__title">⑰ 富文本 RichText</h2>

    <ByCard title="安全富文本展示" class="section__card">
      <RichText :content="safeContent" />
    </ByCard>

    <ByCard title="恶意内容净化（脚本 / 事件 / 内联样式 / 危险协议被自动剥离）" class="section__card">
      <RichText :content="maliciousContent" />
    </ByCard>

    <ByCard title="保留内联样式（allow-inline-style）" class="section__card">
      <RichText :content="styledContent" allow-inline-style />
    </ByCard>

    <PropsDoc :groups="RICH_TEXT_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard } from '@baiyun/template-core/components'
import RichText from '@/components/base/RichText.base.vue'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { RICH_TEXT_PROP_GROUPS } from '../propDoc'

const safeContent = `
  <h3>富文本标题</h3>
  <p>这是<b>加粗</b>、<em>斜体</em>与<a href="https://example.com" target="_blank">新窗口链接</a>。</p>
  <ul>
    <li>列表项一</li>
    <li>列表项二</li>
  </ul>
  <pre><code>const greeting = 'hello'</code></pre>
`

// closingScript 用拼接拆开闭合标签：直写作字面串会误闭合 .vue 的 SFC script 块，
// 反斜杠转义又会触发 oxlint 的 no-useless-escape。
const closingScript = '</' + 'script>'

const maliciousContent = `
  <h3>恶意内容净化演示</h3>
  <p>以下片段会在渲染前被 <code>sanitizeHtml</code> 白名单清洗：</p>
  <script>alert('xss')${closingScript}
  <img src="x" onerror="alert('xss')" alt="带 onerror 的图片" />
  <a href="javascript:alert(1)" target="_blank">javascript: 协议链接</a>
  <p style="color: red">内联 style 属性被剥离</p>
`

const styledContent = `
  <p style="color: red">红色文字（内联 style 被保留）</p>
  <p style="text-align: center; font-weight: bold">居中加粗段落</p>
`

const code = `<!-- 常规富文本展示：渲染前自动清洗 -->
<RichText :content="content" />

<!-- 放行内联样式（颜色 / 字号 / 对齐），仍剔除脚本与危险 CSS -->
<RichText :content="content" allow-inline-style />`
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
