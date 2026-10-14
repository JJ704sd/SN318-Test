<template>
  <div class="components-showcase-page">
    <PageHeader type="standard" title="基础组件" />

    <div class="components-showcase">
    <div class="components-showcase__layout">
      <aside class="components-showcase__aside">
        <a-anchor :change-hash="false">
          <a-anchor-link
            v-for="item in anchorItems"
            :key="item.key"
            :href="item.href"
            :title="item.title"
          />
        </a-anchor>
      </aside>

      <main class="components-showcase__main">
        <ButtonSection id="button" />
        <InputSection id="input" />
        <SelectorSection id="selector" />
        <RadioSection id="radio" />
        <CheckboxSection id="checkbox" />
        <UploadSection id="upload" />
        <FormSection id="form" />
        <TableSection id="table" />
        <CardSection id="card" />
        <ModalSection id="modal" />
        <DrawerSection id="drawer" />
        <AlertSection id="alert" />
        <TagBadgeSection id="tag-badge" />
        <MessageSection id="message" />
        <TooltipSection id="tooltip" />
        <PopoverSection id="popover" />
        <RichTextSection id="rich-text" />
      </main>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// utilities.css 仅供组件展示页工具类使用，随本页懒加载注入，不进主包
import '@core/styles/utilities.css'
import PageHeader from '@/layout/components/PageHeader.vue'
import ButtonSection from './sections/ButtonSection.vue'
import InputSection from './sections/InputSection.vue'
import SelectorSection from './sections/SelectorSection.vue'
import RadioSection from './sections/RadioSection.vue'
import CheckboxSection from './sections/CheckboxSection.vue'
import UploadSection from './sections/UploadSection.vue'
import FormSection from './sections/FormSection.vue'
import TableSection from './sections/TableSection.vue'
import CardSection from './sections/CardSection.vue'
import ModalSection from './sections/ModalSection.vue'
import DrawerSection from './sections/DrawerSection.vue'
import AlertSection from './sections/AlertSection.vue'
import TagBadgeSection from './sections/TagBadgeSection.vue'
import MessageSection from './sections/MessageSection.vue'
import TooltipSection from './sections/TooltipSection.vue'
import PopoverSection from './sections/PopoverSection.vue'
import RichTextSection from './sections/RichTextSection.vue'

interface AnchorItem {
  key: string
  href: string
  title: string
}

const anchorItems: AnchorItem[] = [
  { key: 'button', href: '#button', title: '① 按钮 Button' },
  { key: 'input', href: '#input', title: '② 输入框 Input' },
  { key: 'selector', href: '#selector', title: '③ 选择器 Selector' },
  { key: 'radio', href: '#radio', title: '④ 单选 Radio' },
  { key: 'checkbox', href: '#checkbox', title: '⑤ 多选 Checkbox' },
  { key: 'upload', href: '#upload', title: '⑥ 上传 Upload' },
  { key: 'form', href: '#form', title: '⑦ 表单 Form' },
  { key: 'table', href: '#table', title: '⑧ 表格 Table' },
  { key: 'card', href: '#card', title: '⑨ 卡片 Card' },
  { key: 'modal', href: '#modal', title: '⑩ 弹窗 Modal' },
  { key: 'drawer', href: '#drawer', title: '⑪ 抽屉 Drawer' },
  { key: 'alert', href: '#alert', title: '⑫ Alert 提示框' },
  { key: 'tag-badge', href: '#tag-badge', title: '⑬ 标签 Tag/Badge' },
  { key: 'message', href: '#message', title: '⑭ 消息提示' },
  { key: 'tooltip', href: '#tooltip', title: '⑮ Tooltip' },
  { key: 'popover', href: '#popover', title: '⑯ Popover' },
  { key: 'rich-text', href: '#rich-text', title: '⑰ 富文本 RichText' },
]
</script>

<style>
/* Arco 默认给 .arco-layout-has-sider > .arco-layout-content 设 overflow-x: hidden，
   按规范会隐式触发 overflow-y: auto，使 content 成为 sticky 容器而它本身不滚动，
   导致 aside 的 sticky 失效、跟随页面被滚走。overflow-x: clip 同样裁剪横向溢出，
   但不创建 scroll container，sticky 重新粘到 window。:has 限定仅本页生效。 */
.arco-layout-has-sider > .arco-layout-content:has(.components-showcase) {
  overflow-x: clip;
}
</style>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供 */
.components-showcase-page {
  display: flex;
  flex-direction: column;
}

/* PageHeader 通栏：负 margin 顶掉内容区左边距，与侧边栏零间隙 */
.components-showcase-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上/右/下内边距（Desktop 24 / Tablet 16 / Mobile 12，随断点 token） */
.components-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg); /* §3 模块间距 lg，当前唯一子元素为 __layout */

  padding-top: var(--layout-content-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--layout-content-padding);
}

.components-showcase__layout {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.components-showcase__aside {
  position: sticky;
  top: calc(var(--layout-header-height) + var(--spacing-md));

  flex: 0 0 200px;
  max-height: calc(100vh - var(--layout-header-height) - var(--spacing-lg));
  padding: var(--spacing-md);

  border: var(--border-default);
  border-radius: var(--border-radius-card);
  background: var(--color-bg-card);
  overflow: auto;
}

.components-showcase__main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl); /* §3 页面区块间距 xl，堆叠 15 个展示区块 */

  flex: 1 1 auto;
  min-width: 0;
}

/* 选中态高亮：arco 默认仅文字变深+加粗、无背景；改为 primary 浅底 + primary 文字，
   使当前 section 在侧栏中更醒目。:deep 穿透 scoped 到 a-anchor 内部。 */
.components-showcase__aside :deep(.arco-anchor-link-active > .arco-anchor-link) {
  /* Typographic */
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);

  /* Visual */
  background-color: var(--color-primary-50);
}

@media (width <= 767px) {
  .components-showcase__layout {
    flex-direction: column;
  }

  /* 窄屏目录收起：mobile 无 hover，锚点目录意义有限，改为隐藏节省纵向空间 */
  .components-showcase__aside {
    display: none;
  }
}
</style>
