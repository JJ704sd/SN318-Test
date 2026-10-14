<template>
  <main class="login-page">
    <img
      class="login-page__bg"
      src="@/assets/login_page.png"
      alt=""
      decoding="async"
      fetchpriority="high"
    />
    <div class="login-page__overlay" aria-hidden="true" />

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-panel__brand">
        <img class="login-panel__logo" :src="LOGIN_LOGO" alt="" aria-hidden="true" />
        <div class="login-panel__brand-copy">
          <strong>百运科技</strong>
          <span>内部管理系统 SN318</span>
        </div>
      </div>

      <h1 id="login-title" class="login-panel__title">欢迎登录</h1>
      <p class="login-panel__description">物流运营工作台 · 登录后进入基础配置</p>

      <div class="login-panel__actions">
        <button
          type="button"
          class="login-panel__submit"
          :disabled="!canOpenLogin"
          @click="handleAutoLogin"
        >
          <icon-loading v-if="loading && activeMode === 'auto'" :size="16" />
          <span>{{ loading && activeMode === 'auto' ? '正在自动登录…' : '自动登录' }}</span>
        </button>
        <button
          type="button"
          class="login-panel__manual"
          :disabled="!canOpenLogin"
          @click="handleManualLogin"
        >
          <icon-loading v-if="loading && activeMode === 'manual'" :size="16" />
          <span>{{ loading && activeMode === 'manual' ? '正在打开统一登录…' : '手动登录' }}</span>
        </button>
      </div>

      <p class="login-panel__hint">自动登录使用认证中心已有账号；手动登录可切换账号</p>
      <p v-if="errorMessage" class="login-panel__error" role="alert">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import LOGIN_LOGO from '@/assets/logo_login.svg'
import { useAuthCenterLogin } from './composables/useAuthCenterLogin'

const { loading, activeMode, errorMessage, canOpenLogin, handleAutoLogin, handleManualLogin } =
  useAuthCenterLogin()
</script>

<style scoped>
.login-page {
  /* Positioning */
  position: relative;
  display: grid;
  place-items: center;

  /* Box Model */
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--spacing-lg);

  /* Visual */
  background: var(--login-bg-fallback);

  /* Misc */
  overflow: hidden;
}

.login-page__bg {
  /* Positioning */
  position: absolute;
  inset: 0;
  z-index: var(--z-login-bg);

  /* Box Model */
  width: 100%;
  height: 100%;

  /* Misc */
  object-fit: cover;
  object-position: center;
}

.login-page__overlay {
  /* Positioning */
  position: absolute;
  inset: 0;
  z-index: var(--z-login-overlay);

  /* Visual */
  background:
    radial-gradient(75% 65% at 70% 46%, transparent 42%, var(--login-bg-vignette) 100%),
    linear-gradient(180deg, var(--login-bg-top-shade) 0%, var(--login-bg-mid-shade) 45%),
    var(--login-bg-overlay);
}

.login-panel {
  /* Positioning */
  position: relative;
  z-index: var(--z-login-panel);

  /* Box Model */
  width: var(--login-panel-width);
  max-width: 100%;
  padding: var(--login-panel-padding);
  border-radius: var(--border-radius-card);

  /* Visual */
  background: var(--color-bg-card);
  box-shadow: var(--shadow-lg);

  /* Misc */
  animation: login-panel-in var(--duration-login-panel) var(--ease-card);
}

.login-panel__brand {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--login-brand-gap);
  margin-bottom: var(--spacing-lg);
}

.login-panel__logo {
  /* Positioning */
  display: block;
  flex: none;

  /* Box Model */
  width: var(--login-brand-logo-size);
  height: var(--login-brand-logo-size);
  border-radius: var(--border-radius-default);

  /* Misc */
  object-fit: contain;
}

.login-panel__brand-copy {
  /* Positioning */
  display: flex;
  flex-direction: column;

  /* Typographic */
  line-height: var(--line-height-h2);
}

.login-panel__brand-copy strong {
  /* Typographic */
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.login-panel__brand-copy span {
  /* Typographic */
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.login-panel__title {
  /* Box Model */
  margin: 0 0 var(--spacing-xs);

  /* Typographic */
  font-size: var(--font-size-login-welcome);
  font-weight: var(--font-weight-medium);
  line-height: 1.35;
  color: var(--color-text-title);
}

.login-panel__description {
  /* Box Model */
  margin: 0 0 var(--spacing-lg);

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.login-panel__actions {
  /* Positioning */
  display: flex;
  flex-direction: column;

  /* Box Model */
  gap: var(--spacing-sm);
}

.login-panel__submit {
  /* Positioning */
  display: flex;
  align-items: center;
  justify-content: center;

  /* Box Model */
  width: 100%;
  min-height: var(--login-control-height);
  gap: var(--spacing-xs);
  padding: 0 var(--spacing-md);
  border: 0;
  border-radius: var(--border-radius-default);

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-on-overlay);

  /* Visual */
  background: var(--color-primary);

  /* Misc */
  cursor: pointer;
  transition: background-color var(--duration-state) var(--ease-state),
    box-shadow var(--duration-state) var(--ease-state);
}

.login-panel__manual {
  /* Positioning */
  display: flex;
  align-items: center;
  justify-content: center;

  /* Box Model */
  width: 100%;
  min-height: var(--login-control-height);
  gap: var(--spacing-xs);
  padding: 0 var(--spacing-md);
  border: var(--border-default);
  border-radius: var(--border-radius-default);

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-body);

  /* Visual */
  background: var(--color-bg-card);

  /* Misc */
  cursor: pointer;
  transition: background-color var(--duration-state) var(--ease-state),
    border-color var(--duration-state) var(--ease-state),
    box-shadow var(--duration-state) var(--ease-state);
}

.login-panel__submit:focus-visible,
.login-panel__manual:focus-visible {
  /* Visual */
  box-shadow: var(--shadow-focus);
  outline: none;
}

.login-panel__submit:disabled,
.login-panel__manual:disabled {
  /* Visual */
  opacity: 0.7;

  /* Misc */
  cursor: wait;
}

.login-panel__submit:hover:not(:disabled) {
  /* Visual */
  background: var(--color-primary-hover);
}

.login-panel__manual:hover:not(:disabled) {
  /* Visual */
  border-color: var(--color-text-secondary);
  background: var(--color-bg-surface);
}

.login-panel__hint {
  /* Box Model */
  margin: var(--spacing-md) 0 0;

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  color: var(--color-text-secondary);
  text-align: center;
}

.login-panel__error {
  /* Box Model */
  margin: var(--spacing-sm) 0 0;

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  color: var(--color-error);
  text-align: center;
}

@keyframes login-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (width <= 767px) {
  .login-page {
    /* Positioning */
    align-items: center;

    /* Box Model */
    padding: var(--spacing-md);
  }

  .login-page__bg {
    object-position: 72% 60%;
  }

  .login-panel {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-panel {
    animation: none;
  }
}
</style>
