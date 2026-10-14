<template>
  <span class="ai-avatar" :class="avatarClass">
    <img :src="src || defaultAvatar" :alt="alt" class="ai-avatar__img" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import defaultAvatar from '@core/assets/yunxiaoxing_avatar@3x.png'

/**
 * 运小星助手头像（实施方案任务 4.6 / 规范 §11.2）。
 *
 * 使用【全彩品牌形象】，区别于 AiTag 的单色四芒星标记（ai-sparkle 跟随 --color-ai）。
 * size 只接受预设档，尺寸固定走 --ai-avatar-size-* Token（禁止内联样式/裸值）；
 * 可传 src 覆盖为项目自有形象资产，缺省用内置全彩形象 yunxiaoxing_avatar@3x.png。
 */
type SizePreset = 'sm' | 'md' | 'lg'

interface Props {
  /** 尺寸预设档：sm/md/lg，映射 --ai-avatar-size-*。md=48px 对应悬浮入口规格（§11.2） */
  size?: SizePreset
  /** 自定义头像资产地址（图片）；不传用内置全彩占位形象 */
  src?: string
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  src: '',
  alt: '运小星',
})

const avatarClass = computed(() => `ai-avatar--${props.size}`)
</script>

<style scoped>
.ai-avatar {
  display: inline-flex;

  overflow: hidden;
  border-radius: 50%;
}

.ai-avatar--sm {
  width: var(--ai-avatar-size-sm);
  height: var(--ai-avatar-size-sm);
}

.ai-avatar--md {
  width: var(--ai-avatar-size-md);
  height: var(--ai-avatar-size-md);
}

.ai-avatar--lg {
  width: var(--ai-avatar-size-lg);
  height: var(--ai-avatar-size-lg);
}

.ai-avatar__img {
  width: 100%;
  height: 100%;

  object-fit: cover;
}
</style>
