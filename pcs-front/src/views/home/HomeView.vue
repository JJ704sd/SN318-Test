<template>
  <div class="home-view">
    <PageHeader
      type="full"
      title="基础配置"
      subtitle="统一维护主数据、计价基础数据和业务字典，为各业务模块提供标准化的选项与数据来源。"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/layout/components/PageHeader.vue'

const router = useRouter()

/** 保留旧的 home 路由名，入口统一落到真实的基础配置工作区。 */
onBeforeMount(() => {
  void router.replace({
    name: 'master-data-workspace',
    query: { group: 'location', resource: 'country' },
  })
})
</script>

<style scoped>
.home-view {
  min-width: 0;
}
</style>
