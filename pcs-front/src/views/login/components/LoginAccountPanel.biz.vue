<template>
  <div class="login-account">
    <div class="login-account__brand">
      <img class="login-account__logo" :src="LOGIN_LOGO" alt="" aria-hidden="true" />
      <span class="login-account__brand-name">
        百运科技
        <small>内部管理系统 SN318</small>
      </span>
    </div>

    <h1 class="login-account__welcome">欢迎登录</h1>
    <p class="login-account__sub">物流运营工作台 · 请使用企业账号登录</p>

    <LoginForm />
  </div>
</template>

<script setup lang="ts">
import LOGIN_LOGO from '@/assets/logo_login.svg'
import LoginForm from './LoginForm.biz.vue'
</script>

<style scoped>
.login-account__brand {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--login-brand-gap);
  margin-bottom: var(--spacing-lg);
}

.login-account__logo {
  /* Positioning */
  display: block;
  flex: none;

  /* Box Model */
  width: var(--login-brand-logo-size);
  height: var(--login-brand-logo-size);
  border-radius: var(--border-radius-default);
  object-fit: contain;
}

.login-account__brand-name {
  /* Typographic */
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  color: var(--color-text-title);
}

.login-account__brand-name small {
  /* Positioning */
  display: block;

  /* Typographic */
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
}

.login-account__welcome {
  /* Box Model */
  margin: 0 0 var(--spacing-xs);

  /* Typographic */
  font-size: var(--font-size-login-welcome);
  font-weight: var(--font-weight-medium);
  line-height: 1.35;
  color: var(--color-text-title);
}

.login-account__sub {
  /* Box Model */
  margin: 0 0 var(--spacing-lg);

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
