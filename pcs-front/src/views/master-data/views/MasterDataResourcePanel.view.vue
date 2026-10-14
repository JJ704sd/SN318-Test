<template>
  <MasterDataPage
    :key="resourceKey"
    embedded
    :master-data-key="resourceKey"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MasterDataPage from './MasterDataPage.view.vue'
import { getMasterDataConfig, type MasterDataKey } from '../config'

const route = useRoute()

const resourceKey = computed<MasterDataKey>(() => {
  const config = getMasterDataConfig(String(route.query.resource ?? 'country'))
  return config?.key ?? 'country'
})
</script>
