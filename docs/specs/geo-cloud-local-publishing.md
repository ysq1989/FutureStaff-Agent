# GEO 云端数据与本机发布账号

用户于 2026-10-10 明确“云端GEO数据，发布账号本地化”。此决定替代 geo-local-desktop-migration.md 中将品牌/文章/计划写入本地数据库的默认产品路线；保留既有源码、测试与用户数据，不自动迁移、上传或删除。

## 当前成果

GEO 入口按当前 Platform 主体的应用授权和固定 HTTPS origin 选择云端 URL；不复制 Cookie，不添加主体/token 参数。默认 Host 对旧本地业务路由返回 GEO_CLOUD_WORKSPACE_REQUIRED，不开启本地业务数据库。云端继续验证自己的主机会话。

发布组件通过 `@futurestaff/fs-geo/publisher` 导出，受独立 SHA-256 文件清单固定：LocalPublicationRunner、FilePublicationJournal、本机 ToutiaoAccountProfiles。每次打开账号由 Host 的可信授权回调校验环境/主体/成员与 GEO 操作权限；每个账号使用独立目录。普通可见 Chrome/Edge 登录窗口没有调试端口，不导出 Cookie，不替用户确认网站协议。启动窗口不能视为已登录或已核验发布。

本地执行组件须消费云端租约和文章快照，发布前复核权限及内容哈希，先持久化占用标记再调用已核验驱动。断网/中断不重发；只重传已保存结果。没有驱动或出现未知结果时失败关闭。

## 尚未连接

已在源码实现系统浏览器的 Platform PKCE 登录交接和专用回环账号连接，云端可点击“在本机登录头条”。此连接不是完整嵌入浏览器控制，不接受任意脚本或 HTTP 请求。尚未发布到已安装客户端；真实本地网络权限提示、头条账号身份、编辑器驱动和试发未验收，生产自动发布保持关闭。三方验证详见 GEO 仓 docs/GEO_AGENT_ENTRY_VALIDATION.md。

不得从 Host 导出业务 Cookie/JWT 来补桥；需要版本化受控动作、精确来源与云端请求授权。头条账号不得进入模型上下文。真实试发须先确认具体账号、文章和动作。

## 验证与边界

命令：`npm run typecheck -w @futurestaff/fs-geo`、`npm test -w @futurestaff/fs-geo`、`node plugins/fs-geo/scripts/browser-smoke.mjs` 均通过；插件 11 项测试通过。浏览器检查使用隔离临时目录和模拟应用授权，实际云端打开操作被捕获，不访问真实账号；保留旧数据、单标签、窄窗口和注销撤销已验证。没有运行整个客户端/桌面底座的发布门禁，不宣称安装包可发行。

GEO 服务端实现及 SDK 权威来源为 `D:\项目\FutureStaff GEO`，规格 docs/specs/GEO_LOCAL_PUBLISHING.md。同步命令 `node plugins/fs-geo/scripts/sync-publishing-source.mjs "D:/项目/FutureStaff GEO"`，拒绝覆盖独立修改的 SDK 文件，不改原有 source-manifest.json。

未修改官方 Harness、桌面底座、其他系统插件或已有品牌修改。本次没有提交、推送、部署、升级已安装应用、迁移真实数据或真实发文。
