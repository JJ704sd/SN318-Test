<template>
  <RouterView />
  <GlobalLoading />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import GlobalLoading from '@/layout/components/GlobalLoading.vue'
</script>
