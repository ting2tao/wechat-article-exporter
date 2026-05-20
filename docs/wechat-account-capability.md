# 微信公众号获取能力技术文档

## 1. 目标与范围

本项目当前聚焦三件事：

1. 发现公众号
2. 同步公众号文章列表
3. 下载文章 HTML 并导出为多种格式

项目不再包含基于抓包 Credential 的阅读量、点赞、转发量、留言增强链路。

## 2. 总体架构

### 2.1 前端

- Nuxt 3 SPA，负责登录、搜索、同步、下载、导出和设置界面
- 本地 Dexie 用于缓存公众号、文章、HTML、资源映射等数据

### 2.2 服务端

- Nitro API 负责代理微信公众平台请求
- 服务端维护登录态 `auth-key -> token/cookie`
- 同一进程内集成 SQLite 调度器，支持后台定时同步与 HTML 下载

### 2.3 持久化

- 浏览器侧缓存：Dexie
- 服务端任务：SQLite
- 服务端下载文件：`.data/worker-html`

## 3. 核心流程

### 3.1 登录建会话

1. 前端创建登录会话
2. 服务端代理微信登录接口
3. 用户扫码确认
4. 服务端保存微信 token 与 cookie
5. 浏览器获得 `auth-key`

关键实现：

- `components/modal/Login.vue`
- `server/api/web/login/bizlogin.post.ts`
- `server/utils/proxy-request.ts`
- `server/utils/CookieStore.ts`

### 3.2 搜索公众号

1. 前端调用 `getAccountList`
2. 服务端代理 `searchbiz`
3. 返回公众号列表给页面选择

关键实现：

- `components/global/SearchAccountDialog.vue`
- `apis/index.ts`
- `server/api/web/mp/searchbiz.get.ts`

### 3.3 同步公众号文章

1. 前端或服务端调度器按公众号调用 `appmsgpublish`
2. 客户端把文章列表落到 Dexie
3. 服务端调度器把托管账号与执行记录写入 SQLite

关键实现：

- `pages/dashboard/account.vue`
- `server/api/web/mp/appmsgpublish.get.ts`
- `store/v2/article.ts`
- `server/services/worker/repository.ts`
- `server/services/worker/scheduler.ts`

### 3.4 下载与导出

1. 下载器抓取文章 HTML
2. HTML、资源映射和资源文件落本地缓存
3. 导出器输出 `html/json/excel/txt/markdown/docx`

关键实现：

- `composables/useDownloader.ts`
- `utils/download/Downloader.ts`
- `utils/download/Exporter.ts`
- `utils/exporter.ts`

## 4. 关键接口

### 4.1 登录与公众号能力

- `POST /api/web/login/session/[sid]`
- `GET /api/web/login/getqrcode`
- `GET /api/web/login/scan`
- `POST /api/web/login/bizlogin`
- `GET /api/web/mp/searchbiz`
- `GET /api/web/mp/appmsgpublish`

### 4.2 辅助接口

- `GET /api/web/misc/accountname`
- `GET /api/web/mp/searchbyurl`

## 5. 数据存储

### 5.1 浏览器侧 Dexie

主要表：

- `info`
- `article`
- `html`
- `resource`
- `resource-map`
- `debug`

### 5.2 服务端 SQLite

主要存储：

- 调度配置
- 托管公众号
- 任务执行记录
- 服务端下载索引

## 6. 部署说明

当前部署只需要主应用一个容器即可，页面、API、服务端调度器都在同一个 Nitro 进程里运行。

推荐挂载整个 `.data` 目录：

```bash
docker run -d \
  --name wx-exporter \
  -p 3000:3000 \
  -e NITRO_KV_DRIVER=fs \
  -e NITRO_KV_BASE=.data/kv \
  -e WORKER_SQLITE_PATH=.data/worker-scheduler.db \
  -e WORKER_HTML_DIR=.data/worker-html \
  -v /root/wechat-data:/app/.data \
  --restart=always \
  ghcr.io/ting2tao/wx-exporter:latest
```

## 7. 排障建议

### 7.1 `未登录或登录已过期，请重新扫码登录`

- 重新完成扫码登录
- 检查请求是否带 `auth-key`

### 7.2 文章同步异常

- 检查当前登录态是否有效
- 检查代理配置与网络质量
- 查看 debug 缓存定位失败 HTML

### 7.3 服务端定时任务未执行

- 检查应用是否正常启动
- 检查 `.data` 目录是否可写
- 检查 SQLite 文件与 HTML 目录是否已创建

## 8. 一句话总结

本项目当前的核心能力是：使用微信公众平台后台登录态搜索公众号、同步文章列表、下载文章 HTML，并在前端与服务端两侧分别完成缓存、导出和定时任务调度。
