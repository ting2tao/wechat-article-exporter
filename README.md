<p align="center">
  <img src="./assets/logo.svg" alt="wx-exporter logo" width="120">
</p>

# wx-exporter

一款面向微信公众号后台场景的文章批量下载与导出工具。

项目基于 Nuxt 3 SPA + Vue 3 + Nitro，支持扫码登录公众号后台后搜索账号、同步文章、下载 HTML，并导出为 HTML、JSON、Excel、TXT、Markdown、DOCX 等格式。其中 HTML 导出会尽量还原公众号原始样式、图片和排版。

## 功能特性

- 支持公众号搜索与文章批量同步
- 支持文章筛选，包含标题、作者、时间、原创标记、合集等条件
- 支持导出 `html`、`json`、`excel`、`txt`、`md`、`docx`
- 支持合集批量下载与 ZIP 打包
- 支持图片分享、视频分享等多种文章类型
- 使用 Dexie 在浏览器侧缓存数据，减少重复请求
- 提供 Nitro 代理接口与公共 API
- 支持本地开发、Docker 私有化部署、Cloudflare Pages 预览链路

## 工作原理

微信公众号后台在写文章时，支持搜索其他公众号并引用文章。本项目基于这一能力，在用户自己的登录态下搜索公众号、拉取文章列表、下载文章内容，再在本地浏览器缓存和导出。

项目不会把某个用户的登录态用于其他人的抓取任务，也不提供公共账号池。

## 技术架构

### 前端

- Nuxt 3 SPA，`ssr: false`
- Vue 3 Composition API
- AG Grid 负责账号与文章表格
- Dexie 负责本地缓存和离线数据管理

### 服务端

- Nitro API 代理微信公众号相关请求
- 使用 `auth-key` + `CookieStore` 管理登录态
- 通过 Nitro storage/KV 持久化 cookie 和 token

### 核心数据流

1. 前端调用 `/api/web/mp/*` 代理接口
2. 抓取到的账号与文章数据写入 Dexie
3. 下载流程由 `useDownloader` / `Downloader` 驱动
4. 导出流程由 `useExporter` / `Exporter` 统一处理

## 快速开始

### 环境要求

- Node.js `>= 22`
- Yarn `1.22.22`

### 安装依赖

```bash
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn
```

### 本地开发

```bash
yarn dev
```

首次进入系统时，默认账号密码为 `admin / 121212`。登录后可在「设置」页修改为自己的账号和密码。

如果需要调试 Nuxt 服务端：

```bash
yarn debug
```

### 构建与预览

```bash
yarn build
yarn preview
```

`yarn preview` 会先执行构建，再走 Cloudflare Pages 预览链路。

## 环境变量

可参考 [`.env.example`](./.env.example)：

```bash
# 调试微信代理请求（仅 development）
NUXT_DEBUG_MP_REQUEST=false

# AG Grid 企业版授权
NUXT_AGGRID_LICENSE=

# Nitro KV（本地 / Docker）
NITRO_KV_DRIVER=fs
NITRO_KV_BASE=.data/kv

# Nitro KV（Cloudflare）
# NITRO_KV_DRIVER=cloudflare-kv-binding

DEBUG_KEY=
```

另外，Sentry / Umami 等可观测性配置在 `nuxt.config.ts` 中按需启用。

## 代码结构

```text
apis/                 客户端 API 封装
components/           页面组件与业务组件
composables/          下载、导出、登录检查等流程编排
pages/dashboard/      主工作台页面
server/api/           Nitro 服务端接口
server/utils/         代理请求、CookieStore 等服务端工具
shared/utils/         前后端共享工具
store/v2/             Dexie 数据层
utils/download/       下载与导出核心实现
```

## 常用命令

```bash
yarn dev
yarn debug
yarn build
yarn preview
yarn format
yarn docker:build
yarn docker:publish
```

说明：

- `yarn format` 使用 Biome 进行格式化
- 当前仓库没有内置 `yarn test` script
- `test/*.ts` 中存在基于 `samples/` 的验证脚本，但默认测试依赖尚未补齐

## Docker 部署

项目提供了开箱即用的 [Dockerfile](./Dockerfile)，可直接构建镜像：

```bash
yarn docker:build
```

容器默认使用 Node 22，并将 Nitro 构建产物输出到 `.output` 后运行。

## 公共 API

仓库提供了一组无需后台登录的公共接口，位于：

- `server/api/public/v1/*`
- `server/api/public/beta/*`

典型能力包括：

- 按文章链接下载
- 查询公众号信息
- 获取公开接口返回数据

## 许可

MIT

## 使用声明

本程序承诺不会利用用户扫码登录的公众号账号进行任何形式的公共爬取，也不存在账号池。

用户的登录态仅用于该用户自己的公众号检索、文章同步和导出流程。

通过本程序获取的公众号文章内容，版权归原作者所有，请在合法、合规、合理的范围内使用。如涉及侵权，请联系处理。
