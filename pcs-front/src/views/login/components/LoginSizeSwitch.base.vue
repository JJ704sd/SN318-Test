<template>
  <div class="login-size-switch">
    <p id="login-size-switch-label" class="login-size-switch__legend">面板尺寸</p>
    <div
      class="login-size-switch__list"
      role="radiogroup"
      aria-labelledby="login-size-switch-label"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="login-size-switch__option"
        :class="{ 'is-active': modelValue === option.value }"
        role="radio"
        :aria-checked="modelValue === option.value"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export type LoginPanelSize = 'standard' | 'wide'

withDefaults(
  defineProps<{
    modelValue: LoginPanelSize
  }>(),
  {
    modelValue: 'standard',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: LoginPanelSize): void
}>()

const options: { value: LoginPanelSize; label: string }[] = [
  { value: 'standard', label: '标准型 400' },
  { value: 'wide', label: '宽版型 640' },
]
</script>

<style scoped>
.login-size-switch {
  /* Positioning */
  position: fixed;
  right: var(--spacing-lg);
  bottom: var(--spacing-lg);
  z-index: var(--z-login-size-switch);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  /* Box Model */
  box-sizing: border-box;
  width: var(--login-size-switch-width);
  margin: 0;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-default);

  /* Visual */
  background: var(--color-bg-card);
  box-shadow: var(--shadow-md);
}

.login-size-switch__legend {
  /* Box Model */
  margin: 0;
  padding: 0 var(--spacing-xs);

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}

.login-size-switch__list {
  /* Positioning */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.login-size-switch__option {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  box-sizing: border-box;
  width: 100%;
  height: var(--login-size-switch-option-height);
  margin: 0;
  padding: 0 var(--spacing-sm);
  border: 0;
  border-radius: var(--border-radius-default);

  /* Typographic */
  font-size: var(--font-size-sm);
  line-height: 1;
  color: var(--color-text-body);
  text-align: left;

  /* Visual */
  background: transparent;

  /* Misc */
  cursor: pointer;
  transition: background-color var(--duration-state) var(--ease-state);
}

.login-size-switch__option:hover {
  background: var(--color-bg-surface);
}

.login-size-switch__option.is-active {
  /* Typographic */
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);

  /* Visual */
  background: var(--color-primary-50);
}
</style>
