<template>
  <!-- safeHtml 由 sanitizeHtml 白名单清洗（剔除脚本/事件/style），此处 v-html 为安全渲染 -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="rich-text" v-html="safeHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { sanitizeHtml } from '@/utils/html'

const props = withDefaults(
  defineProps<{
    content: string
    /** 是否放行内联 style（文字颜色/字号/对齐等）。默认 false 剥离；开启依赖 DOMPurify 洗掉危险 CSS。 */
    allowInlineStyle?: boolean
  }>(),
  { content: '', allowInlineStyle: false },
)

const safeHtml = computed(() => sanitizeHtml(props.content, { allowInlineStyle: props.allowInlineStyle }))
</script>

<style scoped lang="less">
.rich-text {
  /* Typographic */
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text-body);

  & :deep(p) {
    /* Box Model */
    margin: 0 0 var(--spacing-sm);
  }

  & :deep(p:last-child) {
    /* Box Model */
    margin-bottom: 0;
  }

  & :deep(h1),
  & :deep(h2),
  & :deep(h3),
  & :deep(h4),
  & :deep(h5),
  & :deep(h6) {
    /* Typographic */
    font-weight: 600;
    color: var(--color-text-title);
  }

  & :deep(h1),
  & :deep(h2) {
    /* Box Model */
    margin: var(--spacing-md) 0 var(--spacing-sm);
  }

  & :deep(h3),
  & :deep(h4),
  & :deep(h5),
  & :deep(h6) {
    /* Box Model */
    margin: var(--spacing-sm) 0 var(--spacing-xs);
  }

  & :deep(h1) {
    /* Typographic */
    font-size: 20px;
  }

  & :deep(h2) {
    /* Typographic */
    font-size: 18px;
  }

  & :deep(h3) {
    /* Typographic */
    font-size: 16px;
  }

  & :deep(ul),
  & :deep(ol) {
    /* Box Model */
    margin: 0 0 var(--spacing-sm);
    padding-left: 24px;
  }

  & :deep(li) {
    /* Box Model */
    margin: var(--spacing-xs) 0;
  }

  & :deep(a) {
    /* Typographic */
    color: var(--color-primary);

    /* Misc */
    text-decoration: underline;
  }

  & :deep(blockquote) {
    /* Box Model */
    margin: 0 0 var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);

    /* Visual */
    border-left: 3px solid var(--color-primary);
    border-radius: var(--border-radius-default);
  }

  & :deep(pre) {
    /* Box Model */
    margin: 0 0 var(--spacing-sm);
    padding: var(--spacing-md);

    /* Typographic */
    font-size: var(--font-size-sm);

    /* Visual */
    border: var(--border-default);
    border-radius: var(--border-radius-default);

    /* Misc */
    overflow-x: auto;
  }

  & :deep(code) {
    /* Visual */
    border-radius: var(--border-radius-default);
  }

  & :deep(pre) code {
    /* Box Model */
    padding: 0;

    /* Visual */
    border-color: transparent;
  }

  & :deep(img) {
    /* Box Model */
    max-width: 100%;
    height: auto;
  }

  & :deep(figure) {
    /* Box Model */
    margin: 0 0 var(--spacing-sm);
  }

  & :deep(table) {
    /* Box Model */
    width: 100%;
    margin: 0 0 var(--spacing-sm);
    border-collapse: collapse;
  }

  & :deep(th),
  & :deep(td) {
    /* Box Model */
    padding: var(--spacing-sm);

    /* Visual */
    border: 1px solid var(--color-border);
  }

  & :deep(hr) {
    /* Box Model */
    margin: var(--spacing-sm) 0;

    /* Visual */
    border: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>