<template>
  <form class="login-form" novalidate @submit.prevent="onSubmit">
    <div v-if="errorMsg" class="login-form__alert" role="alert">
      <icon-exclamation-circle :size="16" />
      <span>{{ errorMsg }}</span>
    </div>

    <div class="login-form__field" :class="{ 'is-error': fieldErrors.account }">
      <label class="login-form__label" for="login-account">账号</label>
      <div class="login-form__input-wrap" :class="{ 'is-error': fieldErrors.account }">
        <icon-user class="login-form__lead-icon" :size="16" />
        <input
          id="login-account"
          v-model="form.account"
          type="text"
          autocomplete="username"
          placeholder="请输入工号 / 邮箱"
          @input="clearFieldError('account')"
        />
      </div>
      <p v-if="fieldErrors.account" class="login-form__field-error">{{ fieldErrors.account }}</p>
    </div>

    <div class="login-form__field" :class="{ 'is-error': fieldErrors.password }">
      <label class="login-form__label" for="login-password">密码</label>
      <div class="login-form__input-wrap" :class="{ 'is-error': fieldErrors.password }">
        <icon-lock class="login-form__lead-icon" :size="16" />
        <input
          id="login-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="请输入密码"
          @input="clearFieldError('password')"
        />
        <button
          type="button"
          class="login-form__eye"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
          @click="showPassword = !showPassword"
        >
          <icon-eye-invisible v-if="showPassword" :size="16" />
          <icon-eye v-else :size="16" />
        </button>
      </div>
      <p v-if="fieldErrors.password" class="login-form__field-error">{{ fieldErrors.password }}</p>
    </div>

    <LoginSliderVerify />

    <div class="login-form__row">
      <label class="login-form__remember">
        <input v-model="form.remember" type="checkbox" class="login-form__checkbox" />
        记住密码
      </label>
      <a class="login-form__forgot" href="#" @click.prevent>忘记密码？</a>
    </div>

    <button type="submit" class="login-form__submit" :class="{ 'is-loading': submitting }">
      <icon-loading v-if="submitting" class="login-form__spin" :size="16" />
      <span>{{ submitting ? '登录中…' : '登录' }}</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@baiyun/template-core/stores'
import { getSession, setCsrfToken } from '@baiyun/template-core/auth'
import { env } from '@baiyun/template-core/config'
import LoginSliderVerify from './LoginSliderVerify.base.vue'

interface LoginFormState {
  account: string
  password: string
  remember: boolean
}

const router = useRouter()
const userStore = useUserStore()

const form = reactive<LoginFormState>({
  account: '',
  password: '',
  remember: true,
})
const fieldErrors = reactive<{ account: string; password: string }>({
  account: '',
  password: '',
})
const showPassword = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

function clearFieldError(field: 'account' | 'password') {
  fieldErrors[field] = ''
  errorMsg.value = ''
}

function validate(): boolean {
  let ok = true
  fieldErrors.account = ''
  fieldErrors.password = ''
  errorMsg.value = ''

  if (!form.account.trim()) {
    fieldErrors.account = '请输入账号'
    ok = false
  }
  if (!form.password.trim()) {
    fieldErrors.password = '请输入密码'
    ok = false
  }
  return ok
}

async function onSubmit() {
  if (!validate()) return

  submitting.value = true
  errorMsg.value = ''
  try {
    // mock 模式：调 mockLogin 写入 mockSession -> getSession 同步 userStore + 写 CSRF cookie -> 跳回原路径
    // 真实模式下不会走到此页（路由守卫直接 login() 整页跳 /auth/login）。
    // mockLogin 仅在 mock 分支动态加载，useMockAuth=false 时不把认证 Mock chunk 带进登录页。
    if (env.useMockAuth) {
      const { mockLogin } = await import('@/mock/auth')
      await mockLogin(form.account.trim(), form.password)
    }
    const session = await getSession()
    if (session.authenticated) {
      userStore.setUserInfo(session.identity)
      setCsrfToken(session.csrf_token)
    }
    await router.push('/')
  } catch {
    errorMsg.value = '账号或密码错误，请重新输入'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped src="./LoginForm.biz.css"></style>
