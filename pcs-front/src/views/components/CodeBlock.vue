<template>
  <div class="code-block">
    <div class="code-block__header">
      <span class="code-block__lang">{{ lang }}</span>
      <a-button size="mini" type="text" @click="onCopy">
        <template #icon>
          <icon-check v-if="copied" />
          <icon-copy v-else />
        </template>
        {{ copied ? '已复制' : '复制' }}
      </a-button>
    </div>
    <pre class="code-block__pre"><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IconCopy, IconCheck } from '@arco-design/web-vue/es/icon'

interface Props {
  code: string
  lang?: string
}
const props = withDefaults(defineProps<Props>(), {
  lang: 'vue',
})

const copied = ref(false)

async function onCopy() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.code)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = props.code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 复制失败静默：用户可手动选择 <pre> 内文本复制
  }
}
</script>

<style scoped>
.code-block {
  /* Positioning */
  position: relative;

  /* Box Model */
  margin-top: var(--spacing-sm);
  border: var(--border-default);
  border-radius: var(--border-radius-default);

  /* Visual */
  background: var(--color-bg-surface);
}

.code-block__header {
  /* Positioning */
  display: flex;
  align-items: center;
  justify-content: space-between;

  /* Box Model */
  padding: var(--spacing-xs) var(--spacing-sm);
  border-bottom: var(--border-default);
}

.code-block__lang {
  /* Typographic */
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.code-block__pre {
  /* Box Model */
  margin: 0;
  padding: var(--spacing-sm);
  max-height: 320px;
  overflow: auto;

  /* Typographic */
  font-family: inherit;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-text-body);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
