# 微信公众号获取能力技术文档

## 1. 目标与范围

本项目的“获取微信公众号”能力包括三层：

1. **发现公众号**：通过微信公众平台后台搜索能力获取公众号列表。
2. **同步公众号文章**：按公众号分页拉取文章清单并落到本地缓存。
3. **补充增强数据**：基于 Credentials 抓取阅读量/点赞/留言等扩展信息。

> 关键点：并不是直接爬公众号主页，而是复用微信公众平台已有接口能力。

## 2. 总体架构

### 2.1 分层

- **前端（Nuxt SPA）**：发起搜索、同步、导出操作。
- **服务端（Nitro API）**：代理微信请求、维护登录态、管理 cookie/token。
- **本地存储（Dexie/IndexedDB）**：缓存公众号、文章、HTML、元数据、评论等。

关键实现位置：

- `components/modal/Login.vue:31`
- `apis/index.ts:79`
- `server/api/web/mp/searchbiz.get.ts:14`
- `server/api/web/mp/appmsgpublish.get.ts:15`
- `server/utils/proxy-request.ts:14`
- `store/v2/db.ts:13`

## 3. 核心时序

### 3.1 登录建会话（拿到 auth-key -> token/cookie）

1. 前端创建登录会话（`/api/web/login/session/[sid]`）。
2. 服务端代理 `bizlogin?action=startlogin`，透传微信返回的 `uuid` cookie。
3. 前端拉取二维码并轮询扫码状态（`getqrcode` + `scan`）。
4. 前端发起 `bizlogin`。
5. 服务端从微信响应提取 `redirect_url` 里的 `token`，将 token + set-cookie 写入 `CookieStore`（内存 + KV），并回写 `auth-key` cookie 给浏览器。

关键实现：

- `components/modal/Login.vue:31`
- `server/api/web/login/session/[sid].post.ts:17`
- `server/api/web/login/getqrcode.get.ts:7`
- `server/api/web/login/scan.get.ts:7`
- `server/api/web/login/bizlogin.post.ts:22`
- `server/utils/proxy-request.ts:72`
- `server/utils/CookieStore.ts:118`

### 3.2 获取公众号列表（搜索）

1. 搜索弹窗调用 `getAccountList(begin, keyword)`。
2. 客户端请求 `/api/web/mp/searchbiz`。
3. 服务端根据 `auth-key` 取 token。
4. 服务端代理微信接口 `https://mp.weixin.qq.com/cgi-bin/searchbiz`（`action=search_biz`）。
5. 返回 `list` 给前端展示。

关键实现：

- `components/global/SearchAccountDialog.vue:89`
- `apis/index.ts:79`
- `server/api/web/mp/searchbiz.get.ts:15`
- `server/api/web/mp/searchbiz.get.ts:39`

### 3.3 同步公众号文章

1. 选择公众号后调用 `getArticleList(account, begin)`。
2. 服务端代理 `https://mp.weixin.qq.com/cgi-bin/appmsgpublish`。
3. 客户端解析 `publish_page`，写入 `article` 表，并更新 `info` 统计。
4. 根据同步策略循环分页直到完成或取消。

关键实现：

- `pages/dashboard/account.vue:97`
- `apis/index.ts:27`
- `server/api/web/mp/appmsgpublish.get.ts:45`
- `store/v2/article.ts:12`
- `store/v2/info.ts:27`

### 3.4 Credentials 增强数据（阅读量/留言）

项目支持两种 Credentials 来源：

- `wxdown-service` WebSocket 监听（默认 `ws://127.0.0.1:65001`）
- `mitmproxy` 插件（默认 API `http://127.0.0.1:8088`）

抓取后本地保存字段：`biz(__biz) / uin / key / pass_ticket / wap_sid2`，并带有效期判断。

下载阅读量/留言时：

- 必须匹配目标公众号 `fakeid` 的有效 credential。
- 下载器自动将并发上限压到 2，降低风控风险。
- 留言接口会使用 `__biz/uin/key/pass_ticket` 组合请求微信接口。

关键实现：

- `components/global/CredentialsDialog.vue:180`
- `components/global/CredentialsDialog.vue:361`
- `config/index.ts:35`
- `utils/download/Downloader.ts:42`
- `utils/download/BaseDownloader.ts:190`
- `utils/download/Downloader.ts:472`

## 4. 关键接口清单

### 4.1 Web 代理接口（需登录态）

- `GET /api/web/mp/searchbiz`：搜索公众号
- `GET /api/web/mp/appmsgpublish`：获取公众号文章列表
- `GET /api/web/mp/profile_ext_getmsg`：基于 credential 获取文章流
- `POST /api/web/login/session/[sid]`：创建扫码登录会话
- `GET /api/web/login/getqrcode`：获取二维码
- `GET /api/web/login/scan`：轮询扫码状态
- `POST /api/web/login/bizlogin`：完成登录

### 4.2 辅助接口

- `GET /api/web/misc/accountname`：从文章 URL 解析公众号名（带白名单/协议限制）
- `GET /api/web/mp/searchbyurl`：先解析名称再搜索公众号

关键实现：

- `server/api/web/misc/accountname.get.ts:9`
- `server/api/web/mp/searchbyurl.get.ts:20`

## 5. 数据流与存储

### 5.1 Dexie 数据库

数据库：`exporter.wxdown.online`。主要表：

- `info`：公众号维度数据（昵称、头像、统计、同步时间）
- `article`：文章清单（主键 `fakeid:aid`）
- `html`：文章 HTML 缓存
- `metadata`：阅读/点赞/分享等
- `comment` / `comment_reply`：留言及回复
- `resource` / `resource-map`：导出资源映射

关键实现：

- `store/v2/db.ts:13`
- `store/v2/article.ts:29`
- `store/v2/info.ts:42`

### 5.2 前端本地凭据

- `localStorage['auto-detect-credentials:credentials']`：credential 列表
- 每项按 `timestamp + CREDENTIAL_LIVE_MINUTES` 判定有效性

关键实现：

- `components/global/CredentialsDialog.vue:180`
- `components/global/CredentialsDialog.vue:388`
- `config/index.ts:35`

## 6. 依赖凭据说明

### 6.1 登录态凭据（必需）

- `auth-key`（浏览器 cookie） -> 服务端映射为微信 token + cookie
- 用于公众号搜索、文章列表拉取

相关代码：

- `server/utils/proxy-request.ts:96`
- `server/utils/CookieStore.ts:227`

### 6.2 业务凭据 Credentials（增强能力）

用于阅读量/留言等接口，核心字段：

- `__biz`（即 fakeid）
- `uin`
- `key`
- `pass_ticket`
- `wap_sid2`

缺失或过期会报：`目标公众号的 Credential 未设置`。

相关代码：

- `utils/download/BaseDownloader.ts:190`
- `utils/download/Downloader.ts:467`

## 7. 限制与注意事项

1. **登录态失效**：微信返回 `ret=200003` 时前端会判定 `session expired`。
   - `apis/index.ts:66`, `apis/index.ts:94`
2. **Credentials 时效短**：默认 25 分钟。
   - `config/index.ts:35`
3. **并发受控**：metadata/comments 自动限制并发为 2。
   - `utils/download/Downloader.ts:42`
4. **接口风控与代理质量影响成功率**：失败会退避重试，代理会进入冷却。
   - `utils/download/BaseDownloader.ts:131`
5. **URL 解析安全约束**：仅允许 `https://mp.weixin.qq.com` / `https://weixin.qq.com`，并禁止重定向。
   - `server/api/web/misc/accountname.get.ts:9`

## 8. 排障建议

### 8.1 `未登录或登录已过期，请重新扫码登录`

- 检查是否完成扫码登录流程；重新打开登录弹窗。
- 检查请求是否带 `auth-key`。
- 相关：`server/api/web/mp/searchbiz.get.ts:16`

### 8.2 `session expired`

- 微信 token 失效，重新扫码登录。
- 相关：`apis/index.ts:67`

### 8.3 `目标公众号的 Credential 未设置`

- 先在“抓取 Credentials”中抓到对应公众号的有效 credential；
- 确保 `credential.biz === article.fakeid` 且 `valid=true`。
- 相关：`utils/download/BaseDownloader.ts:191`

### 8.4 `mitmdump: command not found`

- 本机未安装 mitmproxy；安装后再启动 `mitmdump -s credential.py -q`。
- 插件路径：`public/plugins/credential.py`

### 8.5 能搜索到账号但文章同步异常

- 检查代理配置与网络质量（私有代理/公共代理）。
- 检查目标账号是否可访问、是否触发风控。
- 查看 debug 缓存记录定位失败 HTML。
- 相关：`utils/download/Downloader.ts:209`

## 9. 一句话总结

该能力本质是：**用微信后台登录态（auth-key -> token/cookie）调用微信官方后台检索接口获取公众号与文章，再用本地 Credentials 补充抓取阅读量/留言等增强数据，并落库到 Dexie 供后续导出。**
