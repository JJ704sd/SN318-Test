<template>
  <ByEmpty v-if="hasError" preset="error" :description="description">
    <template #action>
      <a-button type="primary" @click="retry">重试</a-button>
    </template>
  </ByEmpty>
  <slot v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import ByEmpty from './ByEmpty/ByEmpty.vue'

withDefaults(
  defineProps<{
    // 降级异常态的描述文案，缺省用 ByEmpty error 预设的默认描述
    description?: string
  }>(),
  {
    description: undefined,
  },
)

const emit = defineEmits<{
  (e: 'error', err: unknown): void
}>()

const hasError = ref(false)

// onErrorCaptured 仅捕获同步渲染 / 生命周期错误；异步错误（Promise、setTimeout、事件回调）
// 不会冒泡到此，需在请求封装或调用处自行 try/catch 处理。
onErrorCaptured((err) => {
  hasError.value = true
  emit('error', err)
  return false
})

function retry() {
  hasError.value = false
}
import { Button as AButton } from '@arco-design/web-vue'
</script>
