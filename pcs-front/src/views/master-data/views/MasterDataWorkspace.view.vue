<template>
  <div class="master-data-workspace">
    <PageHeader
      type="full"
      title="基础配置"
      subtitle="统一维护主数据、计价基础数据和业务字典，为各业务模块提供标准化的选项与数据来源。"
    >
      <template #tabs>
        <a-tabs class="master-data-workspace__sections" :active-key="activeSection?.title" @change="selectSection">
          <a-tab-pane v-for="section in visibleSections" :key="section.title" :title="section.title" />
        </a-tabs>
      </template>
    </PageHeader>

    <div class="master-data-workspace__content">
      <!-- 内容区选项切换：当前分类下的对象分组 -->
      <div class="master-data-workspace__groups">
        <a-button
          v-for="group in activeSection?.groups"
          :key="group.key"
          type="secondary"
          size="small"
          :class="{ 'is-active': group.key === activeGroup.key }"
          @click="selectGroup(group.key)"
        >
          {{ group.title }}
        </a-button>
      </div>

      <div class="master-data-workspace__intro">
        <strong>{{ activeGroup.title }}：</strong>
        <span>{{ activeGroupDescription }}</span>
      </div>

      <div class="master-data-workspace__body">
        <aside class="master-data-workspace__resources" aria-label="基础配置对象">
          <div class="master-data-workspace__resources-head">
            <div class="master-data-workspace__resources-title">配置对象</div>
            <div class="master-data-workspace__resources-hint">{{ activeGroup.title }} · 选择对象查看正式数据</div>
          </div>
          <button
            v-for="resource in activeGroup.resources"
            :key="resource"
            type="button"
            class="master-data-workspace__resource"
            :class="{ 'is-active': resource === activeResource }"
            :aria-current="resource === activeResource ? 'page' : undefined"
            @click="openResource(resource)"
          >
            {{ getMasterDataConfig(resource)?.title ?? resource }}
          </button>
        </aside>

        <main class="master-data-workspace__panel">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissionStore } from '@core/stores'
import PageHeader from '@/layout/components/PageHeader.vue'
import {
  getMasterDataConfig,
  getMasterDataGroup,
  MASTER_DATA_GROUPS,
  type MasterDataGroup,
  type MasterDataKey,
} from '../config'

interface NavigationSection {
  title: string
  groupKeys: MasterDataGroup['key'][]
}

const NAVIGATION_SECTIONS: NavigationSection[] = [
  { title: '主数据', groupKeys: ['dictionary', 'location', 'routing'] },
  { title: '计价底座', groupKeys: ['fee', 'finance'] },
]

const GROUP_DESCRIPTIONS: Record<MasterDataGroup['key'], string> = {
  location: '维护国家、地点、邮编及机场、港口、仓库等全球地点主数据。',
  dictionary: '维护承运商、运输方式、货物和包装等业务页面共享选项。',
  fee: '维护运费、操作费、附加费等成本价卡费用科目，供计价与费用页面统一引用。',
  finance: '维护币种与汇率，保证计价与费用页面引用统一的财务基础数据。',
  routing: '维护航线区域与 Zone 范围，供服务段和计价规则统一引用。',
}

const route = useRoute()
const router = useRouter()
const permissionStore = usePermissionStore()

const visibleGroups = computed(() => MASTER_DATA_GROUPS
  .map((group) => ({
    ...group,
    resources: group.resources.filter((resource) => permissionStore.can(`operation:pcs.front.${resource}.read`)),
  }))
  .filter((group) => group.resources.length > 0))

const visibleSections = computed(() => NAVIGATION_SECTIONS
  .map((section) => ({
    title: section.title,
    groups: section.groupKeys.flatMap((key) => {
      const group = visibleGroups.value.find((item) => item.key === key)
      return group ? [group] : []
    }),
  }))
  .filter((section) => section.groups.length > 0))

const activeResource = computed<MasterDataKey>(() => {
  const routeKey = route.meta.masterDataKey
  if (typeof routeKey === 'string' && getMasterDataConfig(routeKey)) return routeKey as MasterDataKey
  const queryKey = String(route.query.resource ?? 'country')
  const configuredKey = getMasterDataConfig(queryKey)?.key
  if (configuredKey && visibleGroups.value.some((group) => group.resources.includes(configuredKey))) return configuredKey
  return visibleGroups.value[0]?.resources[0] ?? 'country'
})

const defaultGroup = getDefaultGroup()
const activeGroup = computed<MasterDataGroup>(() => visibleGroups.value.find((group) => group.resources.includes(activeResource.value)) ?? defaultGroup)
const activeGroupDescription = computed(() => GROUP_DESCRIPTIONS[activeGroup.value.key])

/** 一级 Tab 的选中分类：由当前分组反查所属分类，URL 仍是单一事实来源 */
const activeSection = computed(() =>
  visibleSections.value.find((section) => section.groups.some((group) => group.key === activeGroup.value.key))
  ?? visibleSections.value[0])

function getDefaultGroup(): MasterDataGroup {
  const group = MASTER_DATA_GROUPS[0]
  if (!group) throw new Error('基础配置业务域不能为空')
  return group
}

function openResource(resource: MasterDataKey): void {
  const group = getMasterDataGroup(resource)
  if (!group) return
  void router.push({
    name: 'master-data-workspace',
    query: { group: group.key, resource },
  })
}

function openGroup(group: MasterDataGroup | undefined): void {
  const resource = group?.resources[0]
  if (resource) openResource(resource)
}

/** 一级 Tab 切换：落到该分类第一个分组的第一个对象 */
function selectSection(title: string | number): void {
  openGroup(visibleSections.value.find((section) => section.title === title)?.groups[0])
}

/** 内容区对象切换：落到该分组的第一个对象 */
function selectGroup(key: string | number): void {
  openGroup(visibleGroups.value.find((group) => group.key === key))
}
</script>

<style scoped>
.master-data-workspace {
  /* 工作区页头与原型一致，贴齐内容区左边缘；内部模块再保留页面内边距。 */
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.master-data-workspace__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);

  /* 页头有 Tab 时已去掉下内边距，这里补回内容与 Tab 下划线之间的间距 */
  padding: var(--spacing-md) var(--layout-content-padding) var(--spacing-2xl);
}

/* 页头一级 Tab 只作分类切换，不承载内容，隐藏 Arco 的空白内容区 */
.master-data-workspace :deep(.arco-tabs-content) {
  display: none;
}

/* 未选中态用标题色，与页头文字层级一致 */
.master-data-workspace :deep(.arco-tabs-tab:not(.arco-tabs-tab-active, .arco-tabs-tab-disabled)) {
  color: var(--color-text-title);
}

/* Tab 高度由 padding 决定（Arco 默认上下各 8px）：收到 4px，不再压得过扁 */
.master-data-workspace__sections :deep(.arco-tabs-nav-type-line .arco-tabs-tab) {
  padding: var(--spacing-xs) 0;
}

.master-data-workspace__sections :deep(.arco-tabs-nav::before) {
  display: none;
}

/* 内容区对象切换：普通按钮组 */
.master-data-workspace__groups {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

/* 选中态：字体与边框换主题色，底色沿用 secondary 的白底（对齐规范「描边 + 彩字」写法）；
   带上 :hover 是为了压过 .arco-btn-secondary:hover，避免悬停时掉回灰边 */
.master-data-workspace__groups :deep(.arco-btn.is-active),
.master-data-workspace__groups :deep(.arco-btn.is-active:hover) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.master-data-workspace__intro {
  padding: var(--spacing-md) var(--spacing-lg);

  font-size: var(--font-size-xs);
  line-height: var(--line-height-sm);
  color: var(--color-text-body);
  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-card);
}

.master-data-workspace__intro strong {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.master-data-workspace__body {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: var(--card-gap);
  min-height: 420px;
  min-width: 0;
}

.master-data-workspace__resources {
  display: flex;
  flex-direction: column;
  align-self: start;
  gap: var(--spacing-xs);
  overflow: hidden;
  padding: 0;
  padding-bottom: var(--spacing-sm);
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-card);
  box-shadow: var(--shadow-sm);
}

.master-data-workspace__resources-head {
  padding: var(--spacing-md);
  border-bottom: var(--border-divider);
}

.master-data-workspace__resources-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.master-data-workspace__resources-hint {
  margin-top: var(--spacing-xs);

  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}

.master-data-workspace__resource {
  border: 0;
  margin: 0 var(--spacing-sm);
  padding: var(--spacing-sm);
  font: inherit;
  text-align: left;
  color: var(--color-text-body);
  background-color: transparent;
  border-radius: var(--border-radius-default);
  cursor: pointer;
  transition: color var(--duration-state) var(--ease-state), background-color var(--duration-state) var(--ease-state);
}

.master-data-workspace__resource:hover,
.master-data-workspace__resource.is-active {
  color: var(--color-primary);
  background-color: var(--color-primary-50);
}

.master-data-workspace__panel {
  min-width: 0;
  background: var(--color-bg-page);
}

@media (width <= 767px) {
  .master-data-workspace__body {
    grid-template-columns: 1fr;
  }

  .master-data-workspace__resources {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .master-data-workspace__resources-head {
    grid-column: 1 / -1;
  }

  .master-data-workspace__resources-title {
    grid-column: 1 / -1;
  }
}
</style>
