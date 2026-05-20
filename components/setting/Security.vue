<script setup lang="ts">
const { authState } = useAppAuth();
</script>

<template>
  <UCard class="setting-card">
    <template #header>
      <div class="setting-card__header">
        <div class="setting-card__header-copy">
          <p class="setting-card__eyebrow">Security</p>
          <h3 class="setting-card__title">登录状态</h3>
        </div>
        <div class="setting-card__badge">{{ authState.authenticated ? '已登录' : '未登录' }}</div>
      </div>
    </template>

    <div class="setting-card__info">
      <p class="setting-card__desc">
        系统通过微信公众号扫码登录，无需单独的账号密码。扫码登录后，<code>auth-key</code> cookie 即为访问凭证。
      </p>
      <div v-if="authState.authenticated" class="setting-card__status">
        <span class="setting-card__label">当前身份</span>
        <span class="setting-card__value">{{ authState.username }}</span>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.setting-card {
  margin: 0;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.95rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 249, 255, 0.92) 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.setting-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.setting-card__header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.setting-card__eyebrow {
  color: rgba(15, 23, 42, 0.44);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__title {
  color: #111111;
  font-size: 1.05rem;
  font-weight: 700;
}

.setting-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 999px;
  padding: 0.1rem 0.72rem;
  background: rgba(239, 246, 255, 0.86);
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-card__desc {
  color: rgba(15, 23, 42, 0.6);
  font-size: 0.88rem;
  line-height: 1.6;
}

.setting-card__desc code {
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  background: rgba(15, 23, 42, 0.05);
  font-size: 0.82rem;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}

.setting-card__status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.03);
}

.setting-card__label {
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.82rem;
}

.setting-card__value {
  color: #111111;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
}
</style>
