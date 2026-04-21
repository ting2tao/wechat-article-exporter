# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

微信公众号文章批量下载导出工具。技术栈为 Nuxt 3（SPA，SSR 关闭）+ Vue 3 Composition API + Nitro。支持导出 HTML/JSON/Excel/TXT/Markdown/DOCX，其中 HTML 导出会尽量还原公众号文章样式。

## 常用命令

```bash
# 依赖安装（Node >= 22，Yarn 1.22.22）
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn

# 开发
yarn dev            # 启动 Nuxt 开发环境
yarn debug          # 启动 Nuxt 并开启 inspect

# 构建与预览
yarn build          # 生产构建（Nitro 输出到 .output）
yarn preview        # Cloudflare Pages 预览链路（会先 build，再 wrangler pages dev）

# 代码格式化
yarn format         # biome check --write（本仓库不启用 Biome lint）

# Docker
yarn docker:build
yarn docker:publish
```

## 测试现状

- 仓库中有 `test/*.ts` 脚本（基于 `samples/` 数据做 HTML 解析/渲染验证），但 `package.json` **没有** `test` script。
- 当前仓库未安装 `@nuxt/test-utils`，因此 `yarn nuxi test` 在默认状态下不可直接运行。
- 若补齐测试依赖后，可用 Nuxt 官方命令执行：

```bash
yarn nuxi test                              # 运行全部测试
yarn nuxi test test/validate_html_content.ts  # 运行单个测试文件
```

## 高层架构

### 1) 前后端职责划分

- **客户端（Nuxt SPA）**：页面与交互全部在浏览器运行（`ssr: false`）。
- **服务端（Nitro API）**：`server/api/**` 提供代理接口，转发微信公众号平台请求、管理登录态与 cookie。
- `pages/index.vue` 会直接跳转到 `/dashboard/account`，主界面容器在 `pages/dashboard.vue`。

关键文件：
- `nuxt.config.ts`
- `app.vue`
- `pages/index.vue`
- `pages/dashboard.vue`

### 2) 客户端主数据流（抓取 → 缓存 → 导出）

1. 页面层通过 `apis/index.ts` 调用 `/api/web/mp/*` 代理端点。
2. 抓取到的账号/文章数据写入 Dexie（`store/v2/*`，数据库定义在 `store/v2/db.ts`）。
3. 下载流程由 `composables/useDownloader.ts` 驱动 `utils/download/Downloader.ts`：
   - 支持 `html` / `metadata` / `comments` / `fakeid` 任务
   - 通过事件上报进度与状态
4. 导出流程由 `composables/useExporter.ts` 驱动 `utils/download/Exporter.ts`，按目标格式打包导出。
5. 合集批量下载场景使用 `composables/useBatchDownload.ts`，下载 HTML 后用 JSZip 打包。

关键文件：
- `apis/index.ts`
- `store/v2/db.ts`
- `composables/useDownloader.ts`
- `composables/useExporter.ts`
- `composables/useBatchDownload.ts`
- `utils/download/Downloader.ts`
- `utils/download/Exporter.ts`
- `utils/download/BaseDownloader.ts`
- `utils/download/ProxyManager.ts`

### 3) 服务端代理与登录态

- 多数公众号相关接口在 `server/api/web/mp/*.ts`，底层统一走 `server/utils/proxy-request.ts`。
- 登录流程在 `server/api/web/login/*`：
  - 登录成功后生成 `auth-key`，并将微信返回的 cookie + token 存入 `CookieStore`（内存 + Nitro KV）。
- 业务请求通过 `X-Auth-Key` 或 `auth-key` cookie 取回用户对应的微信 cookie/token，再转发到微信接口。
- 调试端点 `server/api/_debug.get.ts` 受 `DEBUG_KEY` 控制。

关键文件：
- `server/utils/proxy-request.ts`
- `server/utils/CookieStore.ts`
- `server/kv/cookie.ts`
- `server/api/web/login/bizlogin.post.ts`
- `server/api/web/mp/appmsgpublish.get.ts`
- `server/api/_debug.get.ts`

### 4) 公共 API 与安全约束

- `server/api/public/v1/*`、`server/api/public/beta/*` 暴露无需后台登录的公共接口（如按链接下载）。
- URL 抓取相关接口包含白名单/校验逻辑（例如 `accountname.get.ts` 限制 host 与协议，并禁止重定向）以降低 SSRF 风险。

关键文件：
- `server/api/public/v1/download.get.ts`
- `server/api/web/misc/accountname.get.ts`

## 关键目录（只列高价值入口）

- `pages/dashboard/**`：主工作台页面（账号、文章、合集、设置、代理等）。
- `apis/`：客户端 API 封装（统一请求公众号代理/公共接口）。
- `composables/`：下载、导出、登录检查、偏好设置等流程编排。
- `store/v2/`：Dexie 数据层（文章、评论、元数据、HTML、资源、账号信息）。
- `utils/download/`：下载/导出核心实现。
- `server/api/`：Nitro 服务端接口（web 代理 + public API）。
- `shared/utils/`：前后端共享的 HTML 解析、渲染、请求工具函数。

## 配置与约定

- `biome.json`：
  - formatter 启用，linter 关闭；
  - JS/TS 2 空格、单引号、分号、行宽 120；
  - CSS 4 空格；Vue 的 `script/style` 不额外缩进。
- `nuxt.config.ts`：
  - `ssr: false`；
  - 启用 `@vueuse/nuxt`、`@nuxt/ui`、`nuxt-monaco-editor`、`@sentry/nuxt/module`、`nuxt-umami`；
  - `runtimeConfig.public.aggridLicense` 注入 AG Grid license；
  - Nitro KV 由 `NITRO_KV_DRIVER` / `NITRO_KV_BASE` 控制。
- 环境变量示例在 `.env.example`，常用项：
  - `NUXT_AGGRID_LICENSE`
  - `NITRO_KV_DRIVER`
  - `NITRO_KV_BASE`
  - `NUXT_DEBUG_MP_REQUEST`
  - `DEBUG_KEY`
