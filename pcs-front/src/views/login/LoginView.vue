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

    <section
      class="login-panel"
      :class="{ 'login-panel--wide': panelSize === 'wide' }"
      aria-label="登录"
    >
      <div
        v-if="panelSize === 'wide'"
        class="login-panel__mode-tabs"
        role="tablist"
        aria-label="登录方式"
      >
        <button
          type="button"
          class="login-panel__mode-tab"
          :class="{ 'is-active': mobileMode === 'account' }"
          role="tab"
          :aria-selected="mobileMode === 'account'"
          @click="mobileMode = 'account'"
        >
          账号登录
        </button>
        <button
          type="button"
          class="login-panel__mode-tab"
          :class="{ 'is-active': mobileMode === 'qr' }"
          role="tab"
          :aria-selected="mobileMode === 'qr'"
          @click="mobileMode = 'qr'"
        >
          扫码登录
        </button>
      </div>

      <div class="login-panel__body" :class="{ [`is-mobile-${mobileMode}`]: panelSize === 'wide' }">
        <aside v-if="panelSize === 'wide'" class="login-panel__qr">
          <LoginQrScan />
        </aside>
        <div v-if="panelSize === 'wide'" class="login-panel__divider" aria-hidden="true" />
        <div class="login-panel__main">
          <LoginAccountPanel />
        </div>
      </div>
    </section>

    <LoginSizeSwitch v-model="panelSize" />
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LoginAccountPanel from './components/LoginAccountPanel.biz.vue'
import LoginQrScan from './components/LoginQrScan.biz.vue'
import LoginSizeSwitch, { type LoginPanelSize } from './components/LoginSizeSwitch.base.vue'

const panelSize = ref<LoginPanelSize>('standard')
const mobileMode = ref<'account' | 'qr'>('account')

watch(panelSize, () => {
  mobileMode.value = 'account'
})
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

.login-panel--wide {
  width: var(--login-panel-width-wide);
}

.login-panel__mode-tabs {
  /* Positioning */
  display: none;
}

.login-panel__body {
  /* Positioning */
  display: block;
}

.login-panel--wide .login-panel__body {
  /* Positioning */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;

  /* Box Model */
  gap: 0 var(--spacing-lg);
}

.login-panel__divider {
  /* Box Model */
  width: 1px;
  margin: var(--spacing-sm) 0;

  /* Visual */
  background: var(--color-divider);
}

.login-panel__qr,
.login-panel__main {
  min-width: 0;
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

  .login-panel--wide .login-panel__mode-tabs {
    /* Positioning */
    display: grid;
    grid-template-columns: 1fr 1fr;

    /* Box Model */
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-default);
    gap: var(--spacing-xs);

    /* Visual */
    background: var(--color-bg-surface);
  }

  .login-panel__mode-tab {
    /* Positioning */
    display: inline-flex;
    align-items: center;
    justify-content: center;

    /* Box Model */
    height: var(--login-control-height);
    border: 0;
    border-radius: var(--border-radius-default);

    /* Typographic */
    font-size: var(--font-size-base);
    color: var(--color-text-body);

    /* Visual */
    background: transparent;

    /* Misc */
    cursor: pointer;
  }

  .login-panel__mode-tab.is-active {
    /* Typographic */
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);

    /* Visual */
    background: var(--color-bg-card);
    box-shadow: var(--shadow-sm);
  }

  .login-panel--wide .login-panel__body {
    /* Positioning */
    display: block;
  }

  .login-panel--wide .login-panel__divider {
    display: none;
  }

  .login-panel--wide .login-panel__body.is-mobile-account .login-panel__qr {
    display: none;
  }

  .login-panel--wide .login-panel__body.is-mobile-qr .login-panel__main {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-panel {
    animation: none;
  }
}
</style>
