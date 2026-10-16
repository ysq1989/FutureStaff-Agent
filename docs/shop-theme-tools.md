# 桌面商城主题工具

2026-10-15 图文选品推荐：需求明确后，`shop_query`（或商品列表 `shop_call`）返回
当前会话拥有的 `viewId`；模型再用 `shop_recommend_products(viewId, items)` 传入
1–6 个真实商品编号及推荐理由。Host 复查权限及原列表，不接受模型提供图片、价格
或库存；卡片显示真实商品图片、价格、库存、来源和理由，支持看大图及点选。
原生 `select` 只记录当前推荐中的本店商品，回传原 Agent 会话，无需导入。
选择回传插件不能构成导入授权，导入 guard 仍只读取真实用户明确指令。
图片只显示公共 HTTPS（相对路径按当前商城源解析），缺图和失败有明确占位；
不代理任意资源、不扩展跨系统权限。当前卡片来源为本店商品，不冒充选品中心。
本机安装与验收记录见 `tasks/shop-recommendation-cards.md`。

2026-10-15 SHOP 选品流程修复：客户端在 SHOP 会话的每次模型请求中要求先补齐
品类/用途、客群、价位、渠道和来源，再按真实授权数据推荐；已知或明确不限的项目
不重复询问。本店商品与选品中心货源必须标明来源，缺少货源读取能力时直接说明，
不能用导入操作代替查询。推荐、选择、明确要求导入、业务窗口确认执行是不同阶段。
`shop_call` 的选品中心导入操作在 Host 检查具体 `body.sourceProductId` 与 `product`
资料，并从该运行会话的真实用户消息核对明确导入指令和所选商品；分页、模型的确认
标记、插件消息或引用文字不能放行。换款、取消、询问是否可以导入均不能沿用旧指令。
序号或“这款”无法确定对象时先核对编号/名称；默认草稿，上架必须另有明确要求。
商城仍负责真实权限、字段校验、幂等与审计。测试与本机安装记录见
`tasks/shop-selection-workflow.md`。

2026-10-13 隔离修复：SHOP 助手范围由 Platform autonomy_policy.business_systems=['shop'] 管理，快照 businessSystems 参与版本。桌面模型请求和实际执行同时核对，ERP grant及原生服务另行校验；助手名称/提示词不授权。shop_tools/shop_query 复用本店 MCP shop_products_list，以 is_show=1 查询并使用 total 回答上架数量。真实复验42个；跨域 ERP 请求拒绝，ERP自身查询、主题8和图片模型保留。详情见独立商城仓库 docs/operations/shop-agent-business-isolation-20261013.md。

桌面通过现有登录和原生系统 SSO 调用商城 DSH/MCP，不使用手动 Token 配置。当前会话仍绑定 Platform 管理的持久智能体；服务端最终决定主题和生图权限。

先调用 `shop_theme_tools`，使用返回的真实 inputSchema；再通过 `shop_theme_call` 执行主题工具。调用的字段仅为 `name` 和 `arguments`。写入 `requestId` 应使用唯一 UUID，位于 arguments 内，与 draftId/plan 并列。

修改示例：

```json
{
  "name": "shop_theme_plan_update",
  "arguments": {
    "draftId": "从draft_create或draft_get读取",
    "expectedRevision": 1,
    "requestId": "生成一个新的UUID",
    "plan": {"title": "玉色东方", "categoryLayout": 3}
  }
}
```

plan 没有 theme 包装层。原生组件字段、图片槽位和分类必须读取实际数据；会员中心使用 member。预览创建未启用副本；启用必须明确 activate:true，并提供当前活动主题 revision。回退使用同一次应用返回的 rollbackRef 和 activeRevision。超时先查询原 requestId，禁止猜测并重复写入。

生图工具独立消费当前智能体已有配置：`agent_image_tools` 查询授权和就绪状态，`agent_image_generate` 单次生成，`agent_image_status` 查询原任务。工具不接收供应商 Key、Agent ID、Tenant ID 或任意下载 URL。Host 从真实 SessionStore 绑定取得 Agent 和身份，读取生成结果并由 `shop_theme_asset_from_image` 压缩上传到商城，返回 assetRef 后再绑定槽位。

API 采用既有 `/desktop/v1/agents/{agentId}` 认证边界，新增 image-tools、image-requests、任务状态和 content 路由；调用现有原生 Agent 生图执行器。图片/意图按成员和智能体隔离，不增加数据库结构。

生图同时支持当前主体模型池已启用的图片模型，selector 为 `image_model:<UUID>`，只作为 agent_image_generate 的 tool 参数；不能将它作为独立工具调用。沿用现有登录和加密模型凭据。Agnes 文生图使用 return_base64:true，避免图生图空 image 参数。后续上传优先使用 generate 返回的确切 requestId；contentPath 是认证 API 地址，不是可由模型读取的本地文件。

unknown 表示结果未确认，不能当作异步处理中持续轮询或换编号重新生成。没有可用图像工具时报告实际缺失，不索取 Token、借用其他系统凭据或伪造生成完成。

2026-10-13 专属 SHOP 系统助手真实测试完成：草稿创建/修改，Agnes 生图、压缩上传、三槽绑定、validate、preview29、apply30、rollback8。21 张装饰资源160937bytes，三张新横幅76867bytes。模型曾混用编号并多生成两张，五次成功调用引擎 quota 均0；长对话触发限制，拆为两个对话完成。属于经过纠正的功能验收，未声称无人干预稳定运行。账号权限仍由服务端决定。详见商城仓库 docs/operations/agent-desktop-theme-20261013.md。
