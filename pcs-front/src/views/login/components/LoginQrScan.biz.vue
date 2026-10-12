<template>
  <div class="login-qr">
    <div class="login-qr__title">
      <img class="login-qr__title-icon" :src="QY_WECHAT_LOGO" alt="" aria-hidden="true" />
      <span>企业微信扫码登录</span>
    </div>

    <img
      class="login-qr__image"
      :src="QR_IMAGE_URL"
      width="200"
      height="200"
      alt="企业微信登录二维码"
      decoding="async"
    />

    <p class="login-qr__hint">请使用企业微信扫描二维码登录</p>
  </div>
</template>

<script setup lang="ts">
import QY_WECHAT_LOGO from '@/assets/logo_qywx.svg'

/** 企业微信登录二维码图片地址。
 *  TODO: 临时占位——接入企业微信扫码登录后，替换为真实的二维码链接。 */
const QR_IMAGE_URL =
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=https%3A%2F%2Fwork.weixin.qq.com%2F'
</script>

<style scoped>
.login-qr {
  /* Positioning */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Box Model */
  height: 100%;
  text-align: center;
}

.login-qr__title {
  /* Positioning */
  display: inline-flex;
  align-items: center;

  /* Box Model */
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.login-qr__title-icon {
  /* Box Model */
  display: block;
  flex: none;
  width: 16px;
  height: 16px;

  /* SVG 原始比例为 16 × 14，避免按容器尺寸拉伸。 */
  object-fit: contain;
}

.login-qr__image {
  /* Box Model */
  width: var(--login-qr-size);
  height: var(--login-qr-size);

  /* Misc */
  object-fit: contain;
}

.login-qr__hint {
  /* Box Model */
  margin: var(--spacing-lg) 0 0;

  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
