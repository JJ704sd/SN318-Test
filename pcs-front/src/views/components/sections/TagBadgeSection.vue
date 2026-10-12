<template>
  <section class="section">
    <h2 class="section__title">⑬ 标签 Tag / Badge</h2>

    <ByCard title="语义状态 Tag（5 态 · ByStatusTag）" class="section__card">
      <div class="tag-row">
        <ByStatusTag status="default" text="中性" />
        <ByStatusTag status="processing" text="进行中" />
        <ByStatusTag status="success" text="成功" />
        <ByStatusTag status="warning" text="警告" />
        <ByStatusTag status="error" text="错误" />
      </div>
      <div class="tag-row">
        <span class="tag-row__label">small 尺寸：</span>
        <ByStatusTag status="default" text="中性" size="small" />
        <ByStatusTag status="processing" text="进行中" size="small" />
        <ByStatusTag status="success" text="成功" size="small" />
        <ByStatusTag status="warning" text="警告" size="small" />
        <ByStatusTag status="error" text="错误" size="small" />
      </div>
      <p class="section__hint">浅底 + 深字 + 描边（字色 20% 透明度）；高 22 / 字 12；small 高 18 / 字 10。</p>
    </ByCard>

    <ByCard title="业务类型 Tag（7 类 · ByBizTag）" class="section__card">
      <div class="tag-row">
        <ByBizTag type="express" />
        <ByBizTag type="air" />
        <ByBizTag type="fba" />
        <ByBizTag type="line" />
        <ByBizTag type="sea" />
        <ByBizTag type="pickup" />
        <ByBizTag type="inquiry" />
      </div>
      <div class="tag-row">
        <span class="tag-row__label">small 尺寸：</span>
        <ByBizTag type="express" size="small" />
        <ByBizTag type="air" size="small" />
        <ByBizTag type="fba" size="small" />
        <ByBizTag type="line" size="small" />
        <ByBizTag type="sea" size="small" />
        <ByBizTag type="pickup" size="small" />
        <ByBizTag type="inquiry" size="small" />
      </div>
      <p class="section__hint">浅底 + 深字，无描边（与状态 Tag 形态区分）；快递复用主色阶。</p>
    </ByCard>

    <ByCard title="Badge 红点 / 数字" class="section__card">
      <div class="badge-row">
        <a-badge :count="5">
          <a-button>待处理</a-button>
        </a-badge>
        <a-badge :count="99">
          <a-button>未读消息</a-button>
        </a-badge>
        <a-badge :count="100" :max-count="99">
          <a-button>超 99</a-button>
        </a-badge>
        <a-badge dot>
          <a-button>红点提示</a-button>
        </a-badge>
      </div>
      <p class="section__hint">红点 8px / 计数角标最小 16×16 / 三位数起胶囊 / 底色 --color-error / 超 99 显「99+」。</p>
    </ByCard>

    <a-alert type="warning" show-icon>颜色 + 文字双表达，禁止只用颜色；状态 Tag 有描边、业务 Tag 无描边；Badge 仅用 --color-error。</a-alert>

    <PropsDoc :groups="TAG_BADGE_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard, ByStatusTag, ByBizTag } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { TAG_BADGE_PROP_GROUPS } from '../propDoc'

const code = `<ByStatusTag status="success" text="成功" />
<ByStatusTag status="warning" text="警告" size="small" />

<ByBizTag type="express" />
<ByBizTag type="air" size="small" />

<a-badge :count="5">
  <a-button>待处理</a-button>
</a-badge>
<a-badge dot>
  <a-button>红点提示</a-button>
</a-badge>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.section__hint {
  margin: var(--spacing-sm) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.tag-row__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-lg);
}
</style>
