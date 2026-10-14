import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface PermissionProfileSnapshot {
  subject: string
  systemCode: string
  environment: string
  permissionVersion: string
  resourceIds: string[]
  ttlSeconds: number
}

export const usePermissionStore = defineStore('permission', () => {
  const loaded = ref(false)
  const loading = ref(false)
  const subject = ref('')
  const systemCode = ref('')
  const environment = ref('')
  const permissionVersion = ref('')
  const resourceIds = ref<string[]>([])
  const ttlSeconds = ref(0)
  const lastError = ref<unknown>(null)

  const resourceSet = computed(() => new Set(resourceIds.value))

  function applyProfile(profile: PermissionProfileSnapshot): void {
    loaded.value = true
    subject.value = profile.subject
    systemCode.value = profile.systemCode
    environment.value = profile.environment
    permissionVersion.value = profile.permissionVersion
    resourceIds.value = profile.resourceIds
    ttlSeconds.value = profile.ttlSeconds
    lastError.value = null
  }

  function setLoading(value: boolean): void {
    loading.value = value
  }

  function setError(error: unknown): void {
    loaded.value = false
    lastError.value = error
  }

  /**
   * 判断单个权限码是否拥有。
   * - 传入空字符串 / undefined 时返回 true（不限制）
   * - 未加载完成时返回 false
   */
  function can(resourceId?: string): boolean {
    if (!resourceId) return true
    return resourceSet.value.has(resourceId)
  }

  /**
   * 判断权限码列表是否拥有任意一个。
   * - 空数组返回 true（不限制）
   * - 未加载完成时返回 false
   */
  function canAny(resourceIdList: string[]): boolean {
    if (resourceIdList.length === 0) return true
    return resourceIdList.some((resourceId) => can(resourceId))
  }

  function clear(): void {
    loaded.value = false
    loading.value = false
    subject.value = ''
    systemCode.value = ''
    environment.value = ''
    permissionVersion.value = ''
    resourceIds.value = []
    ttlSeconds.value = 0
    lastError.value = null
  }

  return {
    loaded,
    loading,
    subject,
    systemCode,
    environment,
    permissionVersion,
    resourceIds,
    ttlSeconds,
    lastError,
    resourceSet,
    applyProfile,
    setLoading,
    setError,
    can,
    canAny,
    clear,
  }
})
