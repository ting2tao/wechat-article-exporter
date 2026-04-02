<script setup lang="ts">
import CodeSegment from '~/components/api/CodeSegment.vue';

interface TParam {
  name: string;
  location: string;
  label: string;
  required: boolean;
  default: string;
  type: string;
  remark: string;
}

interface Props {
  index: number;
  name: string;
  description: string;
  url: string;
  method: string;
  params: TParam[];
  responseSample: any;
  remark?: string;
}
defineProps<Props>();

const open = ref(false);

const host = window.location.protocol + '//' + window.location.host;
</script>

<template>
  <div class="api-doc">
    <div class="api-doc__head">
      <h2 class="api-doc__title">
        <span class="api-doc__index">{{ index }}</span>
        <span>{{ name }}</span>
      </h2>
      <ApiDebugModal :initial-selected="name" />
    </div>

    <div class="api-doc__section">
      <p class="api-doc__label">简要描述</p>
      <p class="api-doc__copy">{{ description }}</p>
    </div>
    <div v-if="remark" class="api-doc__section">
      <p class="api-doc__label">备注</p>
      <p class="api-doc__remark">{{ remark }}</p>
    </div>
    <div class="api-doc__section">
      <p class="api-doc__label">请求 URL</p>
      <p class="api-doc__code">
        <span class="api-doc__host">{{ host }}</span>
        <span class="font-semibold">{{ url }}</span>
      </p>
    </div>
    <div class="api-doc__section">
      <p class="api-doc__label">请求方式</p>
      <p class="api-doc__code">{{ method }}</p>
    </div>
    <div class="api-doc__section">
      <p class="api-doc__label">参数</p>
      <div class="api-doc__table-wrap">
        <table class="api-doc__table">
          <thead>
            <tr>
              <th>参数名</th>
              <th>参数位置</th>
              <th>强制</th>
              <th>默认值</th>
              <th>类型</th>
              <th>说明</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in params" :key="p.name">
              <td>{{ p.name }}</td>
              <td>{{ p.location }}</td>
              <td>{{ p.required ? '是' : '否' }}</td>
              <td>{{ p.default }}</td>
              <td>{{ p.type }}</td>
              <td>{{ p.label }}</td>
              <td>{{ p.remark }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="api-doc__section">
      <p class="api-doc__toggle">
        <span>返回示例</span>
        <UToggle v-model="open" color="blue" on-icon="i-heroicons:eye" off-icon="i-heroicons:eye-slash" />
      </p>
      <CodeSegment v-if="open" :code="responseSample" lang="json" />
    </div>
  </div>
</template>

<style scoped>
.api-doc {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-doc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.api-doc__title {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #0f172a;
  font-size: 1.35rem;
  font-weight: 700;
}

.api-doc__index {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.72rem;
  background: rgba(241, 245, 249, 0.9);
  font-size: 0.88rem;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.api-doc__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.api-doc__label {
  color: rgba(15, 23, 42, 0.56);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.api-doc__copy {
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.75;
}

.api-doc__remark {
  color: #be123c;
  font-weight: 600;
}

.api-doc__code {
  overflow-x: auto;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.85rem;
  padding: 0.7rem 0.8rem;
  background: rgba(248, 250, 252, 0.92);
  color: #0f172a;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.api-doc__host {
  color: rgba(15, 23, 42, 0.38);
}

.api-doc__table-wrap {
  overflow: hidden;
  overflow-x: auto;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.85rem;
}

.api-doc__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 48rem;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.api-doc__table th,
.api-doc__table td {
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 0.68rem;
  text-align: center;
}

.api-doc__table thead {
  background: rgba(241, 245, 249, 0.9);
}

.api-doc__table tr:nth-child(even) {
  background: rgba(248, 250, 252, 0.82);
}

.api-doc__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
